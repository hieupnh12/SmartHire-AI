import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { companyApi } from "@/api/tenant/companyApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import type { CompanyDirectory } from "../types";

const inputClass =
  "h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-card px-3 text-sm text-[var(--color-text-primary)] outline-none transition-all duration-150 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 placeholder:text-[var(--color-text-secondary)]/50";

/* Default sample templates for fast onboarding */
const SAMPLE_PRESETS: { locations: string[]; departments: string[]; locationDepartments: Record<string, string[]> } = {
  locations: [
    "Trụ sở Hà Nội — Tầng 12, Enterprise Tower, Cầu Giấy",
    "Chi nhánh TP. Hồ Chí Minh — Tầng 8, Bitexco Financial Tower, Quận 1",
    "Chi nhánh Đà Nẵng — Tòa nhà FPT Complex, Ngũ Hành Sơn",
    "Làm việc từ xa (Remote / Hybrid)",
  ],
  departments: [
    "Kỹ thuật & Công nghệ (Engineering)",
    "Quản lý Sản phẩm (Product Management)",
    "Nhân sự & Tuyển dụng (HR & Talent)",
    "Kinh doanh & Phát triển thị trường (Sales)",
    "Tiếp thị & Truyền thông (Marketing)",
    "Tài chính & Kế toán (Finance)",
    "Chăm sóc khách hàng (Customer Success)",
  ],
  locationDepartments: {
    "Trụ sở Hà Nội — Tầng 12, Enterprise Tower, Cầu Giấy": [
      "Kỹ thuật & Công nghệ (Engineering)",
      "Quản lý Sản phẩm (Product Management)",
      "Nhân sự & Tuyển dụng (HR & Talent)",
      "Tiếp thị & Truyền thông (Marketing)",
      "Tài chính & Kế toán (Finance)",
    ],
    "Chi nhánh TP. Hồ Chí Minh — Tầng 8, Bitexco Financial Tower, Quận 1": [
      "Kinh doanh & Phát triển thị trường (Sales)",
      "Tiếp thị & Truyền thông (Marketing)",
      "Chăm sóc khách hàng (Customer Success)",
      "Nhân sự & Tuyển dụng (HR & Talent)",
    ],
    "Chi nhánh Đà Nẵng — Tòa nhà FPT Complex, Ngũ Hành Sơn": [
      "Kỹ thuật & Công nghệ (Engineering)",
      "Quản lý Sản phẩm (Product Management)",
    ],
    "Làm việc từ xa (Remote / Hybrid)": [
      "Kỹ thuật & Công nghệ (Engineering)",
      "Tiếp thị & Truyền thông (Marketing)",
      "Quản lý Sản phẩm (Product Management)",
    ],
  },
};

