import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsUUID, IsArray, ValidateNested, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import * as fs from 'fs';
const multer = require('multer');
const diskStorage = multer.diskStorage;

class ImageInput {
  @IsNotEmpty({ message: 'URL hình ảnh không được để trống' })
  @IsString()
  url: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class VariantInput {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsNotEmpty({ message: 'Số lượng tồn kho không được để trống' })
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được âm' })
  stock: number;

  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  @IsString()
  sku: string;
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Giá sản phẩm không được để trống' })
  @IsNumber({}, { message: 'Giá sản phẩm phải là số' })
  @Min(0, { message: 'Giá sản phẩm không được âm' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Giá gốc sản phẩm phải là số' })
  @Min(0, { message: 'Giá gốc sản phẩm không được âm' })
  originalPrice?: number;

  @IsNotEmpty({ message: 'ID danh mục không được để trống' })
  @IsUUID('4', { message: 'ID danh mục phải là định dạng UUID' })
  categoryId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageInput)
  images: ImageInput[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInput)
  variants: VariantInput[];
}

export class UpdateProductDto {
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Giá sản phẩm không được để trống' })
  @IsNumber({}, { message: 'Giá sản phẩm phải là số' })
  @Min(0, { message: 'Giá sản phẩm không được âm' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Giá gốc sản phẩm phải là số' })
  @Min(0, { message: 'Giá gốc sản phẩm không được âm' })
  originalPrice?: number;

  @IsNotEmpty({ message: 'ID danh mục không được để trống' })
  @IsUUID('4', { message: 'ID danh mục phải là định dạng UUID' })
  categoryId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageInput)
  images: ImageInput[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInput)
  variants: VariantInput[];
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy?: string,
    @Query('onlySale') onlySale?: string,
    @Query('color') color?: string,
    @Query('size') size?: string,
  ) {
    const minPriceNum = minPrice !== undefined ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice !== undefined ? Number(maxPrice) : undefined;
    const onlySaleBool = onlySale === 'true' || onlySale === '1';
    
    const result = await this.productsService.findAll({
      page,
      limit,
      search,
      categorySlug,
      minPrice: minPriceNum,
      maxPrice: maxPriceNum,
      sortBy,
      onlySale: onlySaleBool,
      color,
      size,
    });

    return {
      message: 'Lấy danh sách sản phẩm thành công',
      data: result.data,
      meta: result.meta,
    };
  }

  @Public()
  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    const product = await this.productsService.findByIdOrSlug(idOrSlug);
    return {
      message: 'Lấy chi tiết sản phẩm thành công',
      data: product,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      price: dto.price,
      originalPrice: dto.originalPrice,
      categoryId: dto.categoryId,
      images: dto.images.map(img => ({ url: img.url, isPrimary: !!img.isPrimary })),
      variants: dto.variants,
    });

    return {
      message: 'Tạo sản phẩm thành công',
      data: product,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const product = await this.productsService.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      price: dto.price,
      originalPrice: dto.originalPrice,
      categoryId: dto.categoryId,
      images: dto.images.map(img => ({ url: img.url, isPrimary: !!img.isPrimary })),
      variants: dto.variants,
    });

    return {
      message: 'Cập nhật sản phẩm thành công',
      data: product,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    const product = await this.productsService.delete(id);
    return {
      message: 'Xóa sản phẩm thành công',
      data: product,
    };
  }

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file: any, cb: any) => {
          const uploadPath = './uploads';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req: any, file: any, cb: any) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Chỉ cho phép tải lên các định dạng ảnh (jpg, jpeg, png, webp).'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy tệp tin được gửi lên.');
    }
    const fileUrl = `/uploads/${file.filename}`;
    return {
      message: 'Tải lên hình ảnh thành công.',
      data: {
        url: fileUrl,
      },
    };
  }
}
