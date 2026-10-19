/** code：'AUTH' 帳密錯誤、'NETWORK' 連線失敗，其餘為後端錯誤（無 code） */
export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}
