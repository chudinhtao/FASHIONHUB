import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@fashionhub.com';
  console.log(`Starting seeding database...`);

  // 1. Tạo tài khoản admin
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('Admin@123', saltRounds);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrator',
        role: Role.ADMIN,
        phone: '0900000000',
        address: 'FashionHub Headquarters',
      },
    });
    console.log(`Successfully seeded default admin user: ${admin.email}`);
  } else {
    console.log(`Admin user with email ${adminEmail} already exists. Skipping.`);
  }

  // 2. Tạo danh mục mẫu (Categories)
  console.log('Seeding categories...');
  const catAoNam = await prisma.category.upsert({
    where: { slug: 'ao-nam' },
    update: {},
    create: { name: 'Áo Nam', slug: 'ao-nam' },
  });

  const catAoPolo = await prisma.category.upsert({
    where: { slug: 'ao-polo' },
    update: {},
    create: { name: 'Áo Polo', slug: 'ao-polo', parentId: catAoNam.id },
  });

  const catAoSoMi = await prisma.category.upsert({
    where: { slug: 'ao-so-mi' },
    update: {},
    create: { name: 'Áo Sơ Mi', slug: 'ao-so-mi', parentId: catAoNam.id },
  });

  const catQuanNam = await prisma.category.upsert({
    where: { slug: 'quan-nam' },
    update: {},
    create: { name: 'Quần Nam', slug: 'quan-nam' },
  });

  const catPhuKien = await prisma.category.upsert({
    where: { slug: 'phu-kien' },
    update: {},
    create: { name: 'Phụ Kiện', slug: 'phu-kien' },
  });

  console.log('Categories seeded successfully.');

  // 3. Tạo sản phẩm mẫu (Products + Images + Variants)
  console.log('Seeding products...');

  // Sản phẩm 1: Áo Thun Polo Premium Basic
  await prisma.product.upsert({
    where: { slug: 'ao-thun-polo-premium-basic' },
    update: {},
    create: {
      name: 'Áo Thun Polo Premium Basic',
      slug: 'ao-thun-polo-premium-basic',
      description: 'Mẫu áo thun polo cơ bản được hoàn thiện từ chất liệu 100% cotton hữu cơ tự nhiên cao cấp. Thiết kế phom dáng regular, đem lại sự sang trọng lịch lãm vừa đủ nhưng vẫn đảm bảo sự thông thoáng, thoải mái tối đa cho ngày hè năng động.',
      price: 299000,
      originalPrice: 350000,
      categoryId: catAoPolo.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80', isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', isPrimary: false }
        ]
      },
      variants: {
        create: [
          { color: 'White', size: 'S', stock: 12, sku: 'POLO-WHT-S' },
          { color: 'White', size: 'M', stock: 24, sku: 'POLO-WHT-M' },
          { color: 'White', size: 'L', stock: 5, sku: 'POLO-WHT-L' },
          { color: 'White', size: 'XL', stock: 1, sku: 'POLO-WHT-XL' },
          { color: 'Black', size: 'S', stock: 0, sku: 'POLO-BLK-S' },
          { color: 'Black', size: 'M', stock: 10, sku: 'POLO-BLK-M' },
          { color: 'Black', size: 'L', stock: 0, sku: 'POLO-BLK-L' },
          { color: 'Black', size: 'XL', stock: 3, sku: 'POLO-BLK-XL' }
        ]
      }
    }
  });

  // Sản phẩm 2: Áo Sơ Mi Oxford Cotton Premium
  await prisma.product.upsert({
    where: { slug: 'ao-so-mi-oxford-cotton-premium' },
    update: {},
    create: {
      name: 'Áo Sơ Mi Oxford Cotton Premium',
      slug: 'ao-so-mi-oxford-cotton-premium',
      description: 'Chất liệu vải Oxford mềm mại, có khả năng thấm hút mồ hôi tốt. Kiểu dáng cổ điển lịch lãm, dễ phối đồ.',
      price: 450000,
      originalPrice: 550000,
      categoryId: catAoSoMi.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', isPrimary: true }
        ]
      },
      variants: {
        create: [
          { color: 'Blue', size: 'M', stock: 15, sku: 'SHIRT-BLU-M' },
          { color: 'Blue', size: 'L', stock: 15, sku: 'SHIRT-BLU-L' }
        ]
      }
    }
  });

  // Sản phẩm 3: Quần Jeans Slim Fit Wax Nhẹ
  await prisma.product.upsert({
    where: { slug: 'quan-jeans-slim-fit-wax-nhe' },
    update: {},
    create: {
      name: 'Quần Jeans Slim Fit Wax Nhẹ',
      slug: 'quan-jeans-slim-fit-wax-nhe',
      description: 'Thiết kế ôm nhẹ, co giãn thoải mái, wax nhẹ gối trẻ trung năng động.',
      price: 550000,
      categoryId: catQuanNam.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80', isPrimary: true }
        ]
      },
      variants: {
        create: [
          { color: 'Denim', size: '30', stock: 25, sku: 'JEAN-DEN-30' },
          { color: 'Denim', size: '32', stock: 20, sku: 'JEAN-DEN-32' }
        ]
      }
    }
  });

  // Sản phẩm 4: Áo Len Dệt Kim Cổ Tròn Mềm
  await prisma.product.upsert({
    where: { slug: 'ao-len-det-kim-co-tron-mem' },
    update: {},
    create: {
      name: 'Áo Len Dệt Kim Cổ Tròn Mềm',
      slug: 'ao-len-det-kim-co-tron-mem',
      description: 'Chất liệu len dệt kim sợi mảnh siêu mềm mại, giữ ấm cơ thể hiệu quả trong mùa thu đông.',
      price: 399000,
      categoryId: catAoNam.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', isPrimary: true }
        ]
      },
      variants: {
        create: [
          { color: 'Grey', size: 'M', stock: 0, sku: 'SWEATER-GRY-M' }
        ]
      }
    }
  });

  console.log('Products seeded successfully.');
  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
