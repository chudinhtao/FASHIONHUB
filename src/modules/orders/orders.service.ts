import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrdersRepository, CheckoutInput } from './orders.repository';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async checkout(userId: string | null, input: CheckoutInput) {
    if (!input.recipientName || input.recipientName.length < 2) {
      throw new BadRequestException('Họ tên người nhận phải từ 2 ký tự trở lên.');
    }
    if (!/^(03|05|07|08|09)\d{8}$/.test(input.phone)) {
      throw new BadRequestException('Số điện thoại không hợp lệ (yêu cầu 10 số, bắt đầu bằng 03/05/07/08/09).');
    }
    if (!input.shippingAddress || input.shippingAddress.length < 10) {
      throw new BadRequestException('Địa chỉ nhận hàng chi tiết phải từ 10 ký tự trở lên.');
    }

    return this.ordersRepository.checkout(userId, input);
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const { orders, total } = await this.ordersRepository.findManyByUserId(userId, skip, limitNum);
    const totalPages = Math.ceil(total / limitNum);

    return {
      data: orders,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  }

  async getDetail(userId: string | null, userRole: Role | null, idOrOrderNumber: string) {
    let order = await this.ordersRepository.findById(idOrOrderNumber);
    if (!order) {
      order = await this.ordersRepository.findByOrderNumber(idOrOrderNumber);
    }

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    // Kiểm tra quyền: Chỉ chủ đơn hàng hoặc Admin mới được xem (đơn hàng của user)
    if (order.userId && userRole !== Role.ADMIN && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập thông tin đơn hàng này.');
    }

    return order;
  }

  async updateAddress(
    userId: string | null,
    orderId: string,
    addressData: { recipientName: string; phone: string; shippingAddress: string },
  ) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng này.');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể cập nhật thông tin địa chỉ khi trạng thái đơn hàng là PENDING.');
    }

    if (!addressData.recipientName || addressData.recipientName.length < 2) {
      throw new BadRequestException('Họ tên người nhận phải từ 2 ký tự trở lên.');
    }
    if (!/^(03|05|07|08|09)\d{8}$/.test(addressData.phone)) {
      throw new BadRequestException('Số điện thoại không hợp lệ.');
    }
    if (!addressData.shippingAddress || addressData.shippingAddress.length < 10) {
      throw new BadRequestException('Địa chỉ nhận hàng chi tiết phải từ 10 ký tự trở lên.');
    }

    return this.ordersRepository.updateOrder(orderId, addressData);
  }

  async cancelOrder(userId: string | null, orderId: string) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này.');
    }

    return this.ordersRepository.cancelOrder(orderId);
  }

  async findAllAdmin(query: { page?: number; limit?: number; search?: string; status?: OrderStatus }) {
    const pageNum = Number(query.page) || 1;
    const limitNum = Number(query.limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const { orders, total } = await this.ordersRepository.findManyAdmin({
      skip,
      take: limitNum,
      search: query.search,
      status: query.status,
    });
    const totalPages = Math.ceil(total / limitNum);

    return {
      data: orders,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  }

  async updateStatusAdmin(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    // Các trạng thái cuối không được phép chỉnh sửa nữa
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RETURNED
    ) {
      throw new BadRequestException('Không thể chuyển đổi trạng thái cho đơn hàng đã giao, đã hủy hoặc đã trả hàng.');
    }

    const updateData: any = { status };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    // Tự động chuyển paymentStatus thành PAID khi trạng thái chuyển sang DELIVERED
    if (status === OrderStatus.DELIVERED) {
      updateData.paymentStatus = PaymentStatus.PAID;
    }

    return this.ordersRepository.updateOrder(orderId, updateData);
  }
}
