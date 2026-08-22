import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { QueueModule } from '../queue/queue.module';
import { OrderLifecycleService } from './order-lifecycle.service';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [QueueModule, DeliveryModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService],
  exports: [OrdersService],
})
export class OrdersModule {}
