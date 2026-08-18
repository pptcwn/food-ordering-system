import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WS_EVENTS, ProductAvailabilityPayload, OrderStatusChangedPayload } from '@food-ordering/types';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`⚡ Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`⚡ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (data?.branchId) {
      client.join(`branch_${data.branchId}`);
      this.logger.log(`Client ${client.id} joined room: branch_${data.branchId}`);
      return { status: 'joined', room: `branch_${data.branchId}` };
    }
  }

  @SubscribeMessage('join_kitchen')
  handleJoinKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (data?.branchId) {
      client.join(`kitchen_${data.branchId}`);
      this.logger.log(`Client ${client.id} joined kitchen room: kitchen_${data.branchId}`);
      return { status: 'joined', room: `kitchen_${data.branchId}` };
    }
  }

  // ----------------------------------------------------
  // Emit Helper Methods
  // ----------------------------------------------------

  emitProductAvailabilityChanged(payload: ProductAvailabilityPayload) {
    this.server.emit(WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED, payload);
    if (payload.branchId) {
      this.server.to(`branch_${payload.branchId}`).emit(WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED, payload);
    }
    this.logger.log(`📢 Broadcasted ${WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED}: Product ${payload.productId} isAvailable=${payload.isAvailable}`);
  }

  emitKitchenNewOrder(branchId: string, orderData: any) {
    this.server.to(`kitchen_${branchId}`).emit(WS_EVENTS.KITCHEN_NEW_ORDER, orderData);
    this.server.emit(WS_EVENTS.ORDER_CREATED, orderData);
    this.logger.log(`📢 Broadcasted ${WS_EVENTS.KITCHEN_NEW_ORDER} to branch_${branchId}`);
  }

  emitOrderStatusChanged(payload: OrderStatusChangedPayload) {
    this.server.emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
    if (payload.branchId) {
      this.server.to(`branch_${payload.branchId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
      this.server.to(`kitchen_${payload.branchId}`).emit(WS_EVENTS.KITCHEN_ORDER_UPDATED, payload);
    }
    this.logger.log(`📢 Broadcasted ${WS_EVENTS.ORDER_STATUS_CHANGED}: Order ${payload.orderNo} -> ${payload.status}`);
  }
}
