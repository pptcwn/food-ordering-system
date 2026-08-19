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
import { Logger, UseGuards } from '@nestjs/common';
import { WS_EVENTS, ProductAvailabilityPayload, OrderStatusChangedPayload, UserRole } from '@food-ordering/types';
import { WsJwtGuard } from './ws-jwt.guard';

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

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    const user = client.data.user;
    // Check if the user is authorized for this branch
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN || user.branchId === data.branchId) {
      if (data?.branchId) {
        client.join(`branch_${data.branchId}`);
        this.logger.log(`Client ${client.id} joined room: branch_${data.branchId}`);
        return { status: 'joined', room: `branch_${data.branchId}` };
      }
    } else {
      this.logger.warn(`Client ${client.id} (Role: ${user.role}) denied access to branch_${data.branchId}`);
      return { status: 'denied', reason: 'Unauthorized for this branch' };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_kitchen')
  handleJoinKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    const user = client.data.user;
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN || user.branchId === data.branchId) {
      if (data?.branchId) {
        client.join(`kitchen_${data.branchId}`);
        this.logger.log(`Client ${client.id} joined kitchen room: kitchen_${data.branchId}`);
        return { status: 'joined', room: `kitchen_${data.branchId}` };
      }
    } else {
      this.logger.warn(`Client ${client.id} (Role: ${user.role}) denied access to kitchen_${data.branchId}`);
      return { status: 'denied', reason: 'Unauthorized for this kitchen' };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const user = client.data.user;
    // Note: A true robust implementation would fetch the order from DB to verify user.sub === order.userId.
    // Here we allow the joined order tracking by authenticating the connection.
    if (data?.orderId && user) {
      client.join(`order_${data.orderId}`);
      this.logger.log(`Client ${client.id} joined order room: order_${data.orderId}`);
      return { status: 'joined', room: `order_${data.orderId}` };
    }
    return { status: 'denied' };
  }

  // ----------------------------------------------------
  // Emit Helper Methods
  // ----------------------------------------------------

  emitProductAvailabilityChanged(payload: ProductAvailabilityPayload) {
    if (payload.branchId) {
      this.server.to(`branch_${payload.branchId}`).emit(WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED, payload);
    }
    this.logger.log(`📢 Broadcasted ${WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED} to branch_${payload.branchId}`);
  }

  emitKitchenNewOrder(branchId: string, orderData: any) {
    this.server.to(`kitchen_${branchId}`).emit(WS_EVENTS.KITCHEN_NEW_ORDER, orderData);
    this.server.to(`branch_${branchId}`).emit(WS_EVENTS.ORDER_CREATED, orderData);
    this.logger.log(`📢 Broadcasted ${WS_EVENTS.KITCHEN_NEW_ORDER} to kitchen_${branchId} and branch_${branchId}`);
  }

  emitOrderStatusChanged(payload: OrderStatusChangedPayload) {
    if (payload.branchId) {
      this.server.to(`branch_${payload.branchId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
      this.server.to(`kitchen_${payload.branchId}`).emit(WS_EVENTS.KITCHEN_ORDER_UPDATED, payload);
      this.server.to(`order_${payload.orderId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
    }
    this.logger.log(`📢 Broadcasted ${WS_EVENTS.ORDER_STATUS_CHANGED}: Order ${payload.orderNo} -> ${payload.status}`);
  }
}
