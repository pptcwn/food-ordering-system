import { Module } from '@nestjs/common';
import { RevenueController, RevenuePublicController } from './revenue.controller';
import { RevenueService } from './revenue.service';

@Module({ controllers: [RevenueController, RevenuePublicController], providers: [RevenueService] })
export class RevenueModule {}
