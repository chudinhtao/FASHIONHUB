import { Controller, Get, Post, Put, Delete, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { CartService } from './cart.service';
import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @IsNotEmpty({ message: 'ID biến thể không được để trống' })
  @IsUUID('4', { message: 'ID biến thể phải là định dạng UUID' })
  variantId: string;

  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải từ 1 trở lên' })
  quantity: number;
}

export class UpdateCartItemDto {
  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải từ 1 trở lên' })
  quantity: number;
}

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    const items = await this.cartService.getCart(req.user.id);
    return {
      message: 'Lấy thông tin giỏ hàng thành công',
      data: items,
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
    const item = await this.cartService.addItem(req.user.id, dto.variantId, dto.quantity);
    return {
      message: 'Thêm sản phẩm vào giỏ hàng thành công',
      data: item,
    };
  }

  @Put(':itemId')
  async updateQuantity(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const item = await this.cartService.updateQuantity(req.user.id, itemId, dto.quantity);
    return {
      message: 'Cập nhật số lượng sản phẩm thành công',
      data: item,
    };
  }

  @Delete(':itemId')
  async removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    await this.cartService.removeItem(req.user.id, itemId);
    return {
      message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearCart(@Req() req: any) {
    await this.cartService.clearCart(req.user.id);
    return {
      message: 'Xóa sạch giỏ hàng thành công',
    };
  }
}
