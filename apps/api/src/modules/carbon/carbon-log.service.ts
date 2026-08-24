import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CarbonLog as SharedCarbonLog,
  CarbonLogPage,
  CarbonLogSummary,
  JourneySection,
  ModeBreakdownEntry,
  MonthlyCarbonBreakdown,
  TransportMode,
} from '@urbanflow/shared-types';
import { And, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { CarbonEstimatorService } from './carbon-estimator.service';
import { ConfirmTripDto } from './dto/confirm-trip.dto';
import { CarbonLog } from './entities/carbon-log.entity';
import { MonthlyReport } from './types/monthly-report.interface';

const ROLLING_WINDOW_MONTHS = 12;

interface MonthlyAggregateRow {
  month: string;
  co2Grams: string;
  savedGrams: string;
  tripCount: string;
}

function toSharedCarbonLog(entity: CarbonLog): SharedCarbonLog {
  return {
    id: entity.id,
    loggedAt: entity.loggedAt.toISOString(),
    co2Grams: entity.co2Grams,
    distanceMeters: entity.distanceMeters,
    referenceCo2Grams: entity.referenceCo2Grams,
    savedGrams: entity.savedGrams,
    modeBreakdown: entity.modeBreakdown,
    createdAt: entity.createdAt.toISOString(),
  };
}

/**
 * Service Carbon Log (F4 §6-7) — confirmation d'un trajet et agrégats du
 * tableau de bord. Le CO₂ est **toujours** recalculé ici via
 * `CarbonEstimatorService` (jamais de valeur client, §6) ; une fois persisté,
 * un `carbon_log` n'est plus jamais recalculé, même si les facteurs changent
 * ensuite (historisation figée, §5).
 */
@Injectable()
export class CarbonLogService {
  constructor(
    @InjectRepository(CarbonLog)
    private readonly carbonLogRepository: Repository<CarbonLog>,
    private readonly carbonEstimator: CarbonEstimatorService,
  ) {}

  async confirmTrip(
    tenantId: string,
    userId: string,
    dto: ConfirmTripDto,
  ): Promise<SharedCarbonLog> {
    const modeBreakdown = this.computeModeBreakdown(dto.sections);
    const co2Grams = modeBreakdown.reduce(
      (total, entry) => total + entry.co2Grams,
      0,
    );
    const distanceMeters = modeBreakdown.reduce(
      (total, entry) => total + entry.distanceMeters,
      0,
    );
    const referenceCo2Grams = this.carbonEstimator.estimateGrams([
      this.toEstimatorSection(TransportMode.CarSolo, distanceMeters),
    ]);

    const entity = this.carbonLogRepository.create({
      tenantId,
      userId,
      loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : new Date(),
      co2Grams,
      distanceMeters,
      referenceCo2Grams,
      savedGrams: referenceCo2Grams - co2Grams,
      modeBreakdown,
    });

    const saved = await this.carbonLogRepository.save(entity);
    return toSharedCarbonLog(saved);
  }

  async listForUser(
    tenantId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<CarbonLogPage> {
    const since = this.rollingWindowStart();

    const [rows, total] = await this.carbonLogRepository.findAndCount({
      where: { tenantId, userId, loggedAt: MoreThanOrEqual(since) },
      order: { loggedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map(toSharedCarbonLog),
      total,
      page,
      limit,
    };
  }

  async getSummary(
    tenantId: string,
    userId: string,
  ): Promise<CarbonLogSummary> {
    const since = this.rollingWindowStart();

    const rows = await this.carbonLogRepository
      .createQueryBuilder('log')
      .select("to_char(date_trunc('month', log.loggedAt), 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(log.co2Grams), 0)', 'co2Grams')
      .addSelect('COALESCE(SUM(log.savedGrams), 0)', 'savedGrams')
      .addSelect('COUNT(*)', 'tripCount')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.userId = :userId', { userId })
      .andWhere('log.loggedAt >= :since', { since })
      .groupBy("date_trunc('month', log.loggedAt)")
      .orderBy("date_trunc('month', log.loggedAt)", 'ASC')
      .getRawMany<MonthlyAggregateRow>();

    const monthly: MonthlyCarbonBreakdown[] = rows.map((row) => ({
      month: row.month,
      co2Grams: Number(row.co2Grams),
      savedGrams: Number(row.savedGrams),
      tripCount: Number(row.tripCount),
    }));

    return {
      totalCo2Grams: monthly.reduce(
        (total, entry) => total + entry.co2Grams,
        0,
      ),
      totalSavedGrams: monthly.reduce(
        (total, entry) => total + entry.savedGrams,
        0,
      ),
      monthly,
    };
  }

  async deleteAllForUser(tenantId: string, userId: string): Promise<void> {
    await this.carbonLogRepository.delete({ tenantId, userId });
  }

  /** Agrégats d'un mois donné (`YYYY-MM`) pour le bilan PDF (F4 §8). */
  async getMonthlyReport(
    tenantId: string,
    userId: string,
    month: string,
  ): Promise<MonthlyReport> {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const rows = await this.carbonLogRepository.find({
      where: {
        tenantId,
        userId,
        loggedAt: And(MoreThanOrEqual(start), LessThan(end)),
      },
    });

    const modeBreakdown = new Map<TransportMode, ModeBreakdownEntry>();
    for (const row of rows) {
      for (const entry of row.modeBreakdown) {
        const existing = modeBreakdown.get(entry.mode);
        modeBreakdown.set(entry.mode, {
          mode: entry.mode,
          distanceMeters:
            (existing?.distanceMeters ?? 0) + entry.distanceMeters,
          co2Grams: (existing?.co2Grams ?? 0) + entry.co2Grams,
        });
      }
    }

    return {
      month,
      co2Grams: rows.reduce((total, row) => total + row.co2Grams, 0),
      savedGrams: rows.reduce((total, row) => total + row.savedGrams, 0),
      tripCount: rows.length,
      modeBreakdown: [...modeBreakdown.values()],
    };
  }

  private computeModeBreakdown(
    sections: ConfirmTripDto['sections'],
  ): ModeBreakdownEntry[] {
    const distanceByMode = new Map<TransportMode, number>();
    for (const section of sections) {
      distanceByMode.set(
        section.mode,
        (distanceByMode.get(section.mode) ?? 0) + section.distanceMeters,
      );
    }

    return [...distanceByMode.entries()].map(([mode, distanceMeters]) => ({
      mode,
      distanceMeters,
      co2Grams: this.carbonEstimator.estimateGrams([
        this.toEstimatorSection(mode, distanceMeters),
      ]),
    }));
  }

  private toEstimatorSection(
    mode: TransportMode,
    distanceMeters: number,
  ): JourneySection {
    // `durationSeconds` n'entre pas dans le calcul carbone (§4.7.3 : seule la
    // distance compte) — 0 est une valeur neutre pour satisfaire le type
    // `JourneySection` sans toucher à `CarbonEstimatorService`.
    return { mode, distanceMeters, durationSeconds: 0 };
  }

  private rollingWindowStart(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - ROLLING_WINDOW_MONTHS);
    return date;
  }
}
