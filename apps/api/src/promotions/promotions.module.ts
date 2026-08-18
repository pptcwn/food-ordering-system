import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CouponsController, AdminPromotionsController } from './promotions.controller';

@Module({
  controllers: [CouponsController, AdminPromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
