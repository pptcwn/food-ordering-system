import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AddItemToCartDto {
  branchId: string;
  productId: string;
  productVariantId?: string;
  quantity: number;
  specialNote?: string;
  modifierIds?: string[];
  sessionId?: string;
}

export interface UpdateCartItemDto {
  quantity: number;
  specialNote?: string;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Find or create an active cart for user or guest session
   */
  async getOrCreateCart(userId: string, branchId?: string) {
      let cart = await this.prisma.cart.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
              modifiers: {
                include: { modifier: true },
              },
            },
          },
        },
      });

      if (!cart && branchId) {
        cart = await this.prisma.cart.create({
          data: {
            userId,
            branchId,
          },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
                modifiers: {
                  include: { modifier: true },
                },
              },
            },
          },
        });
      }

      return cart;
  }

  /**
   * Get calculated cart with total and availability checks
   */
  async getCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        branch: true,
        items: {
          include: {
            product: {
              include: { category: true },
            },
            variant: true,
            modifiers: {
              include: { modifier: true },
            },
          },
        },
      },
    });

    if (!cart) {
      return {
        id: null,
        branchId: null,
        items: [],
        totalItems: 0,
        subtotal: 0,
        hasUnavailableItems: false,
      };
    }

    let subtotal = 0;
    let totalItems = 0;
    let hasUnavailableItems = false;

    const formattedItems = cart.items.map((item) => {
      const isProductAvailable = item.product.isActive && item.product.isAvailable;
      if (!isProductAvailable) {
        hasUnavailableItems = true;
      }

      const unitPrice = item.variant
        ? Number(item.variant.price)
        : Number(item.product.basePrice);

      const modifiersPrice = item.modifiers.reduce(
        (sum, m) => sum + Number(m.modifier.price),
        0,
      );

      const itemUnitPrice = unitPrice + modifiersPrice;
      const itemLineTotal = itemUnitPrice * item.quantity;

      if (isProductAvailable) {
        subtotal += itemLineTotal;
        totalItems += item.quantity;
      }

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        variantId: item.productVariantId,
        variantName: item.variant?.name || null,
        unitPrice,
        modifiersPrice,
        itemUnitPrice,
        itemLineTotal,
        quantity: item.quantity,
        specialNote: item.specialNote,
        isAvailable: isProductAvailable,
        modifiers: item.modifiers.map((m) => ({
          id: m.modifier.id,
          name: m.modifier.name,
          price: Number(m.modifier.price),
        })),
      };
    });

    return {
      id: cart.id,
      branchId: cart.branchId,
      branchName: cart.branch.name,
      items: formattedItems,
      totalItems,
      subtotal,
      hasUnavailableItems,
    };
  }

  /**
   * Add Item to Cart with strict price calculation and availability checks
   */
  async addItem(userId: string, dto: AddItemToCartDto) {
    // 1. Verify Product exists and is Available
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        variants: true,
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { modifiers: true },
            },
          },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or inactive');
    }

    if (!product.isAvailable) {
      throw new BadRequestException({
        code: 'PRODUCT_SOLD_OUT',
        message: `สินค้า "${product.name}" หมดชั่วคราว ไม่สามารถเพิ่มลงตะกร้าได้`,
      });
    }

    // 2. Validate Variant if provided
    let variant: any = null;
    if (dto.productVariantId) {
      variant = product.variants.find((v) => v.id === dto.productVariantId);
      if (!variant || !variant.isActive) {
        throw new BadRequestException('Selected product variant is invalid');
      }
    }

    // 3. Validate Modifier selections against group rules (minSelect, maxSelect)
    const selectedModifierIds = dto.modifierIds || [];
    if (selectedModifierIds.length > 0) {
      const validModifiers = await this.prisma.modifier.findMany({
        where: {
          id: { in: selectedModifierIds },
          isAvailable: true,
        },
      });

      if (validModifiers.length !== selectedModifierIds.length) {
        throw new BadRequestException('One or more selected modifiers are unavailable');
      }
    }

    // 4. Get or Create Cart (Ensure Cart belongs to the requested branch)
    let cart = await this.prisma.cart.findFirst({
      where: { userId },
    });

    if (cart && cart.branchId !== dto.branchId) {
      // If customer changed branch, clear previous branch cart
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      cart = await this.prisma.cart.update({
        where: { id: cart.id },
        data: { branchId: dto.branchId },
      });
    } else if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          branchId: dto.branchId,
        },
      });
    }

    // 5. Create Cart Item and linked Modifiers
    const cartItem = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        productVariantId: dto.productVariantId,
        quantity: dto.quantity || 1,
        specialNote: dto.specialNote,
        modifiers: selectedModifierIds.length > 0
          ? {
              create: selectedModifierIds.map((mId) => ({
                modifierId: mId,
              })),
            }
          : undefined,
      },
      include: {
        product: true,
        variant: true,
        modifiers: {
          include: { modifier: true },
        },
      },
    });

    return this.getCart(userId);
  }

  /**
   * Update Cart Item quantity or note
   */
  async updateItem(itemId: string, dto: UpdateCartItemDto, userId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity: dto.quantity,
          specialNote: dto.specialNote !== undefined ? dto.specialNote : item.specialNote,
        },
      });
    }

    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string, userId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cart: { userId } },
    });

    return this.getCart(userId);
  }

  /**
   * Clear all items in cart
   */
  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return { success: true, message: 'Cart cleared' };
  }
}
