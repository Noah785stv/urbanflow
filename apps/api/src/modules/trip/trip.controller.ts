import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanTripRequestDto } from './dto/plan-trip-request.dto';
import { TripPlannerService } from './trip-planner.service';

/** Contrôleur Trip (§6) — planificateur multimodal. */
@ApiTags('trips')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Post('plan')
  plan(@Body() dto: PlanTripRequestDto) {
    return this.tripPlannerService.plan(dto);
  }
}
