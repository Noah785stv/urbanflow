import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessTokenPayload } from '../auth/types/access-token-payload.interface';
import { CarbonLogService } from './carbon-log.service';
import { CarbonReportService } from './carbon-report.service';
import { ConfirmTripDto } from './dto/confirm-trip.dto';
import { ListCarbonLogsQueryDto } from './dto/list-carbon-logs-query.dto';
import { MonthlyReportQueryDto } from './dto/monthly-report-query.dto';

/**
 * Contrôleur Carbon Log (F4 §6-7). L'utilisateur et le tenant proviennent
 * toujours du JWT (`user.sub`/`user.tenantId`), jamais d'un paramètre de
 * route : un utilisateur ne peut structurellement lire/confirmer que ses
 * propres trajets (§9, §5.7 A01).
 */
@ApiTags('carbon-logs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('carbon-logs')
export class CarbonLogController {
  constructor(
    private readonly carbonLogService: CarbonLogService,
    private readonly carbonReportService: CarbonReportService,
  ) {}

  @Post()
  confirmTrip(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: ConfirmTripDto,
  ) {
    return this.carbonLogService.confirmTrip(user.tenantId, user.sub, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListCarbonLogsQueryDto,
  ) {
    return this.carbonLogService.listForUser(
      user.tenantId,
      user.sub,
      query.page,
      query.limit,
    );
  }

  @Get('summary')
  summary(@CurrentUser() user: AccessTokenPayload) {
    return this.carbonLogService.getSummary(user.tenantId, user.sub);
  }

  @Get('report')
  @Header('Content-Type', 'application/pdf')
  async report(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: MonthlyReportQueryDto,
  ): Promise<StreamableFile> {
    const data = await this.carbonLogService.getMonthlyReport(
      user.tenantId,
      user.sub,
      query.month,
    );
    const pdf = await this.carbonReportService.renderMonthlyReport(data);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="bilan-carbone-${query.month}.pdf"`,
    });
  }
}
