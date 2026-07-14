import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Ngoại lệ dành cho các lỗi vi phạm quy tắc nghiệp vụ (ví dụ: sản phẩm hết kho, không thể hủy đơn...).
 * Mặc định trả về mã HTTP 400 Bad Request.
 */
export class BusinessException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode: status,
        message,
        error: 'Business Error',
      },
      status,
    );
  }
}
