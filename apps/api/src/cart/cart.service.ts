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

  private normalizeSpecialNote(note?: string | null) {
    return note?.trim() || '';
  }

  private hasSameModifiers(
    cartItemModifiers: Array<{ modifierId: string }>,
    selectedModifierIds: string[],
  ) {
    if (cartItemModifiers.length !== selectedModifierIds.length) {
      return false;
    }

    const existingIds = cartItemModifiers.map((modifier) => modifier.modifierId).sort();
    const selectedIds = [...selectedModifierIds].sort();
    return existingIds.every((modifierId, index) => modifierId === selectedIds[index]);
  }

  private cartItemSignature(item: {
    productId: string;
    productVariantId: string | null;
    specialNote: string | null;
    modifiers: Array<{ modifierId: string }>;
  }) {
    const modifierIds = item.modifiers.map((modifier) => modifier.modifierId).sort();
    return [
      item.productId,
      item.productVariantId || '',
      this.normalizeSpecialNote(item.specialNote),
      modifierIds.join(','),
    ].join('|');
  }

  private async findMatchingCartItems(cartItemId: string, userId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      include: { modifiers: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const candidates = await this.prisma.cartItem.findMany({
      where: {
        cartId: item.cartId,
        productId: item.productId,
        productVariantId: item.productVariantId,
      },
      include: { modifiers: true },
    });
    const signature = this.cartItemSignature(item);
    return candidates.filter((candidate) => this.cartItemSignature(candidate) === signature);
  }

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

    // Older carts can contain duplicate rows from the previous add-item behavior.
    // Group them for display until the next cart mutation consolidates them in storage.
    const groupedItems = new Map<string, (typeof cart.items)[number]>();
    for (const item of cart.items) {
      const signature = this.cartItemSignature(item);
      const existingItem = groupedItems.get(signature);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        groupedItems.set(signature, { ...item });
      }
    }

    const formattedItems = [...groupedItems.values()].map((item) => {
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

    // 5. Merge identical selections into one line item. Different notes, variants,
    // or modifier sets stay separate so kitchen instructions are preserved.
    const matchingItems = await this.prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        productVariantId: dto.productVariantId ?? null,
      },
      include: { modifiers: true },
      orderBy: { createdAt: 'asc' },
    });
    const identicalItems = matchingItems.filter(
      (item) =>
        this.normalizeSpecialNote(item.specialNote) === this.normalizeSpecialNote(dto.specialNote) &&
        this.hasSameModifiers(item.modifiers, selectedModifierIds),
    );

    if (identicalItems.length > 0) {
      const [itemToKeep, ...duplicates] = identicalItems;
      const mergedQuantity = identicalItems.reduce((sum, item) => sum + item.quantity, 0) + (dto.quantity || 1);

      await this.prisma.$transaction([
        this.prisma.cartItem.update({
          where: { id: itemToKeep.id },
          data: { quantity: mergedQuantity },
        }),
        ...duplicates.map((item) => this.prisma.cartItem.delete({ where: { id: item.id } })),
      ]);

      return this.getCart(userId);
    }

    // 6. Create Cart Item and linked Modifiers when no matching selection exists.
    await this.prisma.cartItem.create({
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
    const matchingItems = await this.findMatchingCartItems(itemId, userId);
    const [itemToKeep, ...duplicates] = matchingItems;

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.deleteMany({
        where: { id: { in: matchingItems.map((item) => item.id) } },
      });
    } else {
      await this.prisma.$transaction([
        this.prisma.cartItem.update({
          where: { id: itemToKeep.id },
          data: {
            quantity: dto.quantity,
            specialNote: dto.specialNote !== undefined ? dto.specialNote : itemToKeep.specialNote,
          },
        }),
        ...duplicates.map((item) => this.prisma.cartItem.delete({ where: { id: item.id } })),
      ]);
    }

    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string, userId: string) {
    const matchingItems = await this.findMatchingCartItems(itemId, userId);
    await this.prisma.cartItem.deleteMany({
      where: { id: { in: matchingItems.map((item) => item.id) } },
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
