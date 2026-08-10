import { Module } from '@nestjs/common';
import { DegradedCacheService } from './degraded-cache.service';

@Module({
  providers: [DegradedCacheService],
  exports: [DegradedCacheService],
})
export class CacheModule {}
