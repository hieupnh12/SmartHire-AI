/** Backend ApiResponse envelope — com.smarthire.common.api.ApiResponse */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  code?: string | null;
  errors?: Record<string, string> | null;
  timestamp?: string;
};

export type PageMeta = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type Role = "ADMIN" | "RECRUITER" | "CANDIDATE";
