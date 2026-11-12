export interface BankAccountConfig {
  bankId: string;
  bankName: string;
  shortName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
}

export const DEFAULT_BANK_CONFIG: BankAccountConfig = {
  bankId: "970423", // TPBank BIN
  shortName: "TPBank",
  bankName: "Ngân hàng TMCP Tiên Phong (TPBank)",
  accountNumber: "07744348801",
  accountName: "NGUYEN NHAT SINH",
  branch: "Chi nhánh Đà Nẵng",
};

export const PAYMENT_BANK_INFO = DEFAULT_BANK_CONFIG;

/**
 * Generate standard VietQR image URL
 * @param amount Amount in VND
 * @param invoiceNumber Invoice code (e.g. INV-202609-1234)
 * @param config Optional bank configuration
 */
export function generateVietQrUrl(
  amount: number,
  invoiceNumber: string,
  config: BankAccountConfig = DEFAULT_BANK_CONFIG
): string {
  const transferSyntax = `SH ${invoiceNumber}`;
  const encodedContent = encodeURIComponent(transferSyntax);
  const encodedAccountName = encodeURIComponent(config.accountName);
  const roundedAmount = Math.round(amount);

  return `https://img.vietqr.io/image/${config.shortName}-${config.accountNumber}-compact2.png?amount=${roundedAmount}&addInfo=${encodedContent}&accountName=${encodedAccountName}`;
}
