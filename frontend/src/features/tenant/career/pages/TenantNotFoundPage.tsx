import { FileQuestion } from "lucide-react";

interface TenantNotFoundPageProps {
  subdomain: string;
}

export function TenantNotFoundPage({ subdomain }: TenantNotFoundPageProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-4">
      <FileQuestion className="w-16 h-16 text-slate-400 mb-6 stroke-[1.5]" />
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">404 - Không tìm thấy trang</h1>
      <p className="text-slate-500 text-sm max-w-sm">
        Không thể kết nối đến <strong className="font-medium text-slate-700">"{subdomain}"</strong>. Tên miền này có thể không tồn tại hoặc chưa được đăng ký.
      </p>
    </div>
  );
}
