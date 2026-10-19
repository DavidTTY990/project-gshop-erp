/**
 * code：'AUTH' 帳密錯誤、'NETWORK' 連線失敗，其餘為後端業務錯誤（例 'DUPLICATE_PHONE'）或無 code。
 * data：後端隨錯誤附帶的資料（例：重複電話的既有客人）。
 */
export class ApiError extends Error {
  code?: string;
  data?: unknown;

  constructor(message: string, code?: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
}
