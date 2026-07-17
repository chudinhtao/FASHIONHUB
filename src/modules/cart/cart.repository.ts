import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        variant: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: {
                    isPrimary: 'desc',
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findByUserAndVariant(userId: string, variantId: string) {
    return this.prisma.cartItem.findUnique({
      where: {
        userId_variantId: {
          userId,
          variantId,
        },
      },
    });
  }

  async upsert(userId: string, variantId: string, quantity: number) {
    return this.prisma.cartItem.upsert({
      where: {
        userId_variantId: {
          userId,
          variantId,
        },
      },
      update: {
        quantity,
      },
      create: {
        userId,
        variantId,
        quantity,
      },
    });
  }

  async updateQuantity(id: string, quantity: number) {
    return this.prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });
  }

  async delete(id: string) {
    return this.prisma.cartItem.delete({
      where: { id },
    });
  }

  async clear(userId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { userId },
    });
  }
}
