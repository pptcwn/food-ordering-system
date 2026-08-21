import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  UpdateBranchSettingsDtoType,
  UpdateBranchSettingsSchema,
  UpdateBranchStorefrontDtoType,
  UpdateBranchStorefrontSchema,
} from '@food-ordering/validation';
import { UserRole } from '@food-ordering/types';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of all active branches' })
  async getAllBranches() {
    return this.branchesService.getAllBranches();
  }

  @Get('nearest')
  @ApiOperation({ summary: 'Find nearest branch based on customer pinned latitude and longitude' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  async getNearestBranch(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    return this.branchesService.findNearestBranch(latitude, longitude);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch details by ID' })
  async getBranchById(@Param('id') id: string) {
    return this.branchesService.getBranchById(id);
  }

  @Patch(':id/storefront')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
  @UsePipes(new ZodValidationPipe(UpdateBranchStorefrontSchema))
  @ApiOperation({ summary: 'Update a branch storefront appearance' })
  async updateStorefront(
    @Param('id') id: string,
    @Body() dto: UpdateBranchStorefrontDtoType,
    @Req() req: any,
  ) {
    return this.branchesService.updateStorefront(id, dto, req.user);
  }

  @Patch(':id/settings')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
  @UsePipes(new ZodValidationPipe(UpdateBranchSettingsSchema))
  @ApiOperation({ summary: 'Update a branch store settings' })
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateBranchSettingsDtoType,
    @Req() req: any,
  ) {
    return this.branchesService.updateSettings(id, dto, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate a branch while retaining its history' })
  async removeBranch(@Param('id') id: string, @Req() req: any) {
    return this.branchesService.removeBranch(id, req.user);
  }
}
