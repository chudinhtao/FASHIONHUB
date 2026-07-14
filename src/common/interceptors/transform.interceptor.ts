import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((result) => {
        // Nếu kết quả trả về từ controller chứa data và meta (phân trang)
        if (result && result.data !== undefined && result.meta !== undefined) {
          return {
            statusCode,
            message: result.message || 'Thao tác thành công',
            data: result.data,
            meta: result.meta,
          };
        }

        // Trường hợp thông thường
        return {
          statusCode,
          message: (result && result.message) || 'Thao tác thành công',
          data: result && result.data !== undefined ? result.data : result,
        };
      }),
    );
  }
}
