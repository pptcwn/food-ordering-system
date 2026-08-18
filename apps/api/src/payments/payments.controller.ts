import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService, UploadedFileDto } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';

@ApiTags('Payments & Slip Upload')
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
  ) {
    return this.paymentsService.uploadSlip(orderId, file as UploadedFileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get payment status and presigned slip image URL' })
  async getPaymentDetails(@Param('id') orderId: string) {
    return this.paymentsService.getPaymentDetails(orderId);
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
  ) {
    return this.paymentsService.getAdminPayments(status, branchId);
  }
}
