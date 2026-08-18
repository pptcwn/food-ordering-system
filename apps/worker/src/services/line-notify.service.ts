import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class LineNotifyService {
  private readonly logger = new Logger(LineNotifyService.name);
  private readonly channelAccessToken: string;

  constructor(private configService: ConfigService) {
    this.channelAccessToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN', '');
  }

  /**
   * Send Push Message to LINE User via Messaging API
   */
  async sendPushMessage(lineUserId: string, text: string): Promise<boolean> {
    if (!this.channelAccessToken || !lineUserId) {
      this.logger.warn(`LINE Push skipped (Token missing or no lineUserId): [${lineUserId}] ${text}`);
      return false;
    }

    try {
      await axios.post(
        'https://api.line.me/v2/bot/message/push',
        {
          to: lineUserId,
          messages: [
            {
              type: 'text',
              text,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
        },
      );
      this.logger.log(` LINE Push sent to user: ${lineUserId}`);
      return true;
    } catch (error: any) {
      this.logger.error('Failed to send LINE Push Message', error.response?.data || error.message);
      return false;
    }
  }
}
