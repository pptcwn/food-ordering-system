import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrderStatus, UserRole } from '@food-ordering/types';

class KitchenStatusDto {
  status: OrderStatus;
}

class ToggleAvailabilityDto {
  is_available: boolean;
}

@ApiTags('Kitchen')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN)
@Controller('kitchen')
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  /**
   * GET /api/kitchen/orders
   * Kitchen Display System — list active orders for a branch
   */
  @Get('orders')
  @ApiOperation({ summary: 'KDS: list active orders (PAID/CONFIRMED/PREPARING/READY)' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getKitchenOrders(@Query('branchId') branchId?: string) {
    return this.kitchenService.getKitchenOrders(branchId);
  }

  /**
   * GET /api/kitchen/orders/:id
   * Full order detail for kitchen popup / card expansion
   */
  @Get('orders/:id')
  @ApiOperation({ summary: 'KDS: get single order detail' })
  async getKitchenOrder(@Param('id') id: string) {
    return this.kitchenService.getKitchenOrder(id);
  }

  /**
   * PATCH /api/kitchen/orders/:id/status
   * Blueprint §20 — kitchen transitions: PAID→CONFIRMED→PREPARING→READY
   */
  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'KDS: advance order status (CONFIRMED/PREPARING/READY)' })
  async updateKitchenStatus(
    @Param('id') id: string,
    @Body() dto: KitchenStatusDto,
    @CurrentUser('name') staffName?: string,
  ) {
    return this.kitchenService.updateKitchenStatus(id, dto.status, staffName || 'KITCHEN');
  }

  /**
   * PATCH /api/kitchen/products/:id/availability
   * Blueprint §43.1 — toggle sold-out from kitchen
   */
  @Patch('products/:id/availability')
  @ApiOperation({ summary: 'KDS: toggle product sold-out status' })
  async toggleProductAvailability(
    @Param('id') id: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.kitchenService.toggleProductAvailability(id, dto.is_available);
  }
}
