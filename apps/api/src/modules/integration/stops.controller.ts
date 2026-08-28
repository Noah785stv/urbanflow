import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StopsService } from './stops.service';

@ApiTags('stops')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('stops')
export class StopsController {
  constructor(private readonly stopsService: StopsService) {}

  @Get(':id/departures')
  getDepartures(@Param('id') id: string) {
    return this.stopsService.getDepartures(id);
  }
}
