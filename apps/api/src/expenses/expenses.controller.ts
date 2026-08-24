import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';
import { effectiveBranchScope, requireBranchAccess } from '../common/authz/branch-access';
import { ExpensesService } from './expenses.service';

class VendorDto {
  @IsOptional() @IsString() branchId?: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() office?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}

class ExpenseDto {
  @IsString() @IsNotEmpty() branchId: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() vendorName?: string;
  @IsOptional() @IsString() vendorTaxId?: string;
  @IsOptional() @IsString() vendorAddress?: string;
  @IsOptional() @IsString() vendorOffice?: string;
  @IsString() @IsNotEmpty() expenseDate: string;
  @IsOptional() @IsString() paidAt?: string;
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsNotEmpty() description: string;
  @IsOptional() @IsString() documentNumber?: string;
  @IsNumber() subtotal: number;
  @IsOptional() @IsNumber() vatAmount?: number;
  @IsOptional() @IsString() status?: string;
}

@Controller('admin/expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get('vendors')
  listVendors(@Query('branchId') branchId: string | undefined, @Req() req: any) {
    return this.expensesService.listVendors(effectiveBranchScope(req.user, branchId));
  }

  @Post('vendors')
  async createVendor(@Body() dto: VendorDto, @Req() req: any) {
    if (dto.branchId) requireBranchAccess(req.user, dto.branchId);
    return this.expensesService.createVendor(dto);
  }

  @Patch('vendors/:id')
  async updateVendor(@Param('id') id: string, @Body() dto: VendorDto, @Req() req: any) {
    const vendor = await this.expensesService.getVendor(id);
    if (vendor.branchId) requireBranchAccess(req.user, vendor.branchId);
    return this.expensesService.updateVendor(id, dto);
  }

  @Delete('vendors/:id')
  async deactivateVendor(@Param('id') id: string, @Req() req: any) {
    const vendor = await this.expensesService.getVendor(id);
    if (vendor.branchId) requireBranchAccess(req.user, vendor.branchId);
    return this.expensesService.deactivateVendor(id);
  }

  @Get('summary')
  summary(@Query('branchId') branchId: string | undefined, @Query('month') month: string | undefined, @Req() req: any) {
    return this.expensesService.monthlySummary(effectiveBranchScope(req.user, branchId), month);
  }

  @Get()
  list(@Query('branchId') branchId: string | undefined, @Query('month') month: string | undefined, @Query('category') category: string | undefined, @Req() req: any) {
    return this.expensesService.listExpenses(effectiveBranchScope(req.user, branchId), month, category);
  }

  @Post()
  async create(@Body() dto: ExpenseDto, @Req() req: any) {
    requireBranchAccess(req.user, dto.branchId);
    return this.expensesService.createExpense(dto, req.user?.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<ExpenseDto>, @Req() req: any) {
    const expense = await this.expensesService.getExpense(id);
    requireBranchAccess(req.user, expense.branchId);
    return this.expensesService.updateExpense(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const expense = await this.expensesService.getExpense(id);
    requireBranchAccess(req.user, expense.branchId);
    return this.expensesService.deleteExpense(id);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(@Param('id') id: string, @UploadedFile() file: any, @Req() req: any) {
    const expense = await this.expensesService.getExpense(id);
    requireBranchAccess(req.user, expense.branchId);
    return this.expensesService.attachFile(id, file);
  }

  @Get(':id/attachments/:attachmentId')
  async getAttachmentFile(@Param('id') id: string, @Param('attachmentId') attachmentId: string, @Req() req: any, @Res() res: any) {
    const expense = await this.expensesService.getExpense(id);
    requireBranchAccess(req.user, expense.branchId);
    const attachment = expense.attachments.find((a: any) => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    const buffer = await this.expensesService.getAttachmentBuffer(attachment.bucket, attachment.objectKey);
    res.setHeader('Content-Type', attachment.mimeType);
    res.send(buffer);
  }
}
