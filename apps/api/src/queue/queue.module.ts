import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@food-ordering/types';

@Module({
  imports: [
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
  exports: [BullModule],
})
export class QueueModule {}
