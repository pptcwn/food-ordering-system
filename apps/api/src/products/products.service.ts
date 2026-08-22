import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { CreateProductDtoType as CreateProductDto, UpdateProductDtoType as UpdateProductDto } from '@food-ordering/validation';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Get full menu grouped by categories for a specific branch
   */
  async getMenu(branchId?: string) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: {
            isActive: true,
            OR: [
              { branchId: null },
              ...(branchId ? [{ branchId }] : []),
            ],
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            variants: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
            modifierGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                modifierGroup: {
                  include: {
                    modifiers: {
                      orderBy: { sortOrder: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return categories.map((cat) => ({
      ...cat,
      products: cat.products.map((p) => ({
        ...p,
        modifierGroups: p.modifierGroups.map((pmg) => pmg.modifierGroup),
      })),
    }));
  }

  /**
   * Get product details with variants and modifiers
   */
  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            modifierGroup: {
              include: {
                modifiers: {
                  where: { isAvailable: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or unavailable');
    }

    return {
      ...product,
      modifierGroups: product.modifierGroups.map((pmg) => pmg.modifierGroup),
    };
  }

  /**
   * Realtime Product Availability / Sold-Out Toggle
   */
  async updateAvailability(id: string, isAvailable: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isAvailable },
    });

    // Broadcast Realtime WebSocket event to all LIFF clients & Kitchen Dashboards
    this.eventsGateway.emitProductAvailabilityChanged({
      productId: updated.id,
      branchId: updated.branchId || '',
      isAvailable: updated.isAvailable,
    });

    this.logger.log(` Product ${updated.name} availability set to: ${isAvailable ? 'AVAILABLE' : 'SOLD OUT'}`);

    return updated;
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        branchId: dto.branchId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        basePrice: dto.basePrice,
        salePrice:
          dto.salePrice !== undefined &&
          dto.salePrice !== null &&
          dto.salePrice < dto.basePrice
            ? dto.salePrice
            : null,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : true,
        sortOrder: dto.sortOrder || 0,
        variants: dto.variants
          ? {
              create: dto.variants.map((v, i) => ({
                name: v.name,
                price: v.price,
                isDefault: v.isDefault || false,
                sortOrder: i + 1,
              })),
            }
          : undefined,
        modifierGroups: dto.modifierGroupIds
          ? {
              create: dto.modifierGroupIds.map((mgId, idx) => ({
                modifierGroupId: mgId,
                sortOrder: idx + 1,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
        modifierGroups: {
          include: { modifierGroup: true },
        },
      },
    });

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { variants, modifierGroupIds, branchId, ...updateData } = dto;
    
    // Convert undefined to null or omit for Prisma depending on schema, but omit is safer
    const dataToUpdate: any = { ...updateData };
    if (branchId !== undefined) dataToUpdate.branchId = branchId;
    if (dto.salePrice !== undefined || dto.basePrice !== undefined) {
      const nextBasePrice = dto.basePrice ?? Number(product.basePrice);
      const nextSalePrice =
        dto.salePrice === null
          ? undefined
          : dto.salePrice ??
            (product.salePrice === null ? undefined : Number(product.salePrice));

      dataToUpdate.salePrice =
        nextSalePrice !== undefined && nextSalePrice < nextBasePrice
          ? nextSalePrice
          : null;
    }

    return this.prisma.product.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
