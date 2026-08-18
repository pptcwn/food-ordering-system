import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly channelSecret: string;
  private readonly channelAccessToken: string;

  constructor(private configService: ConfigService) {
    this.channelSecret = this.configService.get<string>('LINE_CHANNEL_SECRET', '');
    this.channelAccessToken = this.configService.get<string>(
      'LINE_CHANNEL_ACCESS_TOKEN',
      '',
    );
  }

  /**
   * Blueprint §53 — Verify LINE Webhook X-Line-Signature
   * HMAC-SHA256 of raw request body using Channel Secret
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!this.channelSecret) {
      this.logger.warn('LINE_CHANNEL_SECRET not configured — skipping signature verification');
      return false;
    }

    const expectedSig = crypto
      .createHmac('SHA256', this.channelSecret)
      .update(rawBody)
      .digest('base64');

    const isValid = expectedSig === signature;
    if (!isValid) {
      this.logger.warn(`⚠️ LINE Webhook signature mismatch. Got: ${signature}`);
    }
    return isValid;
  }

  /**
   * Handle incoming LINE Webhook events
   * Blueprint §33: POST /webhooks/line
   */
  async handleWebhookEvents(events: any[]): Promise<void> {
    for (const event of events) {
      this.logger.log(`📩 LINE Webhook event: ${event.type} from ${event.source?.userId}`);

      switch (event.type) {
        case 'follow':
          this.logger.log(`👤 New follower: ${event.source?.userId}`);
          // Future: welcome message, register customer
          break;

        case 'unfollow':
          this.logger.log(`👤 Unfollowed: ${event.source?.userId}`);
          break;

        case 'message':
          if (event.message?.type === 'text') {
            this.logger.log(`💬 Message from ${event.source?.userId}: ${event.message.text}`);
          }
          break;

        default:
          this.logger.debug(`Unhandled LINE event type: ${event.type}`);
      }
    }
  }

  /**
   * Send Push Message to a LINE user (blueprint §30)
   */
  async sendPushMessage(lineUserId: string, text: string): Promise<boolean> {
    if (!this.channelAccessToken || !lineUserId) {
      this.logger.warn(`LINE Push skipped — no token or userId: [${lineUserId}]`);
      return false;
    }

    try {
      const { default: axios } = await import('axios');
      await axios.post(
        'https://api.line.me/v2/bot/message/push',
        {
          to: lineUserId,
          messages: [{ type: 'text', text }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
        },
      );
      this.logger.log(`✅ LINE Push sent to: ${lineUserId}`);
      return true;
    } catch (error: any) {
      this.logger.error('Failed to send LINE Push', error.response?.data || error.message);
      return false;
    }
  }
}
