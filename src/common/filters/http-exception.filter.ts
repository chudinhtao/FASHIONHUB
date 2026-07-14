import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    let message = 'Internal Server Error';
    let error = 'Internal Server Error';
    let details: any[] | null = null;

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resObj = exceptionResponse as any;
        message = resObj.message || message;
        error = resObj.error || error;
        if (Array.isArray(resObj.message)) {
          // Xử lý validation errors từ class-validator
          details = resObj.message.map((msg: string) => {
            // Lấy từ đầu tiên làm tên field (ví dụ: "email must be an email" -> field: "email")
            const field = msg.split(' ')[0] || 'field';
            return { field, message: msg };
          });
          message = 'Validation Failed';
        } else if (resObj.details) {
          details = resObj.details;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
