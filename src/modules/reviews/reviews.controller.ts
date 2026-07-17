import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReview(@Req() req: any, @Body() dto: CreateReviewDto) {
    const userId = req.user.id;
    const review = await this.reviewsService.createReview(userId, dto);
    return {
      message: 'Gửi đánh giá sản phẩm thành công.',
      data: review,
    };
  }

  @Public()
  @Get('product/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.reviewsService.getProductReviews(productId, page, limit);
    return {
      message: 'Lấy danh sách đánh giá thành công.',
      data: result.data,
      meta: result.meta,
    };
  }

  @Public()
  @Get('stats/:productId')
  async getProductStats(@Param('productId') productId: string) {
    const stats = await this.reviewsService.getProductStats(productId);
    return {
      message: 'Lấy thống kê đánh giá thành công.',
      data: stats,
    };
  }

  @Get('can-review/:productId')
  async canReview(@Req() req: any, @Param('productId') productId: string) {
    const userId = req.user.id;
    const result = await this.reviewsService.canReview(userId, productId);
    return {
      message: 'Kiểm tra quyền đánh giá thành công.',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async deleteReview(@Param('id') id: string) {
    await this.reviewsService.softDeleteReview(id);
    return {
      message: 'Ẩn đánh giá thành công.',
    };
  }
}
