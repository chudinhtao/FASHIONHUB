import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getCart(userId: string) {
    return this.cartRepository.findByUserId(userId);
  }

  async addItem(userId: string, variantId: string, quantity: number) {
    if (quantity < 1) {
      throw new BadRequestException('Số lượng phải lớn hơn hoặc bằng 1');
    }

    // 1. Kiểm tra variant tồn tại
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Biến thể sản phẩm không tồn tại');
    }

    // 2. Tìm xem sản phẩm đã có trong giỏ hàng chưa
    const existingItem = await this.cartRepository.findByUserAndVariant(userId, variantId);

    const targetQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    // Lưu ý: Chúng ta cho phép lưu giỏ hàng vượt quá tồn kho (Merge stock warning),
    // việc chặn giao dịch thực tế sẽ diễn ra tại thời điểm checkout (Pha 2).
    return this.cartRepository.upsert(userId, variantId, targetQuantity);
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    if (quantity < 1) {
      throw new BadRequestException('Số lượng phải lớn hơn hoặc bằng 1');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!cartItem) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    if (cartItem.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa giỏ hàng này');
    }

    return this.cartRepository.updateQuantity(itemId, quantity);
  }

  async removeItem(userId: string, itemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!cartItem) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    if (cartItem.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa sản phẩm khỏi giỏ hàng này');
    }

    return this.cartRepository.delete(itemId);
  }

  async clearCart(userId: string) {
    return this.cartRepository.clear(userId);
  }
}
