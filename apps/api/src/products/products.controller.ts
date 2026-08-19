import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService, CreateProductDto, UpdateProductDto } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';
import { Request } from 'express';
import { requireBranchAccess } from '../common/authz/branch-access';

export class UpdateAvailabilityDto {
  isAvailable: boolean;
}

@ApiTags('Products & Menu')
@Controller()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get('menu')
  @ApiOperation({ summary: 'Get full categorized menu scoped by branch' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getMenu(@Query('branchId') branchId?: string) {
    return this.productsService.getMenu(branchId);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get single product details with variants and modifiers' })
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Patch('admin/products/:id/availability')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.KITCHEN)
  @ApiOperation({ summary: 'Realtime Sold-Out / Availability Toggle (Kitchen/Admin)' })
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
    @Req() req?: Request,
  ) {
    const product = await this.productsService.getProductById(id);
    requireBranchAccess((req as any).user, product.branchId);
    return this.productsService.updateAvailability(id, dto.isAvailable);
  }

  @Post('admin/products')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new product with variants and modifiers (Admin)' })
  async create(@Body() dto: CreateProductDto, @Req() req?: Request) {
    requireBranchAccess((req as any).user, dto.branchId);
    return this.productsService.create(dto);
  }

  @Patch('admin/products/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product information (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req?: Request) {
    const product = await this.productsService.getProductById(id);
    requireBranchAccess((req as any).user, product.branchId);
    return this.productsService.update(id, dto);
  }

  @Delete('admin/products/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate product (Admin)' })
  async remove(@Param('id') id: string, @Req() req?: Request) {
    const product = await this.productsService.getProductById(id);
    requireBranchAccess((req as any).user, product.branchId);
    return this.productsService.remove(id);
  }
}