export function CompanyDirectoryCard() {
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);

  /* Modal open state */
  const [isModalOpen, setIsModalOpen] = useState(false);

  const directoryQuery = useQuery({
    queryKey: ["tenant", "company", "directory"],
    queryFn: companyApi.getDirectory,
  });

  /* Local state for directory structure */
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationDepartments, setLocationDepartments] = useState<Record<string, string[]>>({});
  const [locationJobCounts, setLocationJobCounts] = useState<Record<string, number>>({});
  const [departmentJobCounts, setDepartmentJobCounts] = useState<Record<string, number>>({});

  /* Selected location in Master-Detail */
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  /* Tab view */
  const [activeTab, setActiveTab] = useState<"matrix" | "master-departments">("matrix");

  /* Filter queries */
  const [locationQuery, setLocationQuery] = useState("");
  const [deptQuery, setDeptQuery] = useState("");
  const [masterDeptQuery, setMasterDeptQuery] = useState("");

  /* Draft inputs */
  const [newLocationDraft, setNewLocationDraft] = useState("");
  const [newDeptDraft, setNewDeptDraft] = useState("");
  const [newMasterDeptDraft, setNewMasterDeptDraft] = useState("");

  /* Inline editing states */
  const [editingLocation, setEditingLocation] = useState<{ original: string; value: string } | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<{ original: string; value: string } | null>(null);

  /* Quick assign dropdown state */
  const [quickAssignDept, setQuickAssignDept] = useState("");

  /* Sync server data to local state */
  useEffect(() => {
    if (!directoryQuery.data?.data) return;
    const data = directoryQuery.data.data;
    setDepartments(data.departments ?? []);
    setLocations(data.locations ?? []);
    setLocationDepartments(data.locationDepartments ?? {});
    setLocationJobCounts(data.locationJobCounts ?? {});
    setDepartmentJobCounts(data.departmentJobCounts ?? {});
  }, [directoryQuery.data]);

  /* Ensure selected location is always valid & avoid empty/unselected right panel */
  useEffect(() => {
    if (locations.length > 0) {
      if (!selectedLocation || !locations.includes(selectedLocation)) {
        setSelectedLocation(locations[0]);
      }
    } else {
      setSelectedLocation(null);
    }
  }, [locations, selectedLocation]);

  /* ESC key to close modal */
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editingLocation && !editingDepartment) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, editingLocation, editingDepartment]);

  /* Check dirty state */
  const isDirty = useMemo(() => {
    if (!directoryQuery.data?.data) return false;
    const server = directoryQuery.data.data;
    const serverDepts = server.departments ?? [];
    const serverLocs = server.locations ?? [];
    const serverMap = server.locationDepartments ?? {};

    if (departments.length !== serverDepts.length || locations.length !== serverLocs.length) {
      return true;
    }
    if (JSON.stringify(departments) !== JSON.stringify(serverDepts)) return true;
    if (JSON.stringify(locations) !== JSON.stringify(serverLocs)) return true;

    // Check location departments diff
    const allKeys = Array.from(new Set([...Object.keys(locationDepartments), ...Object.keys(serverMap)]));
    for (const key of allKeys) {
      const a = locationDepartments[key] ?? [];
      const b = serverMap[key] ?? [];
      if (a.length !== b.length) return true;
      if (JSON.stringify([...a].sort()) !== JSON.stringify([...b].sort())) return true;
    }
    return false;
  }, [departments, locations, locationDepartments, directoryQuery.data]);

  /* Save mutation */
  const mutation = useMutation({
    mutationFn: (payload: CompanyDirectory) => companyApi.updateDirectory(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["tenant", "company", "directory"], response);
      toast.success("Đã lưu danh mục địa điểm và phòng ban thành công!");
    },
    onError: (error) => toast.danger(getApiErrorMessage(error, "Không thể cập nhật danh mục công ty")),
  });

  const handleSave = () => {
    mutation.mutate({
      departments,
      locations,
      locationDepartments,
    });
  };

  const handleReset = () => {
    if (!directoryQuery.data?.data) return;
    const data = directoryQuery.data.data;
    setDepartments(data.departments ?? []);
    setLocations(data.locations ?? []);
    setLocationDepartments(data.locationDepartments ?? {});
    toast.info("Đã hoàn tác các thay đổi chưa lưu.");
  };

  const handleApplyPreset = () => {
    askConfirm({
      title: "Áp dụng cơ cấu mẫu?",
      description: "Hành động này sẽ thêm bộ địa điểm và phòng ban mẫu chuẩn Enterprise vào danh mục của bạn. Bạn vẫn có thể tuỳ chỉnh lại trước khi lưu.",
      confirmLabel: "Áp dụng mẫu",
      onConfirm: () => {
        const mergedLocations = Array.from(new Set([...locations, ...SAMPLE_PRESETS.locations]));
        const mergedDepartments = Array.from(new Set([...departments, ...SAMPLE_PRESETS.departments]));
        const mergedMap = { ...locationDepartments };
        for (const [loc, depts] of Object.entries(SAMPLE_PRESETS.locationDepartments)) {
          mergedMap[loc] = Array.from(new Set([...(mergedMap[loc] ?? []), ...depts]));
        }
        setLocations(mergedLocations);
        setDepartments(mergedDepartments);
        setLocationDepartments(mergedMap);
        setSelectedLocation(mergedLocations[0]);
        toast.success("Đã nạp cơ cấu mẫu thành công. Bấm 'Lưu danh mục' để lưu lại.");
      },
    });
  };

  /* Add location */
  const addLocation = () => {
    const val = newLocationDraft.trim();
    if (!val) return;
    if (locations.some((l) => l.toLowerCase() === val.toLowerCase())) {
      toast.warning("Địa điểm này đã tồn tại trong danh sách");
      return;
    }
    const updated = [...locations, val];
    setLocations(updated);
    setLocationDepartments((prev) => ({ ...prev, [val]: prev[val] ?? [] }));
    setSelectedLocation(val);
    setNewLocationDraft("");
  };

  /* Rename location */
  const saveRenameLocation = () => {
    if (!editingLocation) return;
    const oldName = editingLocation.original;
    const newName = editingLocation.value.trim();
    if (!newName) {
      toast.warning("Tên địa điểm không được để trống");
      return;
    }
    if (oldName.toLowerCase() !== newName.toLowerCase() && locations.some((l) => l.toLowerCase() === newName.toLowerCase())) {
      toast.warning("Tên địa điểm mới đã tồn tại");
      return;
    }
    setLocations(locations.map((l) => (l === oldName ? newName : l)));
    setLocationDepartments((prev) => {
      const copy = { ...prev };
      const depts = copy[oldName] ?? [];
      delete copy[oldName];
      copy[newName] = depts;
      return copy;
    });
    if (selectedLocation === oldName) {
      setSelectedLocation(newName);
    }
    setEditingLocation(null);
    toast.success("Đã đổi tên địa điểm");
  };

  /* Delete location */
  const removeLocation = (loc: string) => {
    const jobCount = locationJobCounts[loc] ?? 0;
    const assignedDepts = locationDepartments[loc] ?? [];
    askConfirm({
      title: `Xoá địa điểm "${loc}"?`,
      description:
        jobCount > 0
          ? `CẢNH BÁO: Địa điểm này đang có ${jobCount} tin tuyển dụng sử dụng. Xoá có thể ảnh hưởng đến các tin tuyển dụng liên quan.`
          : assignedDepts.length > 0
          ? `Địa điểm này đang có ${assignedDepts.length} phòng ban trực thuộc. Bạn có chắc chắn muốn xoá?`
          : "Bạn có chắc chắn muốn xoá địa điểm này khỏi danh mục?",
      danger: true,
      confirmLabel: "Xoá địa điểm",
      onConfirm: () => {
        const updated = locations.filter((l) => l !== loc);
        setLocations(updated);
        setLocationDepartments((prev) => {
          const copy = { ...prev };
          delete copy[loc];
          return copy;
        });
        if (selectedLocation === loc) {
          setSelectedLocation(updated.length > 0 ? updated[0] : null);
        }
        toast.success(`Đã xoá địa điểm "${loc}"`);
      },
    });
  };

  /* Add department to selected location */
  const addDepartmentToSelectedLocation = (deptName: string) => {
    const name = deptName.trim();
    if (!selectedLocation || !name) return;

    const currentLocDepts = locationDepartments[selectedLocation] ?? [];
    if (currentLocDepts.some((d) => d.toLowerCase() === name.toLowerCase())) {
      toast.warning(`Phòng ban "${name}" đã có tại địa điểm này.`);
      return;
    }

    let updatedDepartments = departments;
    if (!departments.some((d) => d.toLowerCase() === name.toLowerCase())) {
      updatedDepartments = [...departments, name];
      setDepartments(updatedDepartments);
    }

    const canonicalName = updatedDepartments.find((d) => d.toLowerCase() === name.toLowerCase()) || name;

    setLocationDepartments((prev) => ({
      ...prev,
      [selectedLocation]: [...(prev[selectedLocation] ?? []), canonicalName],
    }));

    setNewDeptDraft("");
    setQuickAssignDept("");
  };

  /* Remove department from selected location */
  const removeDepartmentFromLocation = (loc: string, dept: string) => {
    setLocationDepartments((prev) => ({
      ...prev,
      [loc]: (prev[loc] ?? []).filter((d) => d !== dept),
    }));
  };

  /* Assign all company departments to selected location */
  const assignAllDepartmentsToLocation = () => {
    if (!selectedLocation || departments.length === 0) return;
    setLocationDepartments((prev) => ({
      ...prev,
      [selectedLocation]: [...departments],
    }));
    toast.success(`Đã gán tất cả ${departments.length} phòng ban cho ${selectedLocation}`);
  };

  /* Remove all departments from selected location */
  const clearAllDepartmentsFromLocation = () => {
    if (!selectedLocation) return;
    setLocationDepartments((prev) => ({
      ...prev,
      [selectedLocation]: [],
    }));
  };

  /* Add master department (company-wide) */
  const addMasterDepartment = () => {
    const val = newMasterDeptDraft.trim();
    if (!val) return;
    if (departments.some((d) => d.toLowerCase() === val.toLowerCase())) {
      toast.warning("Phòng ban này đã tồn tại trong danh mục công ty");
      return;
    }
    setDepartments([...departments, val]);
    setNewMasterDeptDraft("");
  };

  /* Rename department company-wide */
  const saveRenameDepartment = () => {
    if (!editingDepartment) return;
    const oldName = editingDepartment.original;
    const newName = editingDepartment.value.trim();
    if (!newName) {
      toast.warning("Tên phòng ban không được để trống");
      return;
    }
    if (oldName.toLowerCase() !== newName.toLowerCase() && departments.some((d) => d.toLowerCase() === newName.toLowerCase())) {
      toast.warning("Tên phòng ban mới đã tồn tại");
      return;
    }
    setDepartments(departments.map((d) => (d === oldName ? newName : d)));
    setLocationDepartments((prev) => {
      const copy: Record<string, string[]> = {};
      for (const [loc, depts] of Object.entries(prev)) {
        copy[loc] = depts.map((d) => (d === oldName ? newName : d));
      }
      return copy;
    });
    setEditingDepartment(null);
    toast.success("Đã cập nhật tên phòng ban trên toàn hệ thống");
  };

  /* Delete department company-wide */
  const removeMasterDepartment = (dept: string) => {
    const jobCount = departmentJobCounts[dept] ?? 0;
    let locUsageCount = 0;
    for (const depts of Object.values(locationDepartments)) {
      if (depts.includes(dept)) locUsageCount++;
    }

    askConfirm({
      title: `Xoá phòng ban "${dept}"?`,
      description:
        jobCount > 0
          ? `CẢNH BÁO: Phòng ban này đang có ${jobCount} tin tuyển dụng liên kết. Xoá sẽ gỡ phòng ban khỏi tất cả địa điểm và ảnh hưởng tới tin tuyển dụng.`
          : locUsageCount > 0
          ? `Phòng ban này đang hoạt động tại ${locUsageCount} địa điểm. Xoá sẽ gỡ phòng ban này khỏi toàn bộ công ty.`
          : "Bạn có chắc chắn muốn xoá phòng ban này khỏi danh mục công ty?",
      danger: true,
      confirmLabel: "Xoá phòng ban",
      onConfirm: () => {
        setDepartments(departments.filter((d) => d !== dept));
        setLocationDepartments((prev) => {
          const copy: Record<string, string[]> = {};
          for (const [loc, depts] of Object.entries(prev)) {
            copy[loc] = depts.filter((d) => d !== dept);
          }
          return copy;
        });
        toast.success(`Đã xoá phòng ban "${dept}"`);
      },
    });
  };

  const totalLocations = locations.length;
  const totalDepartments = departments.length;

  /* Filtered locations */
  const filteredLocations = useMemo(() => {
    if (!locationQuery.trim()) return locations;
    const q = locationQuery.toLowerCase();
    return locations.filter((loc) => loc.toLowerCase().includes(q));
  }, [locations, locationQuery]);

  /* Departments at selected location */
  const selectedLocationDepts = useMemo(() => {
    if (!selectedLocation) return [];
    const depts = locationDepartments[selectedLocation] ?? [];
    if (!deptQuery.trim()) return depts;
    const q = deptQuery.toLowerCase();
    return depts.filter((d) => d.toLowerCase().includes(q));
  }, [selectedLocation, locationDepartments, deptQuery]);

  /* Company departments not yet added to selected location */
  const unassignedCompanyDepts = useMemo(() => {
    if (!selectedLocation) return departments;
    const assigned = new Set((locationDepartments[selectedLocation] ?? []).map((d) => d.toLowerCase()));
    return departments.filter((d) => !assigned.has(d.toLowerCase()));
  }, [selectedLocation, departments, locationDepartments]);

  /* Filtered master departments */
  const filteredMasterDepts = useMemo(() => {
    if (!masterDeptQuery.trim()) return departments;
    const q = masterDeptQuery.toLowerCase();
    return departments.filter((d) => d.toLowerCase().includes(q));
  }, [departments, masterDeptQuery]);

  if (directoryQuery.isLoading) return <PageSkeleton variant="list" />;

  return (
    <>
      {/* ──── COMPACT TRIGGER CARD ON PAGE (Bố cục gọn gàng, bấm vào mới hiện nổi lên) ──── */}
      <Card className="p-4 transition-all hover:border-brand-primary/40 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <MapPin className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Danh mục địa điểm & phòng ban công ty
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                  {totalLocations} địa điểm • {totalDepartments} phòng ban
                </span>
                {isDirty && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-600">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Chưa lưu
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="gap-2 shadow-sm font-semibold"
            >
              <Building2 className="size-4" aria-hidden="true" />
              Quản lý địa điểm & phòng ban
            </Button>
          </div>
        </div>
      </Card>

      {/* ──── MODAL POPUP (HIỆN NỔI LÊN KHI BẤM VÀO) ──── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
          role="presentation"
          onClick={() => {
            if (!editingLocation && !editingDepartment) setIsModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-directory-title"
            className="relative flex flex-col w-full max-w-5xl rounded-2xl border border-[var(--color-border-default)] bg-surface-card shadow-2xl overflow-hidden max-h-[92vh] animate-in fade-in-0 zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-6 py-4 bg-surface-muted/30 shrink-0">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Building2 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 id="modal-directory-title" className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
                    Danh mục địa điểm & phòng ban công ty
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Bấm vào từng địa điểm để xem và phân bổ các phòng ban trực thuộc.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalLocations === 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyPreset}
                    className="gap-1.5 border-dashed text-xs hidden sm:inline-flex"
                  >
                    <Sparkles className="size-3.5 text-amber-500" aria-hidden="true" />
                    Gợi ý mẫu cơ cấu
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-surface-muted transition-colors"
                  aria-label="Đóng cửa sổ"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-6 bg-surface-card shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-semibold transition-colors ${
                    activeTab === "matrix"
                      ? "border-brand-primary text-brand-primary"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                  onClick={() => setActiveTab("matrix")}
                >
                  <Building2 className="size-4" />
                  Cơ cấu theo địa điểm
                  <span className="ml-1 rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs text-brand-primary">
                    {totalLocations}
                  </span>
                </button>

                <button
                  type="button"
                  className={`flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-semibold transition-colors ${
                    activeTab === "master-departments"
                      ? "border-brand-primary text-brand-primary"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                  onClick={() => setActiveTab("master-departments")}
                >
                  <Users className="size-4" />
                  Tất cả phòng ban công ty
                  <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                    {totalDepartments}
                  </span>
                </button>
              </div>

              {isDirty && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  Có thay đổi chưa lưu
                </span>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {activeTab === "matrix" ? (
                /* ── TAB 1: MASTER-DETAIL MATRIX (BỐ CỤC CHUẨN TRÁNH KHUYẾT) ── */
                <div className="grid gap-5 lg:grid-cols-12 items-start">
                  {/* Left Column (Master): Địa điểm công ty (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col rounded-xl border border-[var(--color-border-default)] bg-surface-card shadow-xs h-[520px]">
                    {/* Header */}
                    <div className="p-3.5 border-b border-[var(--color-border-default)] space-y-2.5 bg-surface-muted/30 shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-brand-primary" aria-hidden="true" />
                          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Địa điểm công ty</h4>
                        </div>
                        <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                          {filteredLocations.length}/{totalLocations}
                        </span>
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                        <input
                          type="text"
                          placeholder="Lọc nhanh địa điểm…"
                          value={locationQuery}
                          onChange={(e) => setLocationQuery(e.target.value)}
                          className="h-8.5 w-full rounded-md border border-[var(--color-border-default)] bg-surface-card pl-8 pr-7 text-xs text-[var(--color-text-primary)] outline-none focus:border-brand-primary"
                        />
                        {locationQuery && (
                          <button
                            type="button"
                            onClick={() => setLocationQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                            aria-label="Xoá tìm kiếm"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Add Input */}
                      <div className="flex gap-2">
                        <input
                          className={inputClass}
                          maxLength={255}
                          placeholder="VD: Tầng 5, 123 Cầu Giấy, Hà Nội"
                          value={newLocationDraft}
                          onChange={(e) => setNewLocationDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addLocation();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!newLocationDraft.trim()}
                          onClick={addLocation}
                          aria-label="Thêm địa điểm"
                          className="shrink-0"
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    {/* Locations List */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                      {filteredLocations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[var(--color-text-secondary)]">
                          <MapPin className="size-8 text-gray-300 dark:text-gray-600 mb-2 stroke-1" />
                          <p className="text-xs font-medium">
                            {locationQuery ? "Không tìm thấy địa điểm phù hợp." : "Chưa có địa điểm công ty nào."}
                          </p>
                          {totalLocations === 0 && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleApplyPreset}
                              className="mt-3 text-xs"
                            >
                              <Sparkles className="size-3 text-amber-500 mr-1" />
                              Dùng mẫu có sẵn
                            </Button>
                          )}
                        </div>
                      ) : (
                        filteredLocations.map((loc) => {
                          const isSelected = selectedLocation === loc;
                          const deptCount = locationDepartments[loc]?.length ?? 0;
                          const jobCount = locationJobCounts[loc] ?? 0;
                          const isEditing = editingLocation?.original === loc;

                          return (
                            <div
                              key={loc}
                              onClick={() => !isEditing && setSelectedLocation(loc)}
                              className={`group relative flex flex-col gap-1.5 rounded-lg border p-3 text-sm cursor-pointer transition-all ${
                                isSelected
                                  ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20 shadow-xs"
                                  : "border-[var(--color-border-default)] bg-surface-card hover:border-brand-primary/40 hover:bg-surface-muted/40"
                              }`}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    className="h-8 w-full rounded border border-brand-primary bg-surface-card px-2 text-xs text-[var(--color-text-primary)] outline-none"
                                    value={editingLocation.value}
                                    autoFocus
                                    onChange={(e) =>
                                      setEditingLocation({ original: loc, value: e.target.value })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveRenameLocation();
                                      if (e.key === "Escape") setEditingLocation(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                    onClick={saveRenameLocation}
                                    aria-label="Lưu đổi tên"
                                  >
                                    <Check className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                                    onClick={() => setEditingLocation(null)}
                                    aria-label="Huỷ đổi tên"
                                  >
                                    <X className="size-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <MapPin
                                      className={`size-4 shrink-0 mt-0.5 ${
                                        isSelected ? "text-brand-primary" : "text-[var(--color-text-secondary)]"
                                      }`}
                                    />
                                    <span className="font-semibold text-[var(--color-text-primary)] break-words leading-tight">
                                      {loc}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                                    <button
                                      type="button"
                                      className="rounded p-1 text-[var(--color-text-secondary)] hover:text-brand-primary hover:bg-blue-50 dark:hover:bg-blue-950"
                                      aria-label={`Đổi tên ${loc}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingLocation({ original: loc, value: loc });
                                      }}
                                    >
                                      <Pencil className="size-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded p-1 text-status-danger hover:bg-red-50 dark:hover:bg-red-950"
                                      aria-label={`Xoá ${loc}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeLocation(loc);
                                      }}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-[var(--color-border-default)]/60">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      deptCount > 0
                                        ? "bg-brand-primary/10 text-brand-primary"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                    }`}
                                  >
                                    <Users className="size-3" />
                                    {deptCount > 0 ? `${deptCount} phòng ban` : "Chưa có phòng ban"}
                                  </span>

                                  {jobCount > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]">
                                      <Briefcase className="size-3" />
                                      {jobCount} việc làm
                                    </span>
                                  )}
                                </div>

                                {isSelected && (
                                  <span className="flex items-center text-xs font-semibold text-brand-primary">
                                    Chi tiết <ChevronRight className="size-3.5 ml-0.5" />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column (Detail): Phòng ban tại địa điểm đã chọn (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col rounded-xl border border-[var(--color-border-default)] bg-surface-card shadow-xs h-[520px]">
                    {selectedLocation ? (
                      <>
                        {/* Header for Selected Location */}
                        <div className="p-3.5 border-b border-[var(--color-border-default)] space-y-2.5 bg-surface-muted/30 shrink-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-medium text-brand-primary uppercase tracking-wider">
                                <MapPin className="size-3.5" /> Địa điểm đang chọn
                              </div>
                              <h4 className="text-base font-bold text-[var(--color-text-primary)] break-words mt-0.5">
                                {selectedLocation}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                                {locationDepartments[selectedLocation]?.length ?? 0} phòng ban trực thuộc
                              </span>
                              {departments.length > (locationDepartments[selectedLocation]?.length ?? 0) && (
                                <button
                                  type="button"
                                  onClick={assignAllDepartmentsToLocation}
                                  className="text-xs text-brand-primary hover:underline font-medium"
                                >
                                  Gán tất cả
                                </button>
                              )}
                              {(locationDepartments[selectedLocation]?.length ?? 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={clearAllDepartmentsFromLocation}
                                  className="text-xs text-status-danger hover:underline font-medium ml-2"
                                >
                                  Gỡ hết
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Add / Assign controls */}
                          <div className="grid gap-2 sm:grid-cols-2">
                            {/* Pick from existing company departments */}
                            <div>
                              <select
                                className="h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-card px-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-brand-primary"
                                value={quickAssignDept}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuickAssignDept(val);
                                  if (val) addDepartmentToSelectedLocation(val);
                                }}
                                disabled={unassignedCompanyDepts.length === 0}
                              >
                                <option value="">
                                  {unassignedCompanyDepts.length === 0
                                    ? "Đã gán hết phòng ban công ty"
                                    : "Chọn từ phòng ban có sẵn…"}
                                </option>
                                {unassignedCompanyDepts.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Direct create new department */}
                            <div className="flex gap-2">
                              <input
                                className={inputClass}
                                maxLength={128}
                                placeholder="Hoặc tạo phòng ban mới…"
                                value={newDeptDraft}
                                onChange={(e) => setNewDeptDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (newDeptDraft.trim()) addDepartmentToSelectedLocation(newDeptDraft);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={!newDeptDraft.trim()}
                                onClick={() => addDepartmentToSelectedLocation(newDeptDraft)}
                                aria-label="Thêm phòng ban mới vào địa điểm"
                                className="shrink-0"
                              >
                                <Plus className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>

                          {/* Filter departments */}
                          {(locationDepartments[selectedLocation]?.length ?? 0) > 4 && (
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                              <input
                                type="text"
                                placeholder="Lọc phòng ban tại địa điểm này…"
                                value={deptQuery}
                                onChange={(e) => setDeptQuery(e.target.value)}
                                className="h-8.5 w-full rounded-md border border-[var(--color-border-default)] bg-surface-card pl-8 pr-7 text-xs text-[var(--color-text-primary)] outline-none focus:border-brand-primary"
                              />
                              {deptQuery && (
                                <button
                                  type="button"
                                  onClick={() => setDeptQuery("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Departments List at Selected Location */}
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                          {selectedLocationDepts.length === 0 ? (
                            /* Designed Empty State: Avoid awkward cut-off ("tránh khuyết giao diện") */
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 rounded-xl border border-dashed border-[var(--color-border-default)] bg-surface-muted/20">
                              <div className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary mb-3">
                                <Users className="size-6" />
                              </div>
                              <h5 className="text-sm font-bold text-[var(--color-text-primary)]">
                                Chưa có phòng ban nào tại địa điểm này
                              </h5>
                              <p className="mt-1 max-w-sm text-xs text-[var(--color-text-secondary)]">
                                Địa điểm này hiện chưa được phân bổ phòng ban. Bạn có thể chọn nhanh từ danh mục phòng ban của công ty hoặc thêm phòng ban mới.
                              </p>

                              {/* Quick Suggestion Chips */}
                              {unassignedCompanyDepts.length > 0 ? (
                                <div className="mt-4">
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                                    Bấm nhanh để gán vào cơ sở này:
                                  </p>
                                  <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
                                    {unassignedCompanyDepts.slice(0, 6).map((d) => (
                                      <button
                                        key={d}
                                        type="button"
                                        onClick={() => addDepartmentToSelectedLocation(d)}
                                        className="inline-flex items-center gap-1 rounded-full border border-brand-primary/30 bg-surface-card px-2.5 py-1 text-xs font-medium text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                                      >
                                        <Plus className="size-3" />
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-4">
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                                    Gợi ý phòng ban phổ biến:
                                  </p>
                                  <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
                                    {SAMPLE_PRESETS.departments.slice(0, 4).map((d) => (
                                      <button
                                        key={d}
                                        type="button"
                                        onClick={() => addDepartmentToSelectedLocation(d)}
                                        className="inline-flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-700 bg-surface-card px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:border-brand-primary hover:text-brand-primary transition-colors"
                                      >
                                        <Plus className="size-3" />
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {selectedLocationDepts.map((dept) => {
                                const jobCount = departmentJobCounts[dept] ?? 0;
                                return (
                                  <li
                                    key={dept}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-default)] bg-surface-card p-3 text-sm shadow-2xs hover:border-brand-primary/40 transition-all"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                                        <Users className="size-3.5" />
                                      </span>
                                      <div className="min-w-0">
                                        <span className="font-medium text-[var(--color-text-primary)] break-words">
                                          {dept}
                                        </span>
                                        {jobCount > 0 && (
                                          <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                                            <Briefcase className="size-3" />
                                            <span>{jobCount} tin tuyển dụng thuộc phòng ban này</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-status-danger hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                        aria-label={`Gỡ ${dept} khỏi ${selectedLocation}`}
                                        title="Gỡ khỏi địa điểm này"
                                        onClick={() => removeDepartmentFromLocation(selectedLocation, dept)}
                                      >
                                        <X className="size-3.5" />
                                        Gỡ
                                      </button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-[var(--color-text-secondary)]">
                        <Building2 className="size-10 text-gray-300 dark:text-gray-600 mb-2 stroke-1" />
                        <h5 className="text-base font-semibold text-[var(--color-text-primary)]">
                          Chưa chọn địa điểm
                        </h5>
                        <p className="mt-1 text-xs max-w-sm">
                          Hãy thêm hoặc chọn một địa điểm ở cột bên trái để quản lý các phòng ban trực thuộc.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── TAB 2: MASTER DEPARTMENTS DIRECTORY (ALL COMPANY DEPARTMENTS) ── */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-[var(--color-border-default)] bg-surface-muted/30">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                        Danh mục phòng ban toàn công ty
                      </h4>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Tất cả phòng ban đang có của doanh nghiệp. Bạn có thể thêm, đổi tên hoặc xoá các phòng ban tại đây.
                      </p>
                    </div>

                    <div className="flex gap-2 sm:w-80">
                      <input
                        className={inputClass}
                        maxLength={128}
                        placeholder="VD: Engineering, Marketing…"
                        value={newMasterDeptDraft}
                        onChange={(e) => setNewMasterDeptDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addMasterDepartment();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!newMasterDeptDraft.trim()}
                        onClick={addMasterDepartment}
                        className="shrink-0"
                      >
                        <Plus className="size-4 mr-1" /> Thêm
                      </Button>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm phòng ban…"
                      value={masterDeptQuery}
                      onChange={(e) => setMasterDeptQuery(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-card pl-8.5 pr-8 text-xs text-[var(--color-text-primary)] outline-none focus:border-brand-primary"
                    />
                    {masterDeptQuery && (
                      <button
                        type="button"
                        onClick={() => setMasterDeptQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Departments Grid */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredMasterDepts.map((dept) => {
                      const jobCount = departmentJobCounts[dept] ?? 0;
                      const attachedLocations = locations.filter((loc) =>
                        (locationDepartments[loc] ?? []).includes(dept)
                      );
                      const isEditing = editingDepartment?.original === dept;

                      return (
                        <div
                          key={dept}
                          className="flex flex-col justify-between rounded-xl border border-[var(--color-border-default)] bg-surface-card p-3.5 shadow-2xs hover:border-brand-primary/40 transition-all"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                className="h-8 w-full rounded border border-brand-primary bg-surface-card px-2 text-xs text-[var(--color-text-primary)] outline-none"
                                value={editingDepartment.value}
                                autoFocus
                                onChange={(e) =>
                                  setEditingDepartment({ original: dept, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRenameDepartment();
                                  if (e.key === "Escape") setEditingDepartment(null);
                                }}
                              />
                              <button
                                type="button"
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                onClick={saveRenameDepartment}
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1 text-gray-400 hover:bg-gray-100"
                                onClick={() => setEditingDepartment(null)}
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Users className="size-4 text-emerald-600 shrink-0" />
                                <span className="font-semibold text-sm text-[var(--color-text-primary)] break-words">
                                  {dept}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  className="rounded p-1 text-[var(--color-text-secondary)] hover:text-brand-primary hover:bg-blue-50"
                                  aria-label={`Đổi tên ${dept}`}
                                  onClick={() => setEditingDepartment({ original: dept, value: dept })}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="rounded p-1 text-status-danger hover:bg-red-50"
                                  aria-label={`Xoá ${dept}`}
                                  onClick={() => removeMasterDepartment(dept)}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-2 border-t border-[var(--color-border-default)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>
                              {attachedLocations.length > 0 ? (
                                <span className="font-medium text-brand-primary">
                                  Có mặt tại {attachedLocations.length} địa điểm
                                </span>
                              ) : (
                                <span className="text-amber-600">Chưa gán địa điểm nào</span>
                              )}
                            </span>

                            {jobCount > 0 && (
                              <span className="font-medium text-[var(--color-text-primary)]">
                                {jobCount} việc làm
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--color-border-default)] px-6 py-4 bg-surface-muted/30 shrink-0">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Mọi thay đổi chỉ được áp dụng chính thức khi bạn bấm <strong>Lưu danh mục</strong>.</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {isDirty && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleReset}
                    className="gap-1.5 text-xs text-[var(--color-text-secondary)]"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Hoàn tác
                  </Button>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Đóng
                </Button>

                <Button
                  type="button"
                  disabled={mutation.isPending || directoryQuery.isError}
                  onClick={handleSave}
                  className={`gap-1.5 ${isDirty ? "shadow-md ring-2 ring-brand-primary/30" : ""}`}
                >
                  {mutation.isPending ? (
                    "Đang lưu…"
                  ) : (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Lưu danh mục
                      {isDirty && <span className="size-2 rounded-full bg-amber-400 animate-pulse" />}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
