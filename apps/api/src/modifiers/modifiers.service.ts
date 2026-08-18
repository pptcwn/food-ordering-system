import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateModifierGroupDto {
  name: string;
  minSelect?: number;
  maxSelect?: number;
  isRequired?: boolean;
  modifiers?: { name: string; price: number; sortOrder?: number }[];
}

@Injectable()
export class ModifiersService {
  constructor(private prisma: PrismaService) {}

  async findAllGroups() {
    return this.prisma.modifierGroup.findMany({
      include: {
        modifiers: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findGroupById(id: string) {
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id },
      include: {
        modifiers: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Modifier group not found');
    }

    return group;
  }

  async createGroup(dto: CreateModifierGroupDto) {
    return this.prisma.modifierGroup.create({
      data: {
        name: dto.name,
        minSelect: dto.minSelect || 0,
        maxSelect: dto.maxSelect || 1,
        isRequired: dto.isRequired || false,
        modifiers: dto.modifiers
          ? {
              create: dto.modifiers.map((m, idx) => ({
                name: m.name,
                price: m.price,
                sortOrder: m.sortOrder || idx + 1,
              })),
            }
          : undefined,
      },
      include: {
        modifiers: true,
      },
    });
  }
}
