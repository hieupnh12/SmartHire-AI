/**
 * Utility to localize AI comments and evaluations to 100% Vietnamese.
 * Handles both new submissions (which are instructed in Vietnamese) and
 * legacy submissions with English evaluation text in the database.
 */

const EXACT_MAPPINGS: [RegExp, string][] = [
  [
    /The code correctly implements the arithmetic progression formula to calculate the sum from 1 to n in O\(1\) time complexity\. It is clean, concise, and optimal\./gi,
    "Mã nguồn cài đặt chính xác công thức cấp số cộng để tính tổng từ 1 đến n với độ phức tạp thời gian O(1). Thuật toán ngắn gọn, sạch sẽ và tối ưu."
  ],
  [
    /The code is extremely clean, well-structured, and contains no unnecessary boilerplate\./gi,
    "Mã nguồn rất sạch sẽ, cấu trúc rõ ràng và không có đoạn mã thừa thãi."
  ],
  [
    /The code correctly implements the formula to calculate the sum from 1 to n/gi,
    "Mã nguồn cài đặt chính xác công thức tính tổng từ 1 đến n"
  ],
  [
    /The code correctly implements (.*)/gi,
    "Mã nguồn cài đặt chính xác $1"
  ],
  [
    /The code is clean, concise, and optimal\./gi,
    "Mã nguồn sạch sẽ, ngắn gọn và tối ưu."
  ],
  [
    /The code is clean, optimal, and follows good practices\./gi,
    "Mã nguồn sạch, tối ưu và tuân thủ các quy ước lập trình chuẩn."
  ],
  [
    /The code is well-structured and easy to read\./gi,
    "Mã nguồn có cấu trúc tốt, rõ ràng và dễ đọc."
  ],
  [
    /The solution is clean, concise, and optimal\./gi,
    "Giải pháp sạch sẽ, ngắn gọn và tối ưu."
  ],
  [
    /The solution is optimal\./gi,
    "Giải pháp đạt mức tối ưu cao."
  ],
  [
    /The code contains no unnecessary boilerplate\./gi,
    "Mã nguồn không có cú pháp thừa thãi."
  ],
  [
    /Naming conventions are clear and descriptive\./gi,
    "Quy ước đặt tên biến và hàm rõ ràng, chuẩn mực."
  ],
  [
    /Clean and well-structured\./gi,
    "Mã nguồn sạch sẽ và có cấu trúc tốt."
  ],
  [
    /Time complexity is optimal\./gi,
    "Độ phức tạp thời gian đạt mức tối ưu."
  ],
  [
    /Space complexity is optimal\./gi,
    "Độ phức tạp bộ nhớ đạt mức tối ưu."
  ],
  [
    /No answer submitted/gi,
    "Chưa nộp câu trả lời."
  ],
  [
    /Automatic grading unavailable\. Retry or review manually\./gi,
    "Chấm điểm tự động tạm thời chưa khả dụng. Vui lòng chấm thủ công hoặc thử lại sau."
  ],
  [
    /All test cases passed successfully\./gi,
    "Tất cả các ca kiểm thử đều vượt qua thành công."
  ],
  [
    /Good exception safety\./gi,
    "Xử lý ngoại lệ an toàn và chặt chẽ."
  ]
];

export function localizeAiComment(text?: string | null): string {
  if (!text) return "";
  let s = text.trim();

  for (const [regex, replacement] of EXACT_MAPPINGS) {
    s = s.replace(regex, replacement);
  }

  // Handle inline bullet points: "• the code is..." -> "• Mã nguồn..."
  s = s.replace(/•\s*the code is extremely clean, well-structured, and contains no unnecessary boilerplate\./gi,
    "• Mã nguồn rất sạch sẽ, cấu trúc rõ ràng và không có đoạn mã thừa thãi.");
  s = s.replace(/•\s*the code is/gi, "• Mã nguồn");

  return s;
}

