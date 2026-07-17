import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      try {
        const result = super.canActivate(context);
        if (result instanceof Promise) {
          await result;
        } else if (result && typeof (result as any).toPromise === 'function') {
          await (result as any).toPromise();
        }
      } catch (err) {
        // Hủy kích hoạt lỗi xác thực đối với các Route công khai (Public)
        // Cho phép req.user trống để xử lý dưới dạng Khách vãng lai
      }
      return true;
    }

    const result = super.canActivate(context);
    if (result instanceof Promise) {
      return await result;
    }
    return result as boolean;
  }
}
