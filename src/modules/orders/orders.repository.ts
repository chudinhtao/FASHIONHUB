import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Order, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

export interface CheckoutInput {
  recipientName: string;
  phone: string;
  shippingAddress: string;
  notes?: string;
  items?: Array<{ variantId: string; quantity: number }>;
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: string | null, input: CheckoutInput): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      let cartItems: any[] = [];

      if (userId) {
        // 1. Lấy toàn bộ sản phẩm trong giỏ hàng từ DB
        const dbCartItems = await tx.cartItem.findMany({
          where: { userId },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        });
        cartItems = dbCartItems;
      } else {
        // 1. Lấy thông tin sản phẩm từ danh sách items gửi kèm (Khách vãng lai)
        if (!input.items || input.items.length === 0) {
          throw new BadRequestException('Giỏ hàng trống, không thể thanh toán.');
        }
        for (const item of input.items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: {
              product: true,
            },
          });
          if (!variant) {
            throw new NotFoundException(`Biến thể sản phẩm không tồn tại.`);
          }
          cartItems.push({
            variantId: item.variantId,
            quantity: item.quantity,
            variant,
          });
        }
      }

      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestException('Giỏ hàng trống, không thể thanh toán.');
      }

      // 2. Kiểm tra tồn kho và trừ kho
      for (const item of cartItems) {
        if (item.quantity > item.variant.stock) {
          throw new BadRequestException(
            `Sản phẩm "${item.variant.product.name}" (Size: ${item.variant.size || 'M'}) chỉ còn ${item.variant.stock} sản phẩm trong kho. Vui lòng cập nhật lại giỏ hàng.`,
          );
        }
      }

      // Cập nhật trừ kho cho từng biến thể
      for (const item of cartItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 3. Tính toán tổng tiền
      const subtotal = cartItems.reduce((sum, item) => {
        const price = Number(item.variant.product.price);
        return sum + price * item.quantity;
      }, 0);
      const shippingFee = 30000; // Flat shipping rate
      const totalAmount = subtotal + shippingFee;

      // 4. Sinh mã đơn hàng ngẫu nhiên duy nhất
      const year = new Date().getFullYear();
      const random = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `FH-${year}-${random}`;

      // 5. Tạo đơn hàng mới
      const order = await tx.order.create({
        data: {
          userId,
          orderNumber,
          recipientName: input.recipientName,
          phone: input.phone,
          shippingAddress: input.shippingAddress,
          notes: input.notes,
          totalAmount: new Prisma.Decimal(totalAmount),
          status: OrderStatus.PENDING,
          paymentMethod: 'COD',
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      // 6. Tạo danh sách sản phẩm trong đơn hàng (lưu giá tại thời điểm mua)
      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          orderId: order.id,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.variant.product.price,
        })),
      });

      // 7. Xóa sạch giỏ hàng của người dùng (nếu có tài khoản)
      if (userId) {
        await tx.cartItem.deleteMany({
          where: { userId },
        });
      }

      return order;
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
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
        },
      },
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
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
        },
      },
    });
  }

  async findManyByUserId(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ orders: any[]; total: number }> {
    const where: Prisma.OrderWhereInput = { userId };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
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
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async updateOrder(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  async cancelOrder(id: string): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra đơn hàng có tồn tại và đang ở trạng thái PENDING
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng cần hủy.');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể hủy đơn hàng khi trạng thái là PENDING.');
      }

      // 2. Cập nhật trạng thái đơn thành CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });

      // 3. Hoàn kho lại cho các biến thể sản phẩm
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      return updatedOrder;
    });
  }

  async findManyAdmin(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: OrderStatus;
  }): Promise<{ orders: any[]; total: number }> {
    const { skip, take, search, status } = params;
    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }
}
