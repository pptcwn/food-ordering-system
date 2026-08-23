import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrderStatus, UserRole } from '@food-ordering/types';
import { requireBranchAccess } from '../common/authz/branch-access';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CheckoutOrderDto,
  CheckoutOrderSchema,
  UpdateOrderStatusDto,
  UpdateOrderStatusSchema,
} from '@food-ordering/validation';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from active cart (Checkout)' })
  @UsePipes(new ZodValidationPipe(CheckoutOrderSchema))
  async createOrder(
    @Req() req: Request,
    @Body() dto: CheckoutOrderDto,
  ) {
    const userId = (req as any).user?.id;
    return this.ordersService.createOrder(userId, dto);
  }

  @Get('my-orders')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order history for current customer' })
  async getCustomerOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getCustomerOrders(userId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Lightweight order status check for LIFF customer tracking' })
  async getOrderStatus(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.getOrderStatus(id, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full order details with items and payment status' })
  async getOrderById(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.getOrderById(id, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Customer cancels their own order (before PREPARING)' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancelOrderByCustomer(id, userId, reason);
  }

  @Get('admin/all')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN)
  @ApiOperation({ summary: 'Admin/Kitchen list all orders with filters' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  async getAdminOrders(
    @Query('branchId') branchId?: string,
    @Query('status') status?: OrderStatus,
    @Req() req?: Request,
  ) {
    const user = (req as any).user;
    const staffBranchId = user.staff?.branchId;
    if (user.role !== UserRole.SUPER_ADMIN && (!staffBranchId || (branchId && branchId !== staffBranchId))) {
      throw new ForbiddenException('Branch access denied');
    }
    return this.ordersService.getAdminOrders(user.role === UserRole.SUPER_ADMIN ? branchId : staffBranchId, status);
  }

  @Patch('admin/:id/status')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN, UserRole.DELIVERY)
  @ApiOperation({ summary: 'Update order lifecycle status (Admin, Kitchen, Delivery)' })
  @UsePipes(new ZodValidationPipe(UpdateOrderStatusSchema))
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('name') userName?: string,
    @Req() req?: Request,
  ) {
    const order = await this.ordersService.getOrderForStaff(id);
    const user = (req as any).user;
    requireBranchAccess(user, order.branchId);
    return this.ordersService.updateOrderStatus(id, dto, userName || 'ADMIN', user.role);
  }
}
