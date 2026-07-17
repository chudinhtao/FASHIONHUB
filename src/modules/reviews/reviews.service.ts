import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository';

@Injectable()
export class ReviewsService {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async createReview(
    userId: string,
    dto: { productId: string; rating: number; comment?: string; images?: string[] },
  ) {
    const { productId, rating, comment, images } = dto;

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Số sao đánh giá phải từ 1 đến 5.');
    }

    const productExists = await this.reviewsRepository.productExists(productId);
    if (!productExists) {
      throw new NotFoundException('Sản phẩm không tồn tại.');
    }

    const hasPurchased = await this.reviewsRepository.checkPurchased(userId, productId);
    if (!hasPurchased) {
      throw new BadRequestException(
        'Bạn cần mua sản phẩm này và nhận hàng thành công để viết đánh giá.',
      );
    }

    const existingReview = await this.reviewsRepository.findByUserAndProduct(userId, productId);
    if (existingReview) {
      throw new BadRequestException('Bạn đã gửi đánh giá cho sản phẩm này rồi.');
    }

    if (images && images.length > 3) {
      throw new BadRequestException('Chỉ cho phép đính kèm tối đa 3 hình ảnh thực tế.');
    }

    return this.reviewsRepository.create(userId, productId, rating, comment, images);
  }

  async getProductReviews(productId: string, page = 1, limit = 5) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 5);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      this.reviewsRepository.findByProduct(productId, skip, limitNum),
      this.reviewsRepository.countByProduct(productId),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: reviews,
      meta: {
        totalItems: total,
        itemCount: reviews.length,
        itemsPerPage: limitNum,
        totalPages,
        currentPage: pageNum,
      },
    };
  }

  async getProductStats(productId: string) {
    const productExists = await this.reviewsRepository.productExists(productId);
    if (!productExists) {
      throw new NotFoundException('Sản phẩm không tồn tại.');
    }
    return this.reviewsRepository.getStats(productId);
  }

  async canReview(userId: string, productId: string) {
    const productExists = await this.reviewsRepository.productExists(productId);
    if (!productExists) {
      return { canReview: false, reason: 'PRODUCT_NOT_FOUND' };
    }

    const hasPurchased = await this.reviewsRepository.checkPurchased(userId, productId);
    if (!hasPurchased) {
      return { canReview: false, reason: 'NOT_PURCHASED' };
    }

    const existingReview = await this.reviewsRepository.findByUserAndProduct(userId, productId);
    if (existingReview) {
      return { canReview: false, reason: 'ALREADY_REVIEWED' };
    }

    return { canReview: true, reason: null };
  }

  async softDeleteReview(reviewId: string) {
    const review = await this.reviewsRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá.');
    }
    return this.reviewsRepository.softDelete(reviewId);
  }
}
