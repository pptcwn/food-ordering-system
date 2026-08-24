import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';
import { effectiveBranchScope, requireBranchAccess } from '../common/authz/branch-access';
import { RevenueService } from './revenue.service';

class RevenueDto {
  @IsString() @IsNotEmpty() branchId: string;
  @IsString() @IsNotEmpty() source: string;
  @IsString() @IsNotEmpty() settlementDate: string;
  @IsOptional() @IsString() periodStart?: string;
  @IsOptional() @IsString() periodEnd?: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsNumber() grossAmount: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsArray() deductions?: { type: string; description?: string; amount: number }[];
}

@Controller('admin/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
export class RevenueController {
  constructor(private revenueService: RevenueService) {}

  @Get('system') system(@Query('branchId') branchId: string | undefined, @Query('month') month: string | undefined, @Req() req: any) { return this.revenueService.systemRevenue(effectiveBranchScope(req.user, branchId), month); }
  @Get('summary') summary(@Query('branchId') branchId: string | undefined, @Query('source') source: string, @Query('month') month: string | undefined, @Req() req: any) { return this.revenueService.summary(effectiveBranchScope(req.user, branchId), source, month); }
  @Get() list(@Query('branchId') branchId: string | undefined, @Query('source') source: string, @Query('month') month: string | undefined, @Req() req: any) { return this.revenueService.list(effectiveBranchScope(req.user, branchId), source, month); }
  @Post() async create(@Body() dto: RevenueDto, @Req() req: any) { requireBranchAccess(req.user, dto.branchId); return this.revenueService.create(dto, req.user?.id); }
  @Patch(':id') async update(@Param('id') id: string, @Body() dto: Partial<RevenueDto>, @Req() req: any) { const row = await this.revenueService.get(id); requireBranchAccess(req.user, row.branchId); return this.revenueService.update(id, dto); }
  @Delete(':id') async delete(@Param('id') id: string, @Req() req: any) { const row = await this.revenueService.get(id); requireBranchAccess(req.user, row.branchId); return this.revenueService.delete(id); }
  @Post(':id/attachments') @UseInterceptors(FileInterceptor('file')) async attach(@Param('id') id: string, @UploadedFile() file: any, @Req() req: any) { const row = await this.revenueService.get(id); requireBranchAccess(req.user, row.branchId); return this.revenueService.attachFile(id, file); }

}

@Controller('attachments/revenue')
export class RevenuePublicController {
  constructor(private revenueService: RevenueService) {}

  @Get(':id/:attachmentId')
  async getAttachmentFile(@Param('id') id: string, @Param('attachmentId') attachmentId: string, @Res() res: any) {
    const row = await this.revenueService.get(id);
    const attachment = row.attachments.find((a: any) => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    const buffer = await this.revenueService.getAttachmentBuffer(attachment.bucket, attachment.objectKey);
    res.setHeader('Content-Type', attachment.mimeType);
    res.send(buffer);
  }
}
