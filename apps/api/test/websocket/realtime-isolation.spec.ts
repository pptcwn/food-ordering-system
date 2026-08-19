import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from '../../src/websocket/events.gateway';
import { WsJwtGuard } from '../../src/websocket/ws-jwt.guard';
import { UserRole } from '@food-ordering/types';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Realtime Isolation (Phase 05)', () => {
  let gateway: EventsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    gateway.server = { 
      to: jest.fn().mockReturnValue({ emit: jest.fn() }), 
      emit: jest.fn() 
    } as any;
  });

  describe('Connection Authorization', () => {
    it('should reject unauthorized socket connection silently by returning denied', async () => {
      // Create a mock socket without a valid user
      const mockClient = {
        id: 'socket-123',
        join: jest.fn(),
        data: { user: { role: UserRole.CUSTOMER, branchId: 'different-branch' } },
      } as any;

      const result = gateway.handleJoinBranch(mockClient, { branchId: 'target-branch' });
      
      expect(result).toEqual({ status: 'denied', reason: 'Unauthorized for this branch' });
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should allow BRANCH_MANAGER to join their own branch', () => {
      const mockClient = {
        id: 'socket-123',
        join: jest.fn(),
        data: { user: { role: UserRole.BRANCH_MANAGER, branchId: 'my-branch-id' } },
      } as any;

      const result = gateway.handleJoinBranch(mockClient, { branchId: 'my-branch-id' });
      
      expect(result).toEqual({ status: 'joined', room: 'branch_my-branch-id' });
      expect(mockClient.join).toHaveBeenCalledWith('branch_my-branch-id');
    });

    it('should allow SUPER_ADMIN to join ANY branch', () => {
      const mockClient = {
        id: 'socket-123',
        join: jest.fn(),
        data: { user: { role: UserRole.SUPER_ADMIN, branchId: null } },
      } as any;

      const result = gateway.handleJoinKitchen(mockClient, { branchId: 'some-branch' });
      
      expect(result).toEqual({ status: 'joined', room: 'kitchen_some-branch' });
      expect(mockClient.join).toHaveBeenCalledWith('kitchen_some-branch');
    });
  });

  describe('Event Routing Isolation', () => {
    it('should NOT broadcast globally when OrderStatus changes', () => {
      const payload = { orderId: 'ord-1', orderNo: '123', status: 'READY', branchId: 'branch-1' } as any;
      gateway.emitOrderStatusChanged(payload);
      
      // server.emit (global) should NOT be called
      expect((gateway.server as any).emit).not.toHaveBeenCalled();
      
      // server.to(room).emit should be called
      expect(gateway.server.to).toHaveBeenCalledWith('branch_branch-1');
      expect(gateway.server.to).toHaveBeenCalledWith('kitchen_branch-1');
      expect(gateway.server.to).toHaveBeenCalledWith('order_ord-1');
    });
  });
});
