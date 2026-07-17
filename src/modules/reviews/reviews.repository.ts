import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Review } from '@prisma/client';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    productId: string,
    rating: number,
    comment?: string,
    images: string[] = [],
  ): Promise<Review> {
    return this.prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment,
        images,
        isActive: true,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async findByProduct(productId: string, skip = 0, limit = 5): Promise<any[]> {
    return this.prisma.review.findMany({
      where: {
        productId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });
  }

  async countByProduct(productId: string): Promise<number> {
    return this.prisma.review.count({
      where: {
        productId,
        isActive: true,
      },
    });
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    return this.prisma.review.findFirst({
      where: {
        userId,
        productId,
        isActive: true,
      },
    });
  }

  async checkPurchased(userId: string, productId: string): Promise<boolean> {
    const count = await this.prisma.order.count({
      where: {
        userId,
        status: 'DELIVERED',
        items: {
          some: {
            variant: {
              productId,
            },
          },
        },
      },
    });
    return count > 0;
  }

  async softDelete(reviewId: string): Promise<Review> {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isActive: false },
    });
  }

  async findById(reviewId: string): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { id: reviewId },
    });
  }

  async productExists(productId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id: productId },
    });
    return count > 0;
  }

  async getStats(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        productId,
        isActive: true,
      },
      select: {
        rating: true,
      },
    });

    const total = reviews.length;
    let sum = 0;
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

    for (const r of reviews) {
      sum += r.rating;
      const star = r.rating.toString() as '1' | '2' | '3' | '4' | '5';
      if (distribution[star] !== undefined) {
        distribution[star]++;
      }
    }

    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    return {
      averageRating: average,
      totalReviews: total,
      distribution,
    };
  }
}
