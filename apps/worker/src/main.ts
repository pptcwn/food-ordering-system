import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  app.enableShutdownHooks();
  logger.log('🚀 BullMQ Background Worker is running and listening to job queues...');
}

bootstrap();
