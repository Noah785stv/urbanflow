import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransportMode } from '@urbanflow/shared-types';
import { Repository } from 'typeorm';
import { DEFAULT_TENANT_ID } from '../../common/constants/tenant.constants';
import { EmissionFactor } from './entities/emission-factor.entity';
import {
  DEFAULT_EMISSION_FACTORS,
  EmissionFactorTable,
} from './emission-factors.constants';

/**
 * Lit les facteurs d'émission versionnés (F4 §5) — source branchée sur le
 * token `EMISSION_FACTORS` au démarrage de l'application (voir `CarbonModule`).
 * Repli **par mode** sur `DEFAULT_EMISSION_FACTORS` : une base vide ou
 * partiellement seedée ne bloque jamais le calcul carbone.
 */
@Injectable()
export class EmissionFactorService {
  private readonly logger = new Logger(EmissionFactorService.name);

  constructor(
    @InjectRepository(EmissionFactor)
    private readonly emissionFactorRepository: Repository<EmissionFactor>,
  ) {}

  async getCurrentFactors(): Promise<EmissionFactorTable> {
    const rows = await this.emissionFactorRepository
      .createQueryBuilder('factor')
      .distinctOn(['factor.mode'])
      .where('factor.tenant_id = :tenantId', { tenantId: DEFAULT_TENANT_ID })
      .andWhere('factor.valid_from <= now()')
      .andWhere('(factor.valid_to IS NULL OR factor.valid_to > now())')
      .orderBy('factor.mode', 'ASC')
      .addOrderBy('factor.valid_from', 'DESC')
      .getMany();

    if (rows.length === 0) {
      this.logger.warn(
        'Table emission_factor vide au démarrage : repli intégral sur DEFAULT_EMISSION_FACTORS.',
      );
      return DEFAULT_EMISSION_FACTORS;
    }

    const byMode = new Map(
      rows.map((row) => [row.mode, Number(row.gramsPerKm)]),
    );

    return Object.fromEntries(
      Object.values(TransportMode).map((mode) => [
        mode,
        byMode.get(mode) ?? DEFAULT_EMISSION_FACTORS[mode],
      ]),
    ) as EmissionFactorTable;
  }
}
