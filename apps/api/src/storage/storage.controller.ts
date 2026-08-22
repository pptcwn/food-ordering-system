import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MinioService } from './minio.service';
import { BUCKET_NAMES } from '@food-ordering/config';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@food-ordering/types';
import { ConfigService } from '@nestjs/config';

@ApiTags('Storage & Media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER)
@Controller('storage')
export class StorageController {
  constructor(
    private minioService: MinioService,
    private configService: ConfigService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload product image or store banner' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('กรุณาเลือกไฟล์รูปภาพที่ต้องการอัปโหลด');
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const objectName = `${uuidv4()}.${ext}`;

    try {
      await this.minioService.uploadFile(
        BUCKET_NAMES.PRODUCTS,
        objectName,
        file.buffer,
        file.mimetype,
      );

      const endpoint = this.getPublicEndpoint();
      const url = `${endpoint}/${BUCKET_NAMES.PRODUCTS}/${objectName}`;

      return {
        success: true,
        objectName,
        url,
      };
    } catch (err: any) {
      // Fallback data url if storage server is offline
      const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      return {
        success: true,
        objectName,
        url: base64,
      };
    }
  }

  private getPublicEndpoint() {
    const configuredUrl = this.configService.get<string>('MINIO_PUBLIC_PRODUCTS_URL');
    if (configuredUrl) return configuredUrl.replace(/\/$/, '');

    throw new BadRequestException('ยังไม่ได้ตั้งค่า URL สาธารณะสำหรับรูปภาพสินค้า');
  }
}
