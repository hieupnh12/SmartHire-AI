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
  if (!token || query.isError) return <Navigate to="/admin/login" replace />;
  if (query.isPending) return <p role="status" className="p-6">?ang ki?m tra phi?n ??ng nh?p?</p>;
  if (query.data?.data?.role !== "SUPER_ADMIN") return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
