import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Product, ProductImage, ProductVariant, Prisma } from '@prisma/client';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<{ products: any[]; total: number }> {
    const { skip, take, where, orderBy } = params;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: {
              isPrimary: 'desc',
            },
          },
          variants: {
            select: {
              stock: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });
  }

  async findBySlug(slug: string): Promise<any | null> {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });
  }

  async findBySku(sku: string): Promise<ProductVariant | null> {
    return this.prisma.productVariant.findUnique({
      where: { sku },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string | null;
    price: number;
    originalPrice?: number | null;
    categoryId: string;
    images: { url: string; isPrimary: boolean }[];
    variants: { size?: string | null; color?: string | null; stock: number; sku: string }[];
  }): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create product
      const product = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          originalPrice: data.originalPrice,
          categoryId: data.categoryId,
        },
      });

      // 2. Create images
      if (data.images && data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img) => ({
            productId: product.id,
            url: img.url,
            isPrimary: img.isPrimary,
          })),
        });
      }

      // 3. Create variants
      if (data.variants && data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: product.id,
            size: v.size,
            color: v.color,
            stock: v.stock,
            sku: v.sku,
          })),
        });
      }

      return product;
    });
  }

  async update(
    id: string,
    data: {
      name: string;
      slug: string;
      description?: string | null;
      price: number;
      originalPrice?: number | null;
      categoryId: string;
      images: { url: string; isPrimary: boolean }[];
      variants: { size?: string | null; color?: string | null; stock: number; sku: string }[];
    },
  ): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update product basic details
      const product = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          originalPrice: data.originalPrice,
          categoryId: data.categoryId,
        },
      });

      // 2. Delete existing images & recreate
      await tx.productImage.deleteMany({
        where: { productId: id },
      });
      if (data.images && data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img) => ({
            productId: id,
            url: img.url,
            isPrimary: img.isPrimary,
          })),
        });
      }

      // 3. Delete existing variants & recreate
      await tx.productVariant.deleteMany({
        where: { productId: id },
      });
      if (data.variants && data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: id,
            size: v.size,
            color: v.color,
            stock: v.stock,
            sku: v.sku,
          })),
        });
      }

      return product;
    });
  }

  async delete(id: string): Promise<Product> {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
