import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@food-ordering/types';
import { Slip2GoService } from './services/slip2go.service';
import { TelegramService } from './services/telegram.service';
import { LineNotifyService } from './services/line-notify.service';
import { PaymentEventsProcessor } from './processors/payment-events.processor';
import { OrderEventsProcessor } from './processors/order-events.processor';
import { NotificationsProcessor } from './processors/notifications.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<number>('REDIS_PORT', 6379)),
          password: configService.get<string>('REDIS_PASSWORD', undefined) || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.ORDER_EVENTS },
      { name: QUEUE_NAMES.PAYMENT_EVENTS },
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.ORDER_EXPIRATION },
      { name: QUEUE_NAMES.REPORTS },
    ),
  ],
  providers: [
    Slip2GoService,
    TelegramService,
    LineNotifyService,
    PaymentEventsProcessor,
    OrderEventsProcessor,
    NotificationsProcessor,
  ],
})
export class WorkerModule {}
