import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(range: string, startDateStr?: string, endDateStr?: string) {
    let startDate = new Date();
    let endDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '7days') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === 'custom' && startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      // Default to 30 days
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // 1. Get stats
    const totalProducts = await this.prisma.product.count();
    const totalCategories = await this.prisma.category.count();

    const ordersAggregation = await this.prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      where: {
        paymentStatus: 'PAID',
        status: {
          notIn: ['CANCELLED', 'RETURNED'],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalSales = ordersAggregation._sum.totalAmount?.toString() || '0.00';
    const totalOrders = ordersAggregation._count.id || 0;

    // 2. Generate daily chart data for the range using raw query
    const rawChartData = await this.prisma.$queryRaw<
      { date: string; sales: number; orders: number }[]
    >`
      SELECT 
        TO_CHAR(o."createdAt", 'YYYY-MM-DD') as "date",
        COALESCE(SUM(o."totalAmount"), 0)::float as "sales",
        COUNT(o.id)::int as "orders"
      FROM orders o
      WHERE 
        o."paymentStatus" = 'PAID'
        AND o.status NOT IN ('CANCELLED', 'RETURNED')
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
      GROUP BY TO_CHAR(o."createdAt", 'YYYY-MM-DD')
      ORDER BY "date" ASC
    `;

    const chartDataMap = new Map<string, { date: string; sales: number; orders: number }>();
    rawChartData.forEach((row) => {
      chartDataMap.set(row.date, {
        date: row.date,
        sales: row.sales,
        orders: row.orders,
      });
    });

    const chartData: { date: string; sales: number; orders: number }[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const val = chartDataMap.get(dateStr) || { date: dateStr, sales: 0, orders: 0 };
      chartData.push(val);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      stats: {
        totalSales,
        totalOrders,
        totalProducts,
        totalCategories,
      },
      chartData,
    };
  }

  async getTopProducts() {
    const groupedItems = await this.prisma.orderItem.groupBy({
      by: ['variantId'],
      _sum: {
        quantity: true,
      },
      where: {
        order: {
          status: {
            notIn: ['CANCELLED', 'RETURNED'],
          },
        },
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    const topProducts: { id: string; name: string; soldQuantity: number; revenue: string; image: string }[] = [];
    for (const item of groupedItems) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      if (variant) {
        const product = variant.product;
        const soldQuantity = item._sum.quantity || 0;
        const revenue = (Number(product.price) * soldQuantity).toFixed(2);
        const imageUrl = product.images[0]?.url || '';

        const existing = topProducts.find((p) => p.id === product.id);
        if (existing) {
          existing.soldQuantity += soldQuantity;
          existing.revenue = (Number(existing.revenue) + Number(revenue)).toFixed(2);
        } else {
          topProducts.push({
            id: product.id,
            name: product.name,
            soldQuantity,
            revenue,
            image: imageUrl,
          });
        }
      }
    }

    return topProducts.sort((a, b) => b.soldQuantity - a.soldQuantity).slice(0, 5);
  }

  async getRecentActivities() {
    const recentOrders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentReviews = await this.prisma.review.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        product: true,
      },
    });

    const recentProducts = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const activities: { id: string; type: string; text: string; createdAt: Date }[] = [];

    recentOrders.forEach((o) => {
      activities.push({
        id: `order-${o.id}`,
        type: 'ORDER',
        text: `Đơn hàng mới #${o.orderNumber} vừa được tạo bởi ${o.recipientName}`,
        createdAt: o.createdAt,
      });
    });

    recentReviews.forEach((r) => {
      activities.push({
        id: `review-${r.id}`,
        type: 'REVIEW',
        text: `Đánh giá ${r.rating} sao cho sản phẩm ${r.product.name}`,
        createdAt: r.createdAt,
      });
    });

    recentProducts.forEach((p) => {
      activities.push({
        id: `product-${p.id}`,
        type: 'PRODUCT',
        text: `Sản phẩm mới ${p.name} vừa được thêm vào hệ thống`,
        createdAt: p.createdAt,
      });
    });

    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }
}
