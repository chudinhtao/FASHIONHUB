import { IsNotEmpty, IsString, IsOptional, IsInt, Min, Max, IsUUID, IsArray, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'ID sản phẩm không được để trống' })
  @IsUUID('4', { message: 'ID sản phẩm phải là định dạng UUID' })
  productId: string;

  @IsNotEmpty({ message: 'Số sao đánh giá không được để trống' })
  @IsInt({ message: 'Số sao đánh giá phải là số nguyên' })
  @Min(1, { message: 'Đánh giá tối thiểu là 1 sao' })
  @Max(5, { message: 'Đánh giá tối đa là 5 sao' })
  rating: number;

  @IsOptional()
  @IsString({ message: 'Bình luận phải là chuỗi văn bản' })
  @MaxLength(1000, { message: 'Bình luận không được vượt quá 1000 ký tự' })
  comment?: string;

  @IsOptional()
  @IsArray({ message: 'Hình ảnh phải là danh sách chuỗi' })
  @IsString({ each: true, message: 'Đường dẫn ảnh phải là chuỗi' })
  images?: string[];
}
