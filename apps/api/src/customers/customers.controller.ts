import { Controller, Get, Put, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService, UpdateProfileDto, SaveLocationDto } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@food-ordering/types';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile, phone, and addresses' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.customersService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update customer name and phone number before choosing menu' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.customersService.updateProfile(userId, dto);
  }

  @Post('location')
  @ApiOperation({ summary: 'Save pinned delivery location and address before choosing menu' })
  async saveLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveLocationDto,
  ) {
    return this.customersService.saveLocation(userId, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List customer saved addresses' })
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.customersService.getAddresses(userId);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set default delivery address' })
  async setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.customersService.setDefaultAddress(userId, addressId);
  }
}

/**
 * Blueprint §57 — /admin/customers
 */
@ApiTags('Admin Customers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all customers with LINE profile and order count' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or phone' })
  async getAdminCustomers(@Query('search') search?: string) {
    return this.customersService.getAdminCustomers(search);
  }
}
