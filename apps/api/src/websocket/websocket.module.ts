import { Global, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';
import { WsJwtGuard } from './ws-jwt.guard';

@Global()
@Module({
  imports: [AuthModule],
  providers: [EventsGateway, WsJwtGuard],
  exports: [EventsGateway],
})
export class WebsocketModule {}
