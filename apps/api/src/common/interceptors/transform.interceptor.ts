import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T>>
{
  private readonly legacyMinioUrl = 'http://34.126.172.168:9000';
  private readonly publicMinioUrl =
    process.env.MINIO_PUBLIC_PRODUCTS_URL || this.legacyMinioUrl;

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        // Older rows and cart snapshots contain the former HTTP MinIO host.
        // Normalize every API payload so HTTPS pages never request mixed content.
        data: this.normalizeLegacyMinioUrls(data ?? null) as T,
        timestamp: new Date().toISOString(),
      })),
    );
  }

  private normalizeLegacyMinioUrls(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.replace(this.legacyMinioUrl, this.publicMinioUrl);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeLegacyMinioUrls(item));
    }
    if (value instanceof Date) {
      return value;
    }
    if (
      value &&
      typeof value === 'object' &&
      (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null)
    ) {
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.normalizeLegacyMinioUrls(obj[key]);
        }
      }
      return result;
    }
    return value;
  }
}
