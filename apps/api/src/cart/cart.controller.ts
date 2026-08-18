import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { CartService, AddItemToCartDto, UpdateCartItemDto } from './cart.service';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart with computed prices and availability' })
  @ApiHeader({ name: 'x-session-id', required: false })
  async getCart(
    @Req() req: Request,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.getCart(userId, sessionId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart with backend price calculation and availability check' })
  @ApiHeader({ name: 'x-session-id', required: false })
  async addItem(
    @Req() req: Request,
    @Body() dto: AddItemToCartDto,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.addItem(userId, {
      ...dto,
      sessionId: dto.sessionId || sessionId,
    });
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity or note' })
  @ApiHeader({ name: 'x-session-id', required: false })
  async updateItem(
    @Req() req: Request,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.updateItem(itemId, dto, userId, sessionId);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiHeader({ name: 'x-session-id', required: false })
  async removeItem(
    @Req() req: Request,
    @Param('id') itemId: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.removeItem(itemId, userId, sessionId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiHeader({ name: 'x-session-id', required: false })
  async clearCart(
    @Req() req: Request,
    @Headers('x-session-id') sessionId?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.clearCart(userId, sessionId);
  }
}
