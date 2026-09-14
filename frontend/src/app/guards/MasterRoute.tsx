import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { masterAuthApi } from "@/api/master/masterAuthApi";

export function MasterRoute() {
  const token = localStorage.getItem("master_access_token");
  const query = useQuery({
    queryKey: ["master-session", token],
    queryFn: () => masterAuthApi.me(token!),
    enabled: Boolean(token),
    retry: false,
  });
  if (!token) return <Navigate to="/admin/login" replace />;
  if (query.isError) {
    localStorage.removeItem("master_access_token");
    return <Navigate to="/admin/login" replace />;
  }
  if (query.isPending) return <p role="status" className="p-6">Đang kiểm tra phiên đăng nhập...</p>;
  if (query.data?.data?.role !== "SUPER_ADMIN") {
    localStorage.removeItem("master_access_token");
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
