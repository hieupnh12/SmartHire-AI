export interface BankAccountConfig {
  bankId: string;
  bankName: string;
  shortName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
}

export const DEFAULT_BANK_CONFIG: BankAccountConfig = {
  bankId: "970407", // Techcombank BIN
  shortName: "TCB",
  bankName: "Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)",
  accountNumber: "190388889999",
  accountName: "CONG TY CP CONG NGHE SMARTHIRE VIET NAM",
  branch: "Chi nhánh Hà Nội",
};

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
