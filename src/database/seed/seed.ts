import { PrismaClient, Role, OrderStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function orderNumber(idx: number): string {
  return `FH-2026-${String(100000 + idx).slice(1)}`;
}

async function main() {
  console.log('🧹 Cleaning database...');
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Database cleaned.\n');

  // ══════════════════════════════════════════════
  // 1. USERS
  // ══════════════════════════════════════════════
  console.log('👤 Seeding users...');
  const salt = 10;

  const admin = await prisma.user.create({
    data: {
      email: 'admin@fashionhub.com',
      password: await bcrypt.hash('Admin@123', salt),
      name: 'Administrator',
      role: Role.ADMIN,
      phone: '0900000000',
      address: 'FashionHub Headquarters, Quận 7, TP. Hồ Chí Minh',
      createdAt: daysAgo(65),
    },
  });

  const customerData = [
    { email: 'nguyenvana@gmail.com', name: 'Nguyễn Văn An', phone: '0912345678', address: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh', days: 58 },
    { email: 'tranthile@gmail.com', name: 'Trần Thị Lệ', phone: '0987654321', address: '456 Đường Nguyễn Huệ, Quận 3, TP. Hồ Chí Minh', days: 55 },
    { email: 'phamminhtuan@gmail.com', name: 'Phạm Minh Tuấn', phone: '0903112233', address: '78 Phố Huế, Hai Bà Trưng, Hà Nội', days: 52 },
    { email: 'lehoangmai@gmail.com', name: 'Lê Hoàng Mai', phone: '0916789012', address: '12 Đường Bạch Đằng, Hải Châu, Đà Nẵng', days: 48 },
    { email: 'vothanhson@gmail.com', name: 'Võ Thanh Sơn', phone: '0938456789', address: '99 Đường 30/4, Ninh Kiều, Cần Thơ', days: 45 },
    { email: 'dangthithu@gmail.com', name: 'Đặng Thị Thu', phone: '0971234567', address: '5A Đường Trần Phú, Nha Trang, Khánh Hòa', days: 40 },
    { email: 'buiquocdat@gmail.com', name: 'Bùi Quốc Đạt', phone: '0945678901', address: '200 Đường Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh', days: 35 },
    { email: 'hoangthilan@gmail.com', name: 'Hoàng Thị Lan', phone: '0892345678', address: '45 Đường Lý Thường Kiệt, Hoàn Kiếm, Hà Nội', days: 28 },
    { email: 'ngothanhbinh@gmail.com', name: 'Ngô Thanh Bình', phone: '0867891234', address: '333 Đường Võ Văn Tần, Quận 3, TP. Hồ Chí Minh', days: 20 },
    { email: 'dothikimchi@gmail.com', name: 'Đỗ Thị Kim Chi', phone: '0856789012', address: '88 Đường Hùng Vương, Thanh Khê, Đà Nẵng', days: 12 },
  ];

  const customers: any[] = [];
  for (const c of customerData) {
    const user = await prisma.user.create({
      data: {
        email: c.email,
        password: await bcrypt.hash('Customer@123', salt),
        name: c.name,
        role: Role.CUSTOMER,
        phone: c.phone,
        address: c.address,
        createdAt: daysAgo(c.days),
      },
    });
    customers.push(user);
  }
  console.log(`✓ Created 1 admin + ${customers.length} customers.\n`);

  // ══════════════════════════════════════════════
  // 2. CATEGORIES
  // ══════════════════════════════════════════════
  console.log('📂 Seeding categories...');

  const catAoNam = await prisma.category.create({ data: { name: 'Áo Nam', slug: 'ao-nam' } });
  const catAoPolo = await prisma.category.create({ data: { name: 'Áo Polo', slug: 'ao-polo', parentId: catAoNam.id } });
  const catAoSoMi = await prisma.category.create({ data: { name: 'Áo Sơ Mi', slug: 'ao-so-mi', parentId: catAoNam.id } });
  const catAoThun = await prisma.category.create({ data: { name: 'Áo Thun', slug: 'ao-thun', parentId: catAoNam.id } });

  const catQuanNam = await prisma.category.create({ data: { name: 'Quần Nam', slug: 'quan-nam' } });
  const catQuanJeans = await prisma.category.create({ data: { name: 'Quần Jeans', slug: 'quan-jeans', parentId: catQuanNam.id } });
  const catQuanKaki = await prisma.category.create({ data: { name: 'Quần Kaki', slug: 'quan-kaki', parentId: catQuanNam.id } });

  const catAoNu = await prisma.category.create({ data: { name: 'Áo Nữ', slug: 'ao-nu' } });
  const catVayDam = await prisma.category.create({ data: { name: 'Váy & Đầm', slug: 'vay-dam' } });

  const catPhuKien = await prisma.category.create({ data: { name: 'Phụ Kiện', slug: 'phu-kien' } });
  const catThatLung = await prisma.category.create({ data: { name: 'Thắt Lưng', slug: 'that-lung', parentId: catPhuKien.id } });
  const catViDa = await prisma.category.create({ data: { name: 'Ví Da', slug: 'vi-da', parentId: catPhuKien.id } });

  console.log('✓ 12 categories created.\n');

  // ══════════════════════════════════════════════
  // 3. PRODUCTS
  // ══════════════════════════════════════════════
  console.log('👕 Seeding products...');

  interface ProductSeed {
    name: string; slug: string; desc: string; price: number; originalPrice?: number;
    catId: string; images: { url: string; isPrimary: boolean }[];
    variants: { color: string; size: string; stock: number; sku: string }[];
    daysAgo: number;
  }

  const productSeeds: ProductSeed[] = [
    // ─── ÁO POLO (4) ───
    {
      name: 'Áo Polo Premium Basic', slug: 'ao-polo-premium-basic', daysAgo: 60,
      desc: 'Mẫu áo polo cơ bản được hoàn thiện từ chất liệu 100% cotton hữu cơ tự nhiên cao cấp. Thiết kế phom dáng regular, đem lại sự sang trọng lịch lãm vừa đủ nhưng vẫn đảm bảo sự thông thoáng, thoải mái tối đa cho ngày hè năng động.',
      price: 299000, originalPrice: 350000, catId: catAoPolo.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Trắng', size: 'S', stock: 12, sku: 'POLO-BAS-WHT-S' },
        { color: 'Trắng', size: 'M', stock: 24, sku: 'POLO-BAS-WHT-M' },
        { color: 'Trắng', size: 'L', stock: 5, sku: 'POLO-BAS-WHT-L' },
        { color: 'Trắng', size: 'XL', stock: 1, sku: 'POLO-BAS-WHT-XL' },
        { color: 'Đen', size: 'M', stock: 10, sku: 'POLO-BAS-BLK-M' },
        { color: 'Đen', size: 'L', stock: 8, sku: 'POLO-BAS-BLK-L' },
        { color: 'Đen', size: 'XL', stock: 3, sku: 'POLO-BAS-BLK-XL' },
      ],
    },
    {
      name: 'Áo Polo Pique Slim Fit', slug: 'ao-polo-pique-slim-fit', daysAgo: 55,
      desc: 'Vải pique dệt nổi cao cấp, co giãn nhẹ. Kiểu dáng slim fit ôm vừa vặn cơ thể, phù hợp cả môi trường công sở lẫn dạo phố cuối tuần.',
      price: 349000, originalPrice: 420000, catId: catAoPolo.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1625910513413-5fc08ef79fd9?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Xanh Navy', size: 'M', stock: 18, sku: 'POLO-PIQ-NAV-M' },
        { color: 'Xanh Navy', size: 'L', stock: 15, sku: 'POLO-PIQ-NAV-L' },
        { color: 'Xanh Navy', size: 'XL', stock: 6, sku: 'POLO-PIQ-NAV-XL' },
        { color: 'Đỏ Đô', size: 'M', stock: 10, sku: 'POLO-PIQ-RED-M' },
        { color: 'Đỏ Đô', size: 'L', stock: 7, sku: 'POLO-PIQ-RED-L' },
      ],
    },
    {
      name: 'Áo Polo Lacoste Oversized', slug: 'ao-polo-lacoste-oversized', daysAgo: 40,
      desc: 'Phom dáng oversize trẻ trung, chất liệu lacoste thoáng mát. Cổ bẻ cứng cáp, bo gấu tay kẻ sọc tạo điểm nhấn thời trang nổi bật.',
      price: 389000, catId: catAoPolo.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Kem', size: 'M', stock: 20, sku: 'POLO-OVS-CRM-M' },
        { color: 'Kem', size: 'L', stock: 16, sku: 'POLO-OVS-CRM-L' },
        { color: 'Xám', size: 'L', stock: 12, sku: 'POLO-OVS-GRY-L' },
        { color: 'Xám', size: 'XL', stock: 9, sku: 'POLO-OVS-GRY-XL' },
      ],
    },
    {
      name: 'Áo Polo Kẻ Sọc Ngang', slug: 'ao-polo-ke-soc-ngang', daysAgo: 25,
      desc: 'Hoạ tiết kẻ sọc ngang cổ điển, vải cotton pha polyester chống nhăn tốt. Lý tưởng cho phong cách smart casual cuối tuần.',
      price: 319000, originalPrice: 380000, catId: catAoPolo.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Xanh Rêu', size: 'S', stock: 8, sku: 'POLO-STR-GRN-S' },
        { color: 'Xanh Rêu', size: 'M', stock: 14, sku: 'POLO-STR-GRN-M' },
        { color: 'Xanh Rêu', size: 'L', stock: 11, sku: 'POLO-STR-GRN-L' },
      ],
    },

    // ─── ÁO SƠ MI (3) ───
    {
      name: 'Áo Sơ Mi Oxford Cotton Premium', slug: 'ao-so-mi-oxford-cotton-premium', daysAgo: 58,
      desc: 'Chất liệu vải Oxford mềm mại, có khả năng thấm hút mồ hôi tốt. Kiểu dáng cổ điển lịch lãm, button-down collar, dễ phối đồ cho cả văn phòng lẫn dạo phố.',
      price: 450000, originalPrice: 550000, catId: catAoSoMi.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Xanh Nhạt', size: 'M', stock: 15, sku: 'SHIRT-OXF-BLU-M' },
        { color: 'Xanh Nhạt', size: 'L', stock: 15, sku: 'SHIRT-OXF-BLU-L' },
        { color: 'Trắng', size: 'M', stock: 20, sku: 'SHIRT-OXF-WHT-M' },
        { color: 'Trắng', size: 'L', stock: 18, sku: 'SHIRT-OXF-WHT-L' },
        { color: 'Trắng', size: 'XL', stock: 10, sku: 'SHIRT-OXF-WHT-XL' },
      ],
    },
    {
      name: 'Áo Sơ Mi Linen Cổ Trụ', slug: 'ao-so-mi-linen-co-tru', daysAgo: 45,
      desc: 'Vải linen tự nhiên thoáng khí, hoàn hảo cho mùa hè nhiệt đới. Cổ trụ Mandarin tối giản, phom regular fit thoải mái.',
      price: 520000, catId: catAoSoMi.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Trắng', size: 'M', stock: 12, sku: 'SHIRT-LIN-WHT-M' },
        { color: 'Trắng', size: 'L', stock: 10, sku: 'SHIRT-LIN-WHT-L' },
        { color: 'Be', size: 'M', stock: 8, sku: 'SHIRT-LIN-BEI-M' },
        { color: 'Be', size: 'L', stock: 6, sku: 'SHIRT-LIN-BEI-L' },
      ],
    },
    {
      name: 'Áo Sơ Mi Flannel Kẻ Caro', slug: 'ao-so-mi-flannel-ke-caro', daysAgo: 30,
      desc: 'Chất flannel dày dặn ấm áp, hoạ tiết caro đặc trưng phong cách Americana. Phù hợp layering trong tiết trời se lạnh.',
      price: 480000, originalPrice: 580000, catId: catAoSoMi.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1608234808654-2a8875faa7fd?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Đỏ Caro', size: 'M', stock: 14, sku: 'SHIRT-FLN-RED-M' },
        { color: 'Đỏ Caro', size: 'L', stock: 12, sku: 'SHIRT-FLN-RED-L' },
        { color: 'Đỏ Caro', size: 'XL', stock: 5, sku: 'SHIRT-FLN-RED-XL' },
        { color: 'Xanh Caro', size: 'M', stock: 10, sku: 'SHIRT-FLN-BLU-M' },
        { color: 'Xanh Caro', size: 'L', stock: 8, sku: 'SHIRT-FLN-BLU-L' },
      ],
    },

    // ─── ÁO THUN (3) ───
    {
      name: 'Áo Thun Cotton Supima Cổ Tròn', slug: 'ao-thun-cotton-supima-co-tron', daysAgo: 56,
      desc: 'Cotton Supima cao cấp nhập khẩu, sợi vải dài gấp đôi cotton thường mang lại cảm giác mịn màng mượt mà. Đường may tinh tế, phom regular fit phù hợp mọi dáng người.',
      price: 249000, originalPrice: 299000, catId: catAoThun.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Trắng', size: 'S', stock: 30, sku: 'TEE-SUP-WHT-S' },
        { color: 'Trắng', size: 'M', stock: 45, sku: 'TEE-SUP-WHT-M' },
        { color: 'Trắng', size: 'L', stock: 35, sku: 'TEE-SUP-WHT-L' },
        { color: 'Đen', size: 'S', stock: 25, sku: 'TEE-SUP-BLK-S' },
        { color: 'Đen', size: 'M', stock: 40, sku: 'TEE-SUP-BLK-M' },
        { color: 'Đen', size: 'L', stock: 30, sku: 'TEE-SUP-BLK-L' },
        { color: 'Đen', size: 'XL', stock: 15, sku: 'TEE-SUP-BLK-XL' },
      ],
    },
    {
      name: 'Áo Thun Oversize Graphic "Urban"', slug: 'ao-thun-oversize-graphic-urban', daysAgo: 38,
      desc: 'In graphic nghệ thuật phong cách đường phố, chất liệu cotton 260gsm dày dặn giữ form tốt. Phom oversize rộng rãi thoải mái, phù hợp phong cách streetwear.',
      price: 329000, catId: catAoThun.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Đen', size: 'M', stock: 20, sku: 'TEE-GFX-BLK-M' },
        { color: 'Đen', size: 'L', stock: 25, sku: 'TEE-GFX-BLK-L' },
        { color: 'Đen', size: 'XL', stock: 12, sku: 'TEE-GFX-BLK-XL' },
        { color: 'Trắng', size: 'L', stock: 15, sku: 'TEE-GFX-WHT-L' },
      ],
    },
    {
      name: 'Áo Thun Henley Cổ Trụ 3 Cúc', slug: 'ao-thun-henley-co-tru', daysAgo: 18,
      desc: 'Kiểu dáng Henley tối giản với 3 cúc cài cổ trụ thanh lịch. Vải cotton compact mềm mại, co giãn 4 chiều thoải mái vận động.',
      price: 279000, originalPrice: 340000, catId: catAoThun.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Xám Đậm', size: 'M', stock: 16, sku: 'TEE-HNL-DGR-M' },
        { color: 'Xám Đậm', size: 'L', stock: 14, sku: 'TEE-HNL-DGR-L' },
        { color: 'Nâu Đất', size: 'M', stock: 10, sku: 'TEE-HNL-BRN-M' },
        { color: 'Nâu Đất', size: 'L', stock: 8, sku: 'TEE-HNL-BRN-L' },
      ],
    },

    // ─── ÁO NAM (parent — len, khoác) (2) ───
    {
      name: 'Áo Len Dệt Kim Cổ Tròn', slug: 'ao-len-det-kim-co-tron', daysAgo: 50,
      desc: 'Chất liệu len dệt kim sợi mảnh siêu mềm mại, giữ ấm cơ thể hiệu quả trong mùa thu đông. Cổ tròn thanh lịch, dễ layering cùng sơ mi bên trong.',
      price: 399000, catId: catAoNam.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Xám', size: 'M', stock: 0, sku: 'SWTR-KNT-GRY-M' },
        { color: 'Xám', size: 'L', stock: 5, sku: 'SWTR-KNT-GRY-L' },
        { color: 'Đen', size: 'M', stock: 8, sku: 'SWTR-KNT-BLK-M' },
        { color: 'Đen', size: 'L', stock: 6, sku: 'SWTR-KNT-BLK-L' },
      ],
    },
    {
      name: 'Áo Khoác Bomber Nhẹ', slug: 'ao-khoac-bomber-nhe', daysAgo: 35,
      desc: 'Thiết kế bomber jacket kinh điển với chất liệu nylon nhẹ chống nước nhẹ. Bo gấu và cổ tay co giãn, lót mesh thoáng khí. Hoàn hảo cho tiết trời chuyển mùa.',
      price: 650000, originalPrice: 790000, catId: catAoNam.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Đen', size: 'M', stock: 10, sku: 'BOMB-NYL-BLK-M' },
        { color: 'Đen', size: 'L', stock: 8, sku: 'BOMB-NYL-BLK-L' },
        { color: 'Đen', size: 'XL', stock: 4, sku: 'BOMB-NYL-BLK-XL' },
        { color: 'Xanh Rêu', size: 'M', stock: 6, sku: 'BOMB-NYL-OLV-M' },
        { color: 'Xanh Rêu', size: 'L', stock: 5, sku: 'BOMB-NYL-OLV-L' },
      ],
    },

    // ─── QUẦN JEANS (3) ───
    {
      name: 'Quần Jeans Slim Fit Wax Nhẹ', slug: 'quan-jeans-slim-fit-wax-nhe', daysAgo: 57,
      desc: 'Thiết kế ôm nhẹ, co giãn thoải mái với công nghệ wax nhẹ gối trẻ trung năng động. Chất denim 11oz bền bỉ nhưng không quá cứng.',
      price: 550000, catId: catQuanJeans.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Xanh Đậm', size: '29', stock: 12, sku: 'JEAN-SLM-DRK-29' },
        { color: 'Xanh Đậm', size: '30', stock: 25, sku: 'JEAN-SLM-DRK-30' },
        { color: 'Xanh Đậm', size: '31', stock: 20, sku: 'JEAN-SLM-DRK-31' },
        { color: 'Xanh Đậm', size: '32', stock: 18, sku: 'JEAN-SLM-DRK-32' },
        { color: 'Xanh Nhạt', size: '30', stock: 15, sku: 'JEAN-SLM-LGT-30' },
        { color: 'Xanh Nhạt', size: '32', stock: 10, sku: 'JEAN-SLM-LGT-32' },
      ],
    },
    {
      name: 'Quần Jeans Straight Classic', slug: 'quan-jeans-straight-classic', daysAgo: 42,
      desc: 'Phom dáng straight cổ điển không bao giờ lỗi mốt. Denim 100% cotton wash nhẹ, mang đến vẻ ngoài vintage trưởng thành.',
      price: 490000, originalPrice: 590000, catId: catQuanJeans.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Xanh Trung', size: '30', stock: 14, sku: 'JEAN-STR-MED-30' },
        { color: 'Xanh Trung', size: '31', stock: 12, sku: 'JEAN-STR-MED-31' },
        { color: 'Xanh Trung', size: '32', stock: 16, sku: 'JEAN-STR-MED-32' },
        { color: 'Xanh Trung', size: '33', stock: 8, sku: 'JEAN-STR-MED-33' },
      ],
    },
    {
      name: 'Quần Jeans Rách Gối Skinny', slug: 'quan-jeans-rach-goi-skinny', daysAgo: 15,
      desc: 'Phong cách distressed hiện đại với chi tiết rách gối thủ công. Chất denim co giãn cao, ôm sát nhưng không gò bó. Dành cho những ai yêu thích phong cách bụi bặm.',
      price: 580000, catId: catQuanJeans.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Xanh Đậm', size: '29', stock: 10, sku: 'JEAN-RIP-DRK-29' },
        { color: 'Xanh Đậm', size: '30', stock: 18, sku: 'JEAN-RIP-DRK-30' },
        { color: 'Xanh Đậm', size: '31', stock: 12, sku: 'JEAN-RIP-DRK-31' },
        { color: 'Xanh Đậm', size: '32', stock: 8, sku: 'JEAN-RIP-DRK-32' },
      ],
    },

    // ─── QUẦN KAKI (2) ───
    {
      name: 'Quần Kaki Slim Fit Cotton', slug: 'quan-kaki-slim-fit-cotton', daysAgo: 48,
      desc: 'Chất liệu cotton twill mềm mịn, co giãn nhẹ cho cảm giác thoải mái suốt ngày dài. Phom slim fit gọn gàng, phù hợp cả công sở lẫn dạo phố.',
      price: 420000, originalPrice: 500000, catId: catQuanKaki.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Be', size: '30', stock: 20, sku: 'KAKI-SLM-BEI-30' },
        { color: 'Be', size: '31', stock: 16, sku: 'KAKI-SLM-BEI-31' },
        { color: 'Be', size: '32', stock: 14, sku: 'KAKI-SLM-BEI-32' },
        { color: 'Xanh Rêu', size: '30', stock: 12, sku: 'KAKI-SLM-OLV-30' },
        { color: 'Xanh Rêu', size: '32', stock: 10, sku: 'KAKI-SLM-OLV-32' },
      ],
    },
    {
      name: 'Quần Kaki Baggy Ống Rộng', slug: 'quan-kaki-baggy-ong-rong', daysAgo: 20,
      desc: 'Xu hướng wide-leg trở lại mạnh mẽ. Chất kaki dày dặn, phom baggy thoáng mát, lưng cao tôn dáng. Sử dụng nút kim loại cao cấp.',
      price: 460000, catId: catQuanKaki.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Đen', size: '30', stock: 15, sku: 'KAKI-BAG-BLK-30' },
        { color: 'Đen', size: '31', stock: 12, sku: 'KAKI-BAG-BLK-31' },
        { color: 'Đen', size: '32', stock: 10, sku: 'KAKI-BAG-BLK-32' },
        { color: 'Nâu', size: '30', stock: 8, sku: 'KAKI-BAG-BRN-30' },
        { color: 'Nâu', size: '32', stock: 6, sku: 'KAKI-BAG-BRN-32' },
      ],
    },

    // ─── ÁO NỮ (4) ───
    {
      name: 'Áo Blouse Lụa Tay Phồng', slug: 'ao-blouse-lua-tay-phong', daysAgo: 53,
      desc: 'Chất liệu lụa satin mềm mại óng ả, thiết kế tay phồng nữ tính thanh lịch. Phù hợp phối cùng chân váy hoặc quần tây công sở.',
      price: 520000, originalPrice: 650000, catId: catAoNu.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Trắng', size: 'S', stock: 10, sku: 'BLOUSE-SAT-WHT-S' },
        { color: 'Trắng', size: 'M', stock: 14, sku: 'BLOUSE-SAT-WHT-M' },
        { color: 'Hồng Pastel', size: 'S', stock: 8, sku: 'BLOUSE-SAT-PNK-S' },
        { color: 'Hồng Pastel', size: 'M', stock: 12, sku: 'BLOUSE-SAT-PNK-M' },
      ],
    },
    {
      name: 'Áo Croptop Thun Gân Ôm', slug: 'ao-croptop-thun-gan-om', daysAgo: 36,
      desc: 'Thun gân co giãn 4 chiều, ôm body tôn đường cong. Chiều dài croptop vừa đủ, phối high-waist cực chất. Chất liệu cotton organic thân thiện với làn da.',
      price: 199000, originalPrice: 250000, catId: catAoNu.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Đen', size: 'S', stock: 22, sku: 'CROP-RIB-BLK-S' },
        { color: 'Đen', size: 'M', stock: 18, sku: 'CROP-RIB-BLK-M' },
        { color: 'Trắng', size: 'S', stock: 20, sku: 'CROP-RIB-WHT-S' },
        { color: 'Trắng', size: 'M', stock: 15, sku: 'CROP-RIB-WHT-M' },
        { color: 'Nâu Đất', size: 'M', stock: 10, sku: 'CROP-RIB-BRN-M' },
      ],
    },
    {
      name: 'Áo Sơ Mi Nữ Cổ V Oversize', slug: 'ao-so-mi-nu-co-v-oversize', daysAgo: 22,
      desc: 'Phom oversize rủ nhẹ nhàng, cổ V thanh thoát. Vải viscose mềm mại thoáng mát, thích hợp tiết trời nóng. Có thể mặc ngoài như áo khoác nhẹ.',
      price: 380000, catId: catAoNu.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Trắng', size: 'S', stock: 12, sku: 'SHIRTW-VIS-WHT-S' },
        { color: 'Trắng', size: 'M', stock: 16, sku: 'SHIRTW-VIS-WHT-M' },
        { color: 'Xanh Nhạt', size: 'S', stock: 10, sku: 'SHIRTW-VIS-BLU-S' },
        { color: 'Xanh Nhạt', size: 'M', stock: 12, sku: 'SHIRTW-VIS-BLU-M' },
      ],
    },
    {
      name: 'Áo Blazer Nữ Một Cúc', slug: 'ao-blazer-nu-mot-cuc', daysAgo: 10,
      desc: 'Blazer kiểu dáng Hàn Quốc, vai vuông nhẹ tạo silhouette chữ V thanh thoát. Chất liệu polyester pha spandex không nhăn, lên form chuẩn.',
      price: 890000, originalPrice: 1090000, catId: catAoNu.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Đen', size: 'S', stock: 6, sku: 'BLZR-FEM-BLK-S' },
        { color: 'Đen', size: 'M', stock: 10, sku: 'BLZR-FEM-BLK-M' },
        { color: 'Be', size: 'S', stock: 5, sku: 'BLZR-FEM-BEI-S' },
        { color: 'Be', size: 'M', stock: 8, sku: 'BLZR-FEM-BEI-M' },
      ],
    },

    // ─── VÁY & ĐẦM (3) ───
    {
      name: 'Đầm Midi Hoa Nhí Vintage', slug: 'dam-midi-hoa-nhi-vintage', daysAgo: 46,
      desc: 'Hoạ tiết hoa nhí duyên dáng phong cách vintage. Chất voan lót lụa, chiều dài midi thanh lịch. Thắt nơ eo tôn dáng.',
      price: 580000, originalPrice: 720000, catId: catVayDam.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Hoa Đỏ', size: 'S', stock: 8, sku: 'DRESS-FLR-RED-S' },
        { color: 'Hoa Đỏ', size: 'M', stock: 12, sku: 'DRESS-FLR-RED-M' },
        { color: 'Hoa Xanh', size: 'S', stock: 6, sku: 'DRESS-FLR-BLU-S' },
        { color: 'Hoa Xanh', size: 'M', stock: 10, sku: 'DRESS-FLR-BLU-M' },
      ],
    },
    {
      name: 'Váy A Denim Mini', slug: 'vay-a-denim-mini', daysAgo: 28,
      desc: 'Chất denim co giãn, dáng chữ A trẻ trung năng động. Cúc kim loại phía trước tạo điểm nhấn. Mix match dễ dàng với mọi kiểu áo.',
      price: 350000, catId: catVayDam.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Xanh Nhạt', size: 'S', stock: 14, sku: 'SKIRT-DEN-LBL-S' },
        { color: 'Xanh Nhạt', size: 'M', stock: 18, sku: 'SKIRT-DEN-LBL-M' },
        { color: 'Xanh Đậm', size: 'S', stock: 10, sku: 'SKIRT-DEN-DBL-S' },
        { color: 'Xanh Đậm', size: 'M', stock: 12, sku: 'SKIRT-DEN-DBL-M' },
      ],
    },
    {
      name: 'Đầm Cocktail Đen Cổ Yếm', slug: 'dam-cocktail-den-co-yem', daysAgo: 8,
      desc: 'Little Black Dress phiên bản cổ yếm quyến rũ. Chất liệu crepe rũ đẹp, lưng hở tạo điểm nhấn. Hoàn hảo cho tiệc tối và sự kiện.',
      price: 1290000, catId: catVayDam.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80', isPrimary: false },
      ],
      variants: [
        { color: 'Đen', size: 'S', stock: 4, sku: 'DRESS-CTL-BLK-S' },
        { color: 'Đen', size: 'M', stock: 6, sku: 'DRESS-CTL-BLK-M' },
        { color: 'Đỏ Rượu', size: 'S', stock: 3, sku: 'DRESS-CTL-WIN-S' },
        { color: 'Đỏ Rượu', size: 'M', stock: 5, sku: 'DRESS-CTL-WIN-M' },
      ],
    },

    // ─── THẮT LƯNG (2) ───
    {
      name: 'Thắt Lưng Da Bò Khóa Kim', slug: 'that-lung-da-bo-khoa-kim', daysAgo: 54,
      desc: 'Da bò thật 100% thuộc thủ công, bề mặt vân tự nhiên sang trọng. Khóa kim loại nguyên khối không gỉ, mạ vàng champagne tinh tế.',
      price: 350000, originalPrice: 420000, catId: catThatLung.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Nâu', size: '95cm', stock: 15, sku: 'BELT-COW-BRN-95' },
        { color: 'Nâu', size: '105cm', stock: 12, sku: 'BELT-COW-BRN-105' },
        { color: 'Đen', size: '95cm', stock: 18, sku: 'BELT-COW-BLK-95' },
        { color: 'Đen', size: '105cm', stock: 14, sku: 'BELT-COW-BLK-105' },
      ],
    },
    {
      name: 'Thắt Lưng Vải Dù Khóa Tự Động', slug: 'that-lung-vai-du-khoa-tu-dong', daysAgo: 32,
      desc: 'Dây vải dù siêu bền nhẹ, khóa tự động nam châm điều chỉnh vô cấp. Phong cách sporty hiện đại, phù hợp jean và quần kaki.',
      price: 199000, catId: catThatLung.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Đen', size: 'Free Size', stock: 30, sku: 'BELT-NYL-BLK-F' },
        { color: 'Xanh Navy', size: 'Free Size', stock: 20, sku: 'BELT-NYL-NAV-F' },
      ],
    },

    // ─── VÍ DA (2) ───
    {
      name: 'Ví Da Bò Dáng Dài Khâu Tay', slug: 'vi-da-bo-dang-dai-khau-tay', daysAgo: 49,
      desc: 'Ví dài handmade từ da bò Ý nhập khẩu, đường khâu tay saddle stitch bền bỉ. 8 ngăn thẻ, 2 ngăn tiền, 1 ngăn kéo khóa đựng xu.',
      price: 690000, originalPrice: 850000, catId: catViDa.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Nâu Bò', size: 'Free Size', stock: 10, sku: 'WALLET-LNG-BRN-F' },
        { color: 'Đen', size: 'Free Size', stock: 8, sku: 'WALLET-LNG-BLK-F' },
      ],
    },
    {
      name: 'Ví Da Compact Card Holder', slug: 'vi-da-compact-card-holder', daysAgo: 14,
      desc: 'Thiết kế siêu mỏng gọn, chỉ chứa thẻ và tiền gấp. Da Saffiano vân chéo chống trầy hiệu quả. Phong cách minimalist cho người yêu sự tối giản.',
      price: 350000, catId: catViDa.id,
      images: [
        { url: 'https://images.unsplash.com/photo-1606503153255-59d5e417c4ed?w=800&q=80', isPrimary: true },
      ],
      variants: [
        { color: 'Đen', size: 'Free Size', stock: 15, sku: 'WALLET-CRD-BLK-F' },
        { color: 'Xanh Navy', size: 'Free Size', stock: 10, sku: 'WALLET-CRD-NAV-F' },
        { color: 'Nâu', size: 'Free Size', stock: 8, sku: 'WALLET-CRD-BRN-F' },
      ],
    },
  ];

  // Create all products
  const createdProducts: any[] = [];
  for (const p of productSeeds) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.desc,
        price: p.price,
        originalPrice: p.originalPrice ?? null,
        categoryId: p.catId,
        createdAt: daysAgo(p.daysAgo),
        images: { create: p.images },
        variants: { create: p.variants },
      },
      include: { variants: true },
    });
    createdProducts.push(product);
  }
  console.log(`✓ ${createdProducts.length} products created.\n`);

  // ══════════════════════════════════════════════
  // 4. ORDERS (~50 đơn hàng rải 60 ngày)
  // ══════════════════════════════════════════════
  console.log('📦 Seeding orders...');

  const statusDistribution: { status: OrderStatus; paymentStatus: PaymentStatus; weight: number }[] = [
    { status: 'DELIVERED', paymentStatus: 'PAID', weight: 27 },
    { status: 'SHIPPING', paymentStatus: 'PAID', weight: 5 },
    { status: 'CONFIRMED', paymentStatus: 'PENDING', weight: 3 },
    { status: 'PREPARING', paymentStatus: 'PENDING', weight: 3 },
    { status: 'PENDING', paymentStatus: 'PENDING', weight: 5 },
    { status: 'CANCELLED', paymentStatus: 'FAILED', weight: 5 },
    { status: 'RETURNED', paymentStatus: 'PAID', weight: 2 },
  ];

  const totalWeight = statusDistribution.reduce((s, d) => s + d.weight, 0);
  const allOrders: any[] = [];

  for (let i = 0; i < 50; i++) {
    const customer = pick(customers);
    const dayOffset = randomInt(1, 58);
    const orderDate = daysAgo(dayOffset);

    // Pick status based on weight distribution
    let rand = Math.random() * totalWeight;
    let chosen = statusDistribution[0];
    for (const d of statusDistribution) {
      rand -= d.weight;
      if (rand <= 0) { chosen = d; break; }
    }

    // Recent orders shouldn't be DELIVERED
    if (dayOffset <= 5 && chosen.status === 'DELIVERED') {
      chosen = { status: 'SHIPPING', paymentStatus: 'PAID', weight: 0 };
    }

    // Pick 1-3 random products for order items
    const numItems = randomInt(1, 3);
    const orderProducts = Array.from({ length: numItems }, () => pick(createdProducts));
    const orderItems = orderProducts.map((prod) => {
      const variant = pick(prod.variants) as { id: string };
      const qty = randomInt(1, 2);
      return {
        variantId: variant.id,
        quantity: qty,
        price: Number(prod.price),
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        orderNumber: orderNumber(i + 1),
        recipientName: customer.name,
        phone: customer.phone || '0900000000',
        shippingAddress: customer.address || '',
        totalAmount,
        status: chosen.status,
        paymentMethod: 'COD',
        paymentStatus: chosen.paymentStatus,
        notes: randomInt(1, 4) === 1 ? pick([
          'Giao giờ hành chính',
          'Gọi trước khi giao',
          'Để ở bảo vệ nếu không có người nhận',
          'Ship nhanh giúp mình nhé',
          'Gói quà tặng',
        ]) : null,
        createdAt: orderDate,
        items: { create: orderItems },
      },
      include: { items: true },
    });
    allOrders.push({ ...order, status: chosen.status });
  }
  console.log(`✓ ${allOrders.length} orders created.\n`);

  // ══════════════════════════════════════════════
  // 5. REVIEWS (~35 đánh giá cho đơn DELIVERED)
  // ══════════════════════════════════════════════
  console.log('⭐ Seeding reviews...');

  const deliveredOrders = allOrders.filter((o) => o.status === 'DELIVERED');

  const reviewComments: { rating: number; comments: string[] }[] = [
    {
      rating: 5,
      comments: [
        'Sản phẩm mặc lên phom dáng cực kỳ thời trang và cao cấp. Đường may tỉ mỉ, chất liệu cao cấp mượt mà đúng như mô tả. Xứng đáng 5 sao!',
        'Chất lượng tuyệt vời, vượt mong đợi so với giá tiền. Ship nhanh, đóng gói cẩn thận. Sẽ ủng hộ tiếp!',
        'Đây là lần thứ 3 mình mua ở FashionHub. Lần nào cũng hài lòng. Sản phẩm y hình, size chuẩn.',
        'Mẫu mã đẹp, chất vải mát mịn. Mình đã mặc thử ngay khi nhận và rất ưng ý. Recommend cho mọi người!',
        'Xuất sắc! Từ chất liệu, đường may đến phom dáng đều rất tốt. Cảm ơn FashionHub nhé.',
        'Sản phẩm đúng mô tả, giao hàng nhanh, thái độ phục vụ tốt. 10 điểm!',
        'Quá đẹp luôn ạ! Mặc vào ai cũng khen. Chất vải mát, mặc cả ngày không bí.',
      ],
    },
    {
      rating: 4,
      comments: [
        'Áo đẹp sang xịn mịn. Chỉ tiếc là chọn size hơi ôm một xíu, lần sau sẽ đặt lên một size. Ship hàng nhanh.',
        'Chất lượng tốt, form đẹp. Màu thực tế hơi nhạt hơn ảnh một chút nhưng vẫn OK.',
        'Sản phẩm ổn, đáng tiền. Giao hàng nhanh, đóng gói kỹ lưỡng. Trừ 1 sao vì chỉ có 2 màu để chọn.',
        'Mua tặng người yêu, bạn ấy rất thích. Vải mềm mát, kiểu dáng đẹp. Chỉ hơi nhăn sau lần giặt đầu.',
        'Sản phẩm đúng hình, chất vải OK. Đường may khá tốt nhưng có vài chỗ sợi chỉ thừa nhỏ.',
        'Form đẹp, mặc thoải mái. Giá hơi cao so với mặt bằng chung nhưng chất lượng xứng đáng.',
      ],
    },
    {
      rating: 3,
      comments: [
        'Sản phẩm tạm ổn, không quá nổi bật nhưng cũng không tệ. Chất vải mặc được, giá hợp lý.',
        'Size hơi lớn so với bảng size. Chất lượng bình thường, không có gì đặc biệt.',
        'Giao hàng hơi chậm, sản phẩm OK nhưng kỳ vọng nhiều hơn. Có lẽ do ảnh trên web đẹp quá.',
        'Mua thử lần đầu. Sản phẩm ổn nhưng chưa wow. Sẽ cân nhắc mua tiếp.',
      ],
    },
    {
      rating: 2,
      comments: [
        'Chất vải hơi mỏng so với mong đợi. Đường may có chỗ chưa được tỉ mỉ lắm.',
        'Size không chuẩn, phải đổi một lần. Chất lượng trung bình.',
      ],
    },
    {
      rating: 1,
      comments: [
        'Sản phẩm khác xa hình ảnh. Chất vải không tốt như mô tả. Khá thất vọng.',
      ],
    },
  ];

  // Rating distribution weights: 5⭐ 40%, 4⭐ 30%, 3⭐ 15%, 2⭐ 10%, 1⭐ 5%
  const ratingWeights = [
    { rating: 5, weight: 40 },
    { rating: 4, weight: 30 },
    { rating: 3, weight: 15 },
    { rating: 2, weight: 10 },
    { rating: 1, weight: 5 },
  ];
  const totalRatingWeight = 100;

  const reviewedProductUserPairs = new Set<string>();
  let reviewCount = 0;
  const targetReviews = Math.min(35, deliveredOrders.length);

  for (const order of deliveredOrders) {
    if (reviewCount >= targetReviews) break;

    // Find the product for the first order item
    for (const item of order.items) {
      if (reviewCount >= targetReviews) break;

      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) continue;

      const pairKey = `${order.userId}-${variant.productId}`;
      if (reviewedProductUserPairs.has(pairKey)) continue;
      reviewedProductUserPairs.add(pairKey);

      // Pick rating based on weight
      let rRand = Math.random() * totalRatingWeight;
      let chosenRating = 5;
      for (const rw of ratingWeights) {
        rRand -= rw.weight;
        if (rRand <= 0) { chosenRating = rw.rating; break; }
      }

      const ratingGroup = reviewComments.find((r) => r.rating === chosenRating)!;
      const comment = pick(ratingGroup.comments);

      // Some reviews have images (~30%)
      const hasImages = Math.random() < 0.3;
      const reviewImages = hasImages
        ? [pick(createdProducts).images?.[0]?.url || 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80']
        : [];

      // Review date: 1-7 days after order
      const reviewDate = new Date(order.createdAt);
      reviewDate.setDate(reviewDate.getDate() + randomInt(1, 7));

      await prisma.review.create({
        data: {
          userId: order.userId,
          productId: variant.productId,
          rating: chosenRating,
          comment,
          images: reviewImages,
          isActive: true,
          createdAt: reviewDate,
        },
      });
      reviewCount++;
    }
  }
  console.log(`✓ ${reviewCount} reviews created.\n`);

  console.log('🎉 Database seeding complete!');
  console.log('────────────────────────────────────');
  console.log(`  Users:      1 admin + ${customers.length} customers`);
  console.log(`  Categories: 12`);
  console.log(`  Products:   ${createdProducts.length}`);
  console.log(`  Orders:     ${allOrders.length}`);
  console.log(`  Reviews:    ${reviewCount}`);
  console.log('────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
