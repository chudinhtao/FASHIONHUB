import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Role, OrderStatus, PaymentStatus } from '@prisma/client';
import { IsNotEmpty, IsString, IsOptional, IsEnum, Length, Matches } from 'class-validator';

export class CheckoutDto {
  @IsNotEmpty({ message: 'Họ tên người nhận không được để trống' })
  @IsString()
  @Length(2, 50, { message: 'Họ tên phải từ 2 đến 50 ký tự' })
  recipientName: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  @Matches(/^(03|05|07|08|09)\d{8}$/, { message: 'Số điện thoại không hợp lệ (yêu cầu 10 số, bắt đầu bằng 03/05/07/08/09)' })
  phone: string;

  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  @IsString()
  @Length(10, 255, { message: 'Địa chỉ nhận hàng chi tiết phải từ 10 đến 255 ký tự' })
  shippingAddress: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  items?: Array<{ variantId: string; quantity: number }>;
}

export class UpdateAddressDto {
  @IsNotEmpty({ message: 'Họ tên người nhận không được để trống' })
  @IsString()
  @Length(2, 50, { message: 'Họ tên phải từ 2 đến 50 ký tự' })
  recipientName: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  @Matches(/^(03|05|07|08|09)\d{8}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  @IsString()
  @Length(10, 255, { message: 'Địa chỉ nhận hàng chi tiết phải từ 10 đến 255 ký tự' })
  shippingAddress: string;
}

export class UpdateStatusDto {
  @IsNotEmpty({ message: 'Trạng thái đơn hàng không được để trống' })
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Trạng thái thanh toán không hợp lệ' })
  paymentStatus?: PaymentStatus;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 1. Khách hàng: Checkout giỏ hàng thành đơn hàng
  @Public()
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    const userId = req.user?.id || null;
    const order = await this.ordersService.checkout(userId, dto);
    return {
      message: 'Đặt hàng thành công.',
      data: order,
    };
  }

  // 2. Khách hàng: Xem lịch sử đơn hàng cá nhân
  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.ordersService.getHistory(req.user.id, page, limit);
    return {
      message: 'Lấy lịch sử mua hàng thành công.',
      data: result.data,
      meta: result.meta,
    };
  }

  // 4. Admin: Lấy danh sách đơn hàng toàn hệ thống (Cần đặt TRƯỚC router động :idOrOrderNumber)
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: OrderStatus,
  ) {
    const result = await this.ordersService.findAllAdmin({ page, limit, search, status });
    return {
      message: 'Lấy danh sách đơn hàng thành công.',
      data: result.data,
      meta: result.meta,
    };
  }

  // 3. Khách hàng & Admin: Xem chi tiết đơn hàng
  @Public()
  @Get(':idOrOrderNumber')
  async getDetail(@Req() req: any, @Param('idOrOrderNumber') idOrOrderNumber: string) {
    const userId = req.user?.id || null;
    const userRole = req.user?.role || null;
    const order = await this.ordersService.getDetail(userId, userRole, idOrOrderNumber);
    return {
      message: 'Lấy chi tiết đơn hàng thành công.',
      data: order,
    };
  }

  // 5. Khách hàng: Chỉnh sửa địa chỉ khi đơn hàng đang PENDING
  @Public()
  @Put(':id/address')
  async updateAddress(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const userId = req.user?.id || null;
    const order = await this.ordersService.updateAddress(userId, id, dto);
    return {
      message: 'Cập nhật địa chỉ đơn hàng thành công.',
      data: order,
    };
  }

  // 6. Khách hàng: Hủy đơn hàng khi đang PENDING
  @Public()
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || null;
    const order = await this.ordersService.cancelOrder(userId, id);
    return {
      message: 'Hủy đơn hàng thành công.',
      data: order,
    };
  }

  // 7. Admin: Cập nhật trạng thái đơn hàng (PENDING -> CONFIRMED -> PREPARING -> SHIPPING -> DELIVERED)
  @Put('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateStatusAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const order = await this.ordersService.updateStatusAdmin(id, dto.status, dto.paymentStatus);
    return {
      message: 'Cập nhật trạng thái đơn hàng thành công.',
      data: order,
    };
  }
}
