import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString({ message: 'Tên danh mục phải là chuỗi' })
  name: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID danh mục cha phải là định dạng UUID hợp lệ' })
  parentId?: string;
}

export class UpdateCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString({ message: 'Tên danh mục phải là chuỗi' })
  name: string;

  @IsOptional()
  parentId?: string | null;
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async getTree() {
    const tree = await this.categoriesService.getCategoriesTree();
    return {
      message: 'Lấy cây danh mục thành công',
      data: tree,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.create(dto.name, dto.parentId);
    return {
      message: 'Tạo danh mục thành công',
      data: category,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categoriesService.update(id, dto.name, dto.parentId);
    return {
      message: 'Cập nhật danh mục thành công',
      data: category,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    const category = await this.categoriesService.delete(id);
    return {
      message: 'Xóa danh mục thành công',
      data: category,
    };
  }
}
