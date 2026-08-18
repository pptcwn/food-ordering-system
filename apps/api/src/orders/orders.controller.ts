import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { OrdersService, CreateOrderDto, UpdateOrderStatusDto } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrderStatus, UserRole } from '@food-ordering/types';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from active cart (Checkout)' })
  @ApiHeader({ name: 'x-session-id', required: false })
  async createOrder(
    @Req() req: Request,
    @Body() dto: CreateOrderDto,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.ordersService.createOrder(userId, {
      ...dto,
      sessionId: dto.sessionId || sessionId,
    });
  }

  @Get('my-orders')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order history for current customer' })
  async getCustomerOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getCustomerOrders(userId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Lightweight order status check for LIFF customer tracking' })
  async getOrderStatus(@Param('id') id: string) {
    return this.ordersService.getOrderStatus(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full order details with items and payment status' })
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Get('admin/all')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN)
  @ApiOperation({ summary: 'Admin/Kitchen list all orders with filters' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  async getAdminOrders(
    @Query('branchId') branchId?: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.getAdminOrders(branchId, status);
  }

  @Patch('admin/:id/status')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN, UserRole.DELIVERY)
  @ApiOperation({ summary: 'Update order lifecycle status (Admin, Kitchen, Delivery)' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('name') userName?: string,
  ) {
    return this.ordersService.updateOrderStatus(id, dto, userName || 'ADMIN');
  }
}
