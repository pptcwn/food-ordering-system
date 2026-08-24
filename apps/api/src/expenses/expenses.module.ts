import { Module } from '@nestjs/common';
import { ExpensesController, ExpensesPublicController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  controllers: [ExpensesController, ExpensesPublicController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
