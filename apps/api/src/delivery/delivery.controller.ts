import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DeliveryService, CalculateFeeDto } from './delivery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DeliveryStatus, UserRole } from '@food-ordering/types';
import { Request } from 'express';
import { effectiveBranchScope, requireBranchAccess } from '../common/authz/branch-access';

class AssignDeliveryDto {
  deliveryStaffId: string;
}

class FailDeliveryDto {
  note?: string;
}

/**
 * Public & Customer Delivery Calculation
 */
@ApiTags('Delivery Calculation')
@Controller('delivery')
export class DeliveryPublicController {
  constructor(private deliveryService: DeliveryService) {}

  @Post('calculate-fee')
  @ApiOperation({ summary: 'Calculate distance & delivery fee between branch and customer coordinates' })
  async calculateFee(@Body() dto: CalculateFeeDto) {
    return this.deliveryService.calculateDeliveryFee(dto);
  }
}

/**
 * Admin Delivery Management Routes — Blueprint §25
 */
@ApiTags('Delivery (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.DELIVERY)
@Controller('admin/deliveries')
export class DeliveryAdminController {
  constructor(private deliveryService: DeliveryService) {}

  @Get()
  @ApiOperation({ summary: 'List all deliveries with optional filters' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
  async getDeliveries(
    @Query('branchId') branchId?: string,
    @Query('status') status?: DeliveryStatus,
    @Req() req?: Request,
  ) {
    return this.deliveryService.getDeliveries(effectiveBranchScope((req as any).user, branchId), status);
  }

  @Get('staff/list')
  @ApiOperation({ summary: 'List active delivery staff for a branch' })
  @ApiQuery({ name: 'branchId', required: false })
  async getDeliveryStaff(@Query('branchId') branchId?: string, @Req() req?: Request) {
    return this.deliveryService.getDeliveryStaff(effectiveBranchScope((req as any).user, branchId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery job detail' })
  async getDelivery(@Param('id') id: string, @Req() req?: Request) {
    const delivery = await this.deliveryService.getDelivery(id);
    requireBranchAccess((req as any).user, delivery.order.branchId);
    return delivery;
  }

  @Post(':orderId/assign')
  @ApiOperation({ summary: 'Assign delivery staff to a READY order' })
  async assignDelivery(
    @Param('orderId') orderId: string,
    @Body() dto: AssignDeliveryDto,
    @Req() req?: Request,
  ) {
    const order = await this.deliveryService.getOrderForDelivery(orderId);
    requireBranchAccess((req as any).user, order.branchId);
    const staff = await this.deliveryService.getDeliveryStaffById(dto.deliveryStaffId);
    requireBranchAccess((req as any).user, staff.branchId);
    return this.deliveryService.assignDelivery(orderId, dto.deliveryStaffId);
  }

  @Patch(':id/pickup')
  @ApiOperation({ summary: 'Mark delivery as picked up by driver' })
  @HttpCode(HttpStatus.OK)
  async markPickedUp(@Param('id') id: string, @Req() req?: Request) {
    requireBranchAccess((req as any).user, (await this.deliveryService.getDelivery(id)).order.branchId);
    return this.deliveryService.markPickedUp(id);
  }

  @Patch(':id/out-for-delivery')
  @ApiOperation({ summary: 'Mark delivery as out-for-delivery (driver departed)' })
  @HttpCode(HttpStatus.OK)
  async markOutForDelivery(@Param('id') id: string, @Req() req?: Request) {
    requireBranchAccess((req as any).user, (await this.deliveryService.getDelivery(id)).order.branchId);
    return this.deliveryService.markOutForDelivery(id);
  }

  @Patch(':id/delivered')
  @UseInterceptors(FileInterceptor('proofPhoto'))
  @ApiOperation({ summary: 'Mark delivery as completed with optional photo proof (Blueprint §29)' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  async markDelivered(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('note') note?: string,
    @Req() req?: Request,
  ) {
    requireBranchAccess((req as any).user, (await this.deliveryService.getDelivery(id)).order.branchId);
    return this.deliveryService.markDelivered(id, file, note);
  }

  @Patch(':id/failed')
  @ApiOperation({ summary: 'Mark delivery as failed' })
  @HttpCode(HttpStatus.OK)
  async markFailed(@Param('id') id: string, @Body() dto: FailDeliveryDto, @Req() req?: Request) {
    requireBranchAccess((req as any).user, (await this.deliveryService.getDelivery(id)).order.branchId);
    return this.deliveryService.markFailed(id, dto.note);
  }
}

/**
 * Rider / Driver Routes — Blueprint §23, §29
 */
@ApiTags('Delivery (Rider)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY, UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('delivery')
export class DeliveryRiderController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Rider: get pending delivery jobs for my branch' })
  async getMyJobs(@Query('staffId') staffId: string) {
    return this.deliveryService.getPendingJobsForRider(staffId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Rider: get single delivery job detail' })
  async getJobDetail(@Param('id') id: string) {
    return this.deliveryService.getDelivery(id);
  }

  @Patch('jobs/:id/delivered')
  @UseInterceptors(FileInterceptor('proofPhoto'))
  @ApiOperation({ summary: 'Rider: confirm delivery completed with photo proof' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  async confirmDelivered(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('note') note?: string,
  ) {
    return this.deliveryService.markDelivered(id, file, note);
  }
}
