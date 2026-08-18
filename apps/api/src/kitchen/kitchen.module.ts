import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule], // WebsocketModule is @Global — EventsGateway auto-available
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}
