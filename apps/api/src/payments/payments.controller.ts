import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService, UploadedFileDto } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';
import { Request } from 'express';
import { effectiveBranchScope } from '../common/authz/branch-access';

@ApiTags('Payments & Slip Upload')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders/:id/payment')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('slip')
  @UseInterceptors(FileInterceptor('slip'))
  @ApiOperation({ summary: 'Upload bank transfer slip for automated Slip2Go OCR verification' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        slip: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadSlip(
    @Param('id') orderId: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    return this.paymentsService.uploadSlip(orderId, (req as any).user.id, file as UploadedFileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get payment status and presigned slip image URL' })
  async getPaymentDetails(@Param('id') orderId: string, @Req() req: Request) {
    return this.paymentsService.getPaymentDetails(orderId, (req as any).user.id);
  }

  @Get('qr')
  @ApiOperation({ summary: 'Get PromptPay QR payload for order payment' })
  async getQrPayload(@Param('id') orderId: string, @Req() req: Request) {
    return this.paymentsService.generatePromptPayQrPayload(orderId, (req as any).user.id);
  }

  @Post('dev/simulate')
  @ApiOperation({ summary: 'Development-only: mark an uploaded local demo slip as verified' })
  async simulateDevelopmentPayment(@Param('id') orderId: string, @Req() req: Request) {
    return this.paymentsService.simulateDevelopmentPayment(orderId, (req as any).user.id);
  }
}

/**
 * Blueprint §32 — GET /api/admin/payments
 * Admin payment review dashboard — list all payments with slip status
 */
@ApiTags('Admin Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payments with optional status/branch filter' })
  @ApiQuery({ name: 'status', required: false, description: 'PENDING|VERIFYING|VERIFIED|FAILED|MANUAL_REVIEW' })
  @ApiQuery({ name: 'branchId', required: false })
  async getAdminPayments(
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: Request,
  ) {
    return this.paymentsService.getAdminPayments(status, effectiveBranchScope((req as any).user, branchId));
  }
}
