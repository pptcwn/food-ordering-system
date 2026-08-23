import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { BUCKET_NAMES, APP_CONFIG } from '@food-ordering/config';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private publicPresignClient?: Minio.Client;

  constructor(private configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = Number(this.configService.get<number>('MINIO_PORT', 9000));
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin123');

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    const publicPresignUrl = this.configService.get<string>('MINIO_PUBLIC_PRESIGNED_URL');
    if (publicPresignUrl) {
      const endpoint = new URL(publicPresignUrl);
      this.publicPresignClient = new Minio.Client({
        endPoint: endpoint.hostname,
        port: Number(endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80)),
        useSSL: endpoint.protocol === 'https:',
        accessKey,
        secretKey,
      });
    }
  }

  async onModuleInit() {
    await this.ensureBucketsExist();
  }

  private async ensureBucketsExist() {
    const buckets = Object.values(BUCKET_NAMES);
    for (const bucket of buckets) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket, 'us-east-1');
          this.logger.log(` Created MinIO bucket: ${bucket}`);
        }

        if (bucket === BUCKET_NAMES.PRODUCTS) {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicRead',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucket}/*`],
              },
            ],
          };
          await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
          this.logger.log(` Set public read policy on bucket: ${bucket}`);
        }
      } catch (error) {
        this.logger.warn(`Could not verify/create bucket ${bucket}: ${error}`);
      }
    }
  }

  async uploadFile(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    await this.client.putObject(bucketName, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return objectName;
  }

  async getPresignedUrl(
    bucketName: string,
    objectName: string,
    expirySeconds = APP_CONFIG.PRESIGNED_URL_EXPIRATION_SECONDS,
  ): Promise<string> {
    // Sign private attachment URLs with a browser-reachable hostname, not Docker's `minio` service name.
    return (this.publicPresignClient || this.client).presignedGetObject(bucketName, objectName, expirySeconds);
  }

  async getFileBuffer(bucketName: string, objectName: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucketName, objectName);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async removeFiles(bucketName: string, objectNames: string[]): Promise<void> {
    if (objectNames.length === 0) return;
    await this.client.removeObjects(bucketName, objectNames);
  }

  getClient(): Minio.Client {
    return this.client;
  }
}
