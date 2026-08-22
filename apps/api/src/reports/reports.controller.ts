import { BadRequestException, Controller, Get, Query, Res, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';
import { effectiveBranchScope } from '../common/authz/branch-access';

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

  @Get('expenses/export')
  @ApiOperation({ summary: 'Export monthly expense and input VAT report as PDF or Excel' })
  async exportExpenses(
    @Res() res: Response,
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('format') format: 'pdf' | 'xlsx' = 'pdf',
    @Query('includeAttachments') includeAttachments = 'true',
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('กรุณาระบุเดือนในรูปแบบ YYYY-MM');
    if (format !== 'pdf' && format !== 'xlsx') throw new BadRequestException('รองรับเฉพาะไฟล์ PDF หรือ Excel');
    const report = await this.reportsService.exportExpenses({
      branchId: effectiveBranchScope(req.user, branchId),
      month,
      format,
      includeAttachments: includeAttachments !== 'false',
    });
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.buffer);
  }

  @Get('revenue/export')
  @ApiOperation({ summary: 'Export monthly revenue report as PDF or Excel' })
  async exportRevenue(
    @Res() res: Response,
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('format') format: 'pdf' | 'xlsx' = 'pdf',
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('กรุณาระบุเดือนในรูปแบบ YYYY-MM');
    if (format !== 'pdf' && format !== 'xlsx') throw new BadRequestException('รองรับเฉพาะไฟล์ PDF หรือ Excel');
    const report = await this.reportsService.exportRevenue(effectiveBranchScope(req.user, branchId), month, format);
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.buffer);
  }
}
