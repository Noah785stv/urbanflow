import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StationsNearbyQueryDto } from './dto/stations-nearby-query.dto';
import { StationsService } from './stations.service';

@UseGuards(JwtAuthGuard)
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get('nearby')
  findNearby(@Query() query: StationsNearbyQueryDto) {
    return this.stationsService.findNearby(query.lat, query.lng, query.radius);
  }
}
