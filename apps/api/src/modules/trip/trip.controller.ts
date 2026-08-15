import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanTripRequestDto } from './dto/plan-trip-request.dto';
import { TripPlannerService } from './trip-planner.service';

/** Contrôleur Trip (§6) — planificateur multimodal. */
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Post('plan')
  plan(@Body() dto: PlanTripRequestDto) {
    return this.tripPlannerService.plan(dto);
  }
}
