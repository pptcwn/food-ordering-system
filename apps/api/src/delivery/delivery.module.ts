import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import {
  DeliveryPublicController,
  DeliveryAdminController,
  DeliveryRiderController,
} from './delivery.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [
    DeliveryPublicController,
    DeliveryAdminController,
    DeliveryRiderController,
  ],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
