import { Controller, Get, Query, Res, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';

@ApiTags('Admin Reports & Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
@Controller('admin/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales and operations summary' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getSalesSummary(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesSummary(branchId, startDate, endDate);
  }

  @Get('sales/trends')
  @ApiOperation({ summary: 'Get daily sales trends for chart rendering' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getSalesTrends(
    @Query('branchId') branchId?: string,
    @Query('days') days?: number,
  ) {
    return this.reportsService.getSalesTrends(branchId, days ? Number(days) : 7);
  }

  @Get('sales/export')
  @ApiOperation({ summary: 'Export orders and sales report to CSV' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async exportCsv(
    @Res() res: Response,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csvData = await this.reportsService.exportOrdersCsv(branchId, startDate, endDate);
    const filename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Add UTF-8 BOM so Excel opens Thai characters correctly
    res.send('\uFEFF' + csvData);
  }
}
