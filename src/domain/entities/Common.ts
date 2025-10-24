export interface GeospatialQuery {
  latitude: number;
  longitude: number;
  radiusInKm: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: any;
  total?: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}