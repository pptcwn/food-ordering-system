import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, AdminPaymentsController } from './payments.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
