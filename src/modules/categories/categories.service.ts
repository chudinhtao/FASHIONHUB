import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { Category, Prisma } from '@prisma/client';

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

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

  async getCategoriesTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.categoriesRepository.findAll();
    return this.buildTree(categories);
  }

  private buildTree(categories: Category[]): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // Initialize all items in a map
    categories.forEach((cat) => {
      map.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        children: [],
      });
    });

    // Populate children
    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId) {
        const parentNode = map.get(cat.parentId);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // If parent is not found for some reason, place it as root
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getById(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  async create(name: string, parentId?: string): Promise<Category> {
    const slug = this.slugify(name);
    
    // Check slug unique
    const existing = await this.categoriesRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Đường dẫn danh mục (slug) đã tồn tại');
    }

    // Check parent exists
    if (parentId) {
      const parent = await this.categoriesRepository.findById(parentId);
      if (!parent) {
        throw new NotFoundException('Không tìm thấy danh mục cha');
      }
    }

    return this.categoriesRepository.create({
      name,
      slug,
      parent: parentId ? { connect: { id: parentId } } : undefined,
    });
  }

  async update(id: string, name: string, parentId?: string | null): Promise<Category> {
    const category = await this.getById(id);
    const slug = this.slugify(name);

    // Check slug unique if name changed
    if (slug !== category.slug) {
      const existing = await this.categoriesRepository.findBySlug(slug);
      if (existing) {
        throw new ConflictException('Đường dẫn danh mục (slug) đã tồn tại');
      }
    }

    if (parentId) {
      // Prevent circular reference
      if (parentId === id) {
        throw new BadRequestException('Danh mục cha không thể là chính nó');
      }
      
      const parent = await this.categoriesRepository.findById(parentId);
      if (!parent) {
        throw new NotFoundException('Không tìm thấy danh mục cha');
      }
    }

    return this.categoriesRepository.update(id, {
      name,
      slug,
      parent: parentId ? { connect: { id: parentId } } : (parentId === null ? { disconnect: true } : undefined),
    });
  }

  async delete(id: string): Promise<Category> {
    await this.getById(id);

    // Check if category has children
    const hasChildren = await this.categoriesRepository.hasChildren(id);
    if (hasChildren) {
      throw new BadRequestException('Không thể xóa danh mục đang chứa danh mục con');
    }

    // Check if category has products
    const hasProducts = await this.categoriesRepository.hasProducts(id);
    if (hasProducts) {
      throw new BadRequestException('Không thể xóa danh mục đang liên kết với sản phẩm');
    }

    return this.categoriesRepository.delete(id);
  }
}
