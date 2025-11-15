import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AiService } from './ai.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60 * 60, // 1 hour
      max: 1000,
    }),
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
