import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { CartService, AddItemToCartDto, UpdateCartItemDto } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Cart')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart with computed prices and availability' })
  async getCart(
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart with backend price calculation and availability check' })
  async addItem(
    @Req() req: Request,
    @Body() dto: AddItemToCartDto,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.addItem(userId, {
      ...dto,
    });
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity or note' })
  async updateItem(
    @Req() req: Request,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.updateItem(itemId, dto, userId);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @Req() req: Request,
    @Param('id') itemId: string,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.removeItem(itemId, userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  async clearCart(
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.cartService.clearCart(userId);
  }
}
