export const ErrorMessages = {
  // Xác thực & Người dùng (Auth & User)
  AUTH: {
    USER_NOT_FOUND: 'Không tìm thấy thông tin tài khoản người dùng này.',
    EMAIL_ALREADY_EXISTS: 'Địa chỉ email này đã được đăng ký trên hệ thống.',
    WRONG_PASSWORD: 'Mật khẩu nhập vào không chính xác.',
    UNAUTHORIZED: 'Yêu cầu đăng nhập để truy cập tài nguyên này.',
    FORBIDDEN: 'Bạn không có quyền thực hiện hành động này.',
    INVALID_TOKEN: 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
    REFRESH_TOKEN_EXPIRED: 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.',
  },
  
  // Danh mục sản phẩm (Category)
  CATEGORY: {
    NOT_FOUND: 'Không tìm thấy danh mục thời trang này.',
    SLUG_EXISTS: 'Slug của danh mục này đã được sử dụng.',
    HAS_PRODUCTS: 'Không thể xóa danh mục này vì đang có sản phẩm thuộc danh mục này.',
  },
  
  // Sản phẩm & Biến thể (Product & Variant)
  PRODUCT: {
    NOT_FOUND: 'Không tìm thấy sản phẩm thời trang này.',
    SLUG_EXISTS: 'Slug của sản phẩm này đã được sử dụng.',
    SKU_EXISTS: 'Mã SKU của biến thể sản phẩm này đã tồn tại.',
    VARIANT_NOT_FOUND: 'Không tìm thấy biến thể sản phẩm (size/màu sắc) yêu cầu.',
    OUT_OF_STOCK: 'Sản phẩm hiện tại đã hết hàng hoặc số lượng tồn kho không đủ đáp ứng.',
  },
  
  // Đơn hàng (Order)
  ORDER: {
    NOT_FOUND: 'Không tìm thấy thông tin đơn hàng yêu cầu.',
    CANNOT_CANCEL: 'Chỉ được phép hủy đơn hàng khi trạng thái đang là Chờ xử lý (PENDING).',
    STATUS_INVALID: 'Trạng thái chuyển đổi của đơn hàng không hợp lệ.',
  },
  
  // Đánh giá sản phẩm (Review)
  REVIEW: {
    ALREADY_EXISTS: 'Bạn đã gửi đánh giá cho sản phẩm này rồi.',
    NOT_ALLOWED: 'Chỉ được phép đánh giá các sản phẩm bạn đã mua và đơn hàng đã hoàn thành giao hàng.',
  },
  
  // Hệ thống & Validate (System & Common Validation)
  SYSTEM: {
    INTERNAL_SERVER_ERROR: 'Có lỗi hệ thống xảy ra, vui lòng thử lại sau.',
    VALIDATION_FAILED: 'Dữ liệu gửi lên không đúng định dạng yêu cầu.',
  },
};
