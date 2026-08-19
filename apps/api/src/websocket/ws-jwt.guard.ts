import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth?.token;

    if (!token) {
      this.logger.warn(`Rejecting connection: No token provided (Client: ${client.id})`);
      return false;
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      // Attach the user to the socket object
      client.data.user = payload;
      return true;
    } catch (err) {
      this.logger.warn(`Rejecting connection: Invalid token (Client: ${client.id}) - ${(err as Error).message}`);
      return false;
    }
  }
}
