import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { LineService } from './line.service';

@ApiTags('LINE Webhook')
@Controller('webhooks')
export class LineController {
  private readonly logger = new Logger(LineController.name);

  constructor(private lineService: LineService) {}

  /**
   * POST /webhooks/line
   * Blueprint §33 — LINE Messaging API Webhook
   * Verifies X-Line-Signature before processing events
   */
  @Post('line')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE Webhook endpoint — receives Messaging API events' })
  @ApiHeader({ name: 'x-line-signature', required: true, description: 'HMAC-SHA256 signature from LINE' })
  async handleLineWebhook(
    @Req() req: Request,
    @Headers('x-line-signature') signature: string,
  ) {
    // Raw body is available via express middleware (set rawBody in main.ts)
    const rawBody: Buffer = (req as any).rawBody;

    if (!rawBody) {
      this.logger.warn('No rawBody available for signature verification');
      throw new UnauthorizedException('Could not verify request origin');
    }

    const isValid = this.lineService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid LINE webhook signature');
    }

    const body = req.body as { events?: any[] };
    const events = body?.events ?? [];

    this.logger.log(`📥 LINE Webhook: ${events.length} event(s)`);

    // Process events asynchronously — don't block response
    this.lineService.handleWebhookEvents(events).catch((err) =>
      this.logger.error('Error handling LINE events', err),
    );

    // LINE requires 200 OK within 1 second
    return { status: 'ok' };
  }
}
