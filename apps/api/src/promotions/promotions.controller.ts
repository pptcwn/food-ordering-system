import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  PromotionsService,
  ValidateCouponDto,
  CreatePromotionDto,
  CreateCouponDto,
  UpdateCouponDto,
} from './promotions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';

@ApiTags('Coupons & Promotions')
@Controller('coupons')
export class CouponsController {
  constructor(private promotionsService: PromotionsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate coupon code and return discount amount' })
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.promotionsService.validateCoupon(dto);
  }
}

@ApiTags('Admin Promotions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all promotions and associated coupons' })
  @ApiQuery({ name: 'branchId', required: false })
  async getAdminPromotions(@Query('branchId') branchId?: string) {
    return this.promotionsService.getAdminPromotions(branchId);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create new promotion campaign' })
  async createPromotion(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(dto);
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Admin: generate coupon code for promotion' })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.promotionsService.createCoupon(dto);
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Admin: update coupon code, usage limit, or status' })
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.promotionsService.updateCoupon(id, dto);
  }

  @Patch('coupons/:id/toggle')
  @ApiOperation({ summary: 'Admin: activate/deactivate coupon code' })
  async toggleCoupon(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.promotionsService.toggleCouponStatus(id, isActive);
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Admin: delete coupon' })
  async deleteCoupon(@Param('id') id: string) {
    return this.promotionsService.deleteCoupon(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete a promotion and its coupons' })
  async deletePromotion(@Param('id') id: string) {
    return this.promotionsService.deletePromotion(id);
  }
}
