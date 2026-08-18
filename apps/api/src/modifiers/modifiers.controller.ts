import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModifiersService, CreateModifierGroupDto } from './modifiers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';

@ApiTags('Modifiers')
@Controller('modifiers')
export class ModifiersController {
  constructor(private modifiersService: ModifiersService) {}

  @Get('groups')
  @ApiOperation({ summary: 'Get all modifier groups with options' })
  async findAllGroups() {
    return this.modifiersService.findAllGroups();
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get single modifier group by ID' })
  async findGroupById(@Param('id') id: string) {
    return this.modifiersService.findGroupById(id);
  }

  @Post('admin/groups')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create modifier group (Admin)' })
  async createGroup(@Body() dto: CreateModifierGroupDto) {
    return this.modifiersService.createGroup(dto);
  }
}
