import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController, AdminCustomersController } from './customers.controller';

@Module({
  controllers: [CustomersController, AdminCustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
