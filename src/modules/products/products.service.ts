import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { Product, ProductVariant, Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    categorySlug?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    onlySale?: boolean;
    color?: string;
    size?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    // 1. Lọc theo search (tên hoặc mô tả)
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // 2. Lọc theo danh mục (bao gồm cả con cháu đệ quy)
    if (query.categorySlug) {
      const category = await this.categoriesRepository.findBySlug(query.categorySlug);
      if (!category) {
        throw new NotFoundException('Không tìm thấy danh mục lọc');
      }

      // Lấy toàn bộ ID danh mục con cháu đệ quy
      const allCategories = await this.categoriesRepository.findAll();
      const categoryIds: string[] = [category.id];

      const collectChildren = (parentId: string) => {
        const children = allCategories.filter((c) => c.parentId === parentId);
        children.forEach((child) => {
          categoryIds.push(child.id);
          collectChildren(child.id);
        });
      };
      collectChildren(category.id);

      where.categoryId = { in: categoryIds };
    }

    // 3. Lọc theo khoảng giá
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    // 3.1. Lọc sản phẩm khuyến mãi
    if (query.onlySale) {
      where.originalPrice = { not: null };
    }

    // 3.2. Lọc theo màu sắc & kích cỡ biến thể
    if (query.color || query.size) {
      const variantFilters: Prisma.ProductVariantWhereInput = {};
      if (query.color) {
        variantFilters.color = { equals: query.color, mode: 'insensitive' };
      }
      if (query.size) {
        variantFilters.size = { equals: query.size, mode: 'insensitive' };
      }
      where.variants = {
        some: variantFilters
      };
    }

    // 4. Sắp xếp
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (query.sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (query.sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    const { products, total } = await this.productsRepository.findMany({
      skip,
      take: limit,
      where,
      orderBy,
    });

    // 5. Map kết quả sang ProductShort DTO
    const data = products.map((prod) => {
      const primaryImg = prod.images.find((img: any) => img.isPrimary) || prod.images[0];
      const totalStock = prod.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
      return {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        price: prod.price.toString(),
        originalPrice: prod.originalPrice ? prod.originalPrice.toString() : null,
        primaryImage: primaryImg ? primaryImg.url : '',
        category: {
          name: prod.category.name,
          slug: prod.category.slug,
        },
        totalStock,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findByIdOrSlug(idOrSlug: string) {
    // Check if UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(idOrSlug);

    const product = isUuid
      ? await this.productsRepository.findById(idOrSlug)
      : await this.productsRepository.findBySlug(idOrSlug);

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Map to ProductDetail DTO
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price.toString(),
      originalPrice: product.originalPrice ? product.originalPrice.toString() : null,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      images: product.images.map((img: any) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
      })),
      variants: product.variants.map((v: any) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        sku: v.sku,
      })),
    };
  }

  async create(data: {
    name: string;
    slug?: string;
    description?: string | null;
    price: number;
    originalPrice?: number | null;
    categoryId: string;
    images: { url: string; isPrimary: boolean }[];
    variants: { size?: string | null; color?: string | null; stock: number; sku: string }[];
  }) {
    const slug = data.slug || this.slugify(data.name);

    // Validate product slug
    const existingProduct = await this.productsRepository.findBySlug(slug);
    if (existingProduct) {
      throw new ConflictException('Đường dẫn sản phẩm (slug) đã tồn tại');
    }

    // Validate category
    const category = await this.categoriesRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục chỉ định');
    }

    // Validate SKU uniqueness in payload & db
    const skus = data.variants.map((v) => v.sku);
    const hasDuplicateSkuInPayload = new Set(skus).size !== skus.length;
    if (hasDuplicateSkuInPayload) {
      throw new BadRequestException('Mã SKU biến thể trong danh sách bị trùng lặp');
    }

    for (const sku of skus) {
      const existingVariant = await this.productsRepository.findBySku(sku);
      if (existingVariant) {
        throw new ConflictException(`Mã SKU "${sku}" đã tồn tại trên hệ thống`);
      }
    }

    // Normalize images: if no image is marked primary, make the first one primary
    const normalizedImages = data.images.map((img, idx) => ({
      url: img.url,
      isPrimary: data.images.some((i) => i.isPrimary) ? img.isPrimary : idx === 0,
    }));

    return this.productsRepository.create({
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      originalPrice: data.originalPrice,
      categoryId: data.categoryId,
      images: normalizedImages,
      variants: data.variants,
    });
  }

  async update(
    id: string,
    data: {
      name: string;
      slug?: string;
      description?: string | null;
      price: number;
      originalPrice?: number | null;
      categoryId: string;
      images: { url: string; isPrimary: boolean }[];
      variants: { size?: string | null; color?: string | null; stock: number; sku: string }[];
    },
  ) {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm cần cập nhật');
    }

    const slug = data.slug || this.slugify(data.name);

    // Validate product slug unique
    if (slug !== product.slug) {
      const existingProduct = await this.productsRepository.findBySlug(slug);
      if (existingProduct) {
        throw new ConflictException('Đường dẫn sản phẩm (slug) đã tồn tại');
      }
    }

    // Validate category
    const category = await this.categoriesRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục chỉ định');
    }

    // Validate SKU uniqueness (excluding variants currently belonging to this product, since we recreate them)
    const skus = data.variants.map((v) => v.sku);
    const hasDuplicateSkuInPayload = new Set(skus).size !== skus.length;
    if (hasDuplicateSkuInPayload) {
      throw new BadRequestException('Mã SKU biến thể trong danh sách bị trùng lặp');
    }

    for (const sku of skus) {
      const existingVariant = await this.productsRepository.findBySku(sku);
      if (existingVariant && existingVariant.productId !== id) {
        throw new ConflictException(`Mã SKU "${sku}" đã tồn tại trên hệ thống ở sản phẩm khác`);
      }
    }

    // Normalize images
    const normalizedImages = data.images.map((img, idx) => ({
      url: img.url,
      isPrimary: data.images.some((i) => i.isPrimary) ? img.isPrimary : idx === 0,
    }));

    return this.productsRepository.update(id, {
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      originalPrice: data.originalPrice,
      categoryId: data.categoryId,
      images: normalizedImages,
      variants: data.variants,
    });
  }

  async delete(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm cần xóa');
    }
    return this.productsRepository.delete(id);
  }
}
