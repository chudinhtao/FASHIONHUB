# Tài Liệu Kiến Trúc Tổng Thể: FashionHub

Tài liệu này mô tả chi tiết kiến trúc hệ thống, sơ đồ luồng dữ liệu, cách tổ chức thành phần và các quyết định kỹ thuật cốt lõi được áp dụng cho dự án cửa hàng thời trang bán quần áo **FashionHub**.

---

## 📐 1. Sơ Đồ Kiến Trúc (System Architecture)

Dự án áp dụng kiến trúc **Monolith + Separated Frontend** (Kiến trúc A), trong đó Frontend Next.js (phục vụ khách hàng & quản trị) chạy độc lập và giao tiếp với Backend NestJS thông qua các HTTP REST APIs bảo mật.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                                                                 │
│   Trình duyệt Khách hàng / Admin                                │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │   Next.js App (Next.js 14+/15+ App Router)              │   │
│   │   - Pages & Layouts (RSC & Client Components)           │   │
│   │   - Business Features (Auth, Product, Cart, Order...)    │   │
│   │   - Styling: Ant Design (antd) + Tailwind CSS (v4)      │   │
│   │   - State: Zustand (Client) & React Query (Server State)│   │
│   │   - HTTP Client: Axios (Auto refresh token interceptor) │   │
│   └───────────────────────────┬─────────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────────┘
                                │ HTTPS / REST (JSON)
                                │ Authorization: Bearer <JWT>
┌───────────────────────────────▼─────────────────────────────────┐
│                        BACKEND LAYER                            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    NestJS Application                   │   │
│   │   - Guards / Middlewares (JWT Authentication)           │   │
│   │   - Global Exception Filter (Chuẩn hóa error responses) │   │
│   │   - Modules: Users, Auth, Categories, Products, Orders, Dashboard  │   │
│   │   - Serve-Static (Phục vụ hình ảnh từ thư mục uploads)  │   │
│   │   - Data Access Layer: Prisma Service                   │   │
│   └───────────────────────────┬─────────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                      ┌─────────┴─────────┐
                      ▼                   ▼
               [PostgreSQL DB]         [Redis]
                 (Primary DB)     (Cache/Session)
                      │
                      ▼
               [Local Storage]
              (backend/uploads)
```

---

## 🔄 2. Luồng Dữ Liệu Chính (Data Flows)

### 2.1 Luồng Đăng Nhập & Quản Lý Token
1. **Frontend:** Người dùng gửi `email` và `password` qua Form đăng nhập -> gọi API `POST /api/v1/auth/login`.
2. **Backend:** 
   - `AuthService` kiểm tra tài khoản, đối chiếu mật khẩu đã băm (Bcrypt) -> Đúng tài khoản.
   - Ký nhận 2 JWT Tokens: `AccessToken` (hạn dùng ngắn, ví dụ: 15 phút) và `RefreshToken` (hạn dùng dài, ví dụ: 7 ngày).
   - Lưu trữ Refresh Token vào Database hoặc Redis (dưới dạng hash).
   - Thiết lập Cookie HttpOnly chứa `refresh_token` trong phản hồi HTTP, trả về `access_token` trong JSON body.
3. **Frontend:** Nhận `access_token` và lưu vào memory (Zustand state). Khi call các API cần quyền hạn, tự động gắn vào Header `Authorization: Bearer <access_token>`.
4. **Tự động refresh:** Khi Access Token hết hạn, API trả về lỗi `401 Unauthorized`. Axios Interceptor ở Frontend bắt lỗi này, tự động gọi API `POST /api/v1/auth/refresh` (cookie HttpOnly chứa refresh token tự động đính kèm theo request). Backend cấp mới Access Token, Axios lưu lại và thực hiện lại request bị lỗi trước đó mượt mà không làm gián đoạn trải nghiệm người dùng.

### 2.2 Luồng Đặt Hàng & Hoàn Kho Khi Hủy Đơn
1. **Đặt hàng:**
   - Khách hàng điền thông tin và nhấn Đặt hàng COD.
   - Backend tiếp nhận request -> Gọi Transaction trong Prisma:
     - Tạo bản ghi mới trong bảng `orders` và `order_items`.
     - Lần lượt trừ đi số lượng tồn kho (`stock`) trong bảng `product_variants` của từng món hàng được mua.
     - Xóa các item tương ứng trong giỏ hàng (`cart_items`) của người dùng.
     - Commit transaction thành công -> Trả về đơn hàng.
2. **Hủy đơn & Hoàn kho:**
   - Khách hàng gửi yêu cầu hủy đơn hàng (API `POST /api/v1/orders/:id/cancel`).
   - Backend kiểm tra nếu trạng thái đơn là `PENDING` (Chờ xác nhận):
     - Chuyển trạng thái đơn hàng sang `CANCELLED`.
     - Chạy Prisma transaction để cộng trả lại số lượng tồn kho (`stock`) của các biến thể sản phẩm tương ứng trong đơn hàng đó vào lại kho.
     - Commit thành công.

---

## 🛠️ 3. Quyết Định Kỹ Thuật & Lý Do Chọn (Technical Decisions)

### 3.1 Next.js App Router (RSC + Client Components)
*   **Lý do:** Next.js cung cấp cơ chế render tối ưu. Các trang như Trang chủ, Danh sách sản phẩm được render tĩnh hoặc render trên server (React Server Components) giúp tăng tốc độ phản hồi trang đầu tiên (FCP) và tối ưu SEO vượt trội so với Client-only SPA (Vite).
*   **Ant Design SSR:** Sử dụng `@ant-design/nextjs-registry` để kết xuất các styles của Ant Design trực tiếp trong HTML gốc trả về từ server, loại bỏ triệt để hiện tượng vỡ giao diện trong 0.5s đầu khi tải trang (Style Flash).

### 3.2 Prisma ORM & PostgreSQL
*   **Lý do:** PostgreSQL có tính toàn vẹn dữ liệu cao, hỗ trợ quan hệ chặt chẽ (cực kỳ quan trọng với đơn hàng, tồn kho và biến thể sản phẩm). Prisma giúp quản lý database bằng TypeScript hoàn toàn, tự động tạo migrations an toàn và có các API truy vấn trực quan, dễ phát triển.

### 3.3 Lưu trữ hình ảnh Cục bộ (Local File Storage) & @nestjs/serve-static
*   **Lý do:** Đối với phiên bản MVP, việc sử dụng Cloudflare R2 hay AWS S3 sẽ làm tăng độ phức tạp khi thiết lập (cần đăng ký tài khoản, cấu hình API Keys, CDN). Bằng việc lưu ảnh upload trực tiếp tại thư mục `backend/uploads` và cấu hình serve tĩnh, hệ thống có thể chạy độc lập 100% ở local một cách dễ dàng và hoàn toàn miễn phí. Khi mở rộng, chỉ cần đổi module Storage sang S3 client là xong mà không ảnh hưởng cấu trúc DB.

### 3.4 Zustand & TanStack React Query
*   **Lý do:** Zustand cực kỳ thích hợp cho các client-state mỏng như trạng thái Đăng nhập hay thông tin Giỏ hàng tạm thời. Trong khi đó, React Query giúp đơn giản hóa việc quản lý dữ liệu gọi từ API (Server State) với các tính năng tự động caching, refresh dữ liệu ngầm, quản lý trạng thái Loading/Error đồng bộ.
