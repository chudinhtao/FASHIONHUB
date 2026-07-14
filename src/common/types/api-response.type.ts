export interface IApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
}

export interface IPaginatedMeta {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface IPaginatedResponse<T> {
  statusCode: number;
  message: string;
  data: T[];
  meta: IPaginatedMeta;
}
