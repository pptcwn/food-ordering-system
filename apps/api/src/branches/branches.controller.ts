import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BranchesService } from './branches.service';

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
}
