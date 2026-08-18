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

@ApiTags('Storage & Media')
@Controller('storage')
export class StorageController {
  constructor(private minioService: MinioService) {}

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

      const endpoint = process.env.MINIO_SERVER_URL || 'http://34.126.172.168:9000';
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
}
