# Hướng Dẫn Thiết Kế & Triển Khai Phân Trang Chuẩn UX/UI & Cơ Chế Skeleton Loading

Tài liệu này quy chuẩn **Hệ thống Phân trang (Pagination)** hoàn chỉnh và **Quy tắc Kích hoạt Loading / Skeleton (Khi nào thì load trang)** áp dụng cho toàn bộ các màn hình bảng danh sách dữ liệu trong hệ thống SmartHire-AI (Ứng viên, Sàng lọc CV, Xếp hạng, Ngân hàng câu hỏi, Lịch phỏng vấn, Dashboard,...).

---

## 1. Hệ Thống Phân Trang Đầy Đủ Chuẩn UX/UI (Full Pagination System)

Một hệ thống phân trang chuẩn Enterprise bao gồm **4 nhóm chức năng cốt lõi**:

```
+-----------------------------------------------------------------------------------------------------------------------+
|  [BÊN TRÁI]                         |               [Ở GIỮA]               |                 [BÊN PHẢI]                |
|  Hiển thị 1–10 trên 120 hồ sơ       |          Hiển thị [10 / trang ▾]     |  [|<] [<]  1  2  3  …  12  [>] [>|]      |
|  · Trang 1 / 12  (↻ Đang tải…)      |                                      |  Đi đến: [ 1 ] Trang [Đi]                |
+-----------------------------------------------------------------------------------------------------------------------+
```

### 1.1. Nhóm 1: Điều hướng (Navigation Controls)
* **Về trang đầu `[|<]` (`ChevronsLeft`)**: Nhảy ngay về Trang 1 chỉ bằng 1 cú click. Tự động `disabled` khi người dùng đang ở Trang 1.
* **Trang trước `[<]` (`ChevronLeft`)**: Lùi về trang liền kề (`page - 1`). Tự động `disabled` khi đang ở Trang 1.
* **Hàng nút số trang trực tiếp (Page Buttons)**:
  - Hiển thị danh sách các con số đại diện cho trang.
  - **Trạng thái Active**: Nổi bật trang hiện tại bằng nền màu chủ đạo (`bg-brand-primary text-white shadow-xs`).
  - **Trạng thái Default**: Nền trắng, viền mỏng (`border border-slate-200 text-slate-700 hover:bg-slate-100`).
* **Dấu ba chấm (`…`) thông minh (Sliding Window Ellipsis)**:
  - Khi tổng số trang lớn (VD: > 7 trang), hệ thống tự động thu gọn các trang ở xa bằng dấu `…` để không làm tràn hoặc vỡ giao diện.
  - Luôn luôn hiển thị: Trang đầu (`1`), trang cuối (`totalPages`), và cụm trang lân cận trang đang active (`currentPage - 1`, `currentPage`, `currentPage + 1`).
* **Trang sau `[>]` (`ChevronRight`)**: Tiến tới trang liền kề (`page + 1`). Tự động `disabled` khi đang ở Trang cuối cùng.
* **Đến trang cuối `[>|]` (`ChevronsRight`)**: Nhảy ngay về Trang cuối (`totalPages`). Tự động `disabled` khi đang ở Trang cuối cùng.

### 1.2. Nhóm 2: Thông tin Dữ liệu (Pagination Info)
* **Khoảng bản ghi hiển thị**: Tính toán chính xác bản ghi bắt đầu và kết thúc trên tổng số bản ghi:
  $$\text{from} = (\text{currentPage} - 1) \times \text{pageSize} + 1$$
  $$\text{to} = \min(\text{currentPage} \times \text{pageSize}, \text{totalItems})$$
  *Hiển thị dạng*: `Hiển thị 1–10 trên 120 hồ sơ` (hoặc `Hiển thị 0 trên 0 hồ sơ` khi rỗng).
* **Tổng số trang**: `· Trang 1 / 12` giúp người dùng định vị được độ dài của danh sách.
* **Chỉ báo tải ngầm (Background Fetch Indicator)**: Hiển thị icon xoay (`Loader2 animate-spin`) kèm chữ *"Đang tải…"* ngay cạnh thông tin phân trang khi TanStack Query đang gọi dữ liệu mới trong nền.

### 1.3. Nhóm 3: Tùy chỉnh & Tương tác Nâng cao (User Control)
* **Chọn số bản ghi / trang (Rows per page)**:
  - Dropdown đặt tại vị trí trung tâm Footer với các mốc chuẩn: `10 / trang`, `20 / trang`, `50 / trang`, `100 / trang`.
  - Khi người dùng đổi `pageSize`, hệ thống tính toán lại `totalPages` và tự động đưa về Trang 1 hợp lệ.
* **Ô nhập nhảy trang nhanh (Page Jumper)**:
  - Cụm giao diện: `Đi đến: [  ] Trang [Đi]`.
  - Cho phép người dùng gõ trực tiếp số trang mong muốn (VD: gõ `12` và nhấn phím Enter hoặc bấm nút "Đi").
  - Tự động kiểm tra giá trị hợp lệ: $1 \le \text{pageInput} \le \text{totalPages}$. Nếu số trang nhập vượt ngưỡng sẽ bị khóa hoặc tự động clamp về giá trị biên.

### 1.4. Nhóm 4: Trạng thái & Xử lý Kỹ thuật (States & Behavior)
* **Đồng bộ URL Parameters**:
  - Mọi thao tác đổi trang (`page`) và số lượng dòng (`limit`/`size`) đều cập nhật ngay vào URL:
    `https://.../applicants?page=2&limit=10`
  - Giúp người dùng có thể **F5 làm mới**, **gửi link cho đồng nghiệp**, hoặc **lưu Bookmark** mà không bị mất trang đang xem.
  - Hỗ trợ đầy đủ phím **Back / Forward** của trình duyệt thông qua lắng nghe `searchParams`.
* **Bảo toàn trạng thái bộ lọc (Filter Persistence)**:
  - Khi chuyển trang hoặc đổi số dòng: Toàn bộ từ khóa tìm kiếm (`q`), bộ lọc trạng thái (`status`), nguồn (`source`), tab phân loại, và thứ tự sắp xếp (`sort`) đều được **giữ nguyên vẹn**.
* **Tự động đưa về Trang 1 khi thay đổi điều kiện lọc**:
  - Khi gõ từ khóa tìm kiếm mới, đổi tab trạng thái, hoặc đổi cờ lưu trữ, hệ thống tự động reset `page = 1` trên cả State và URL để tránh tình trạng trang hiện tại vượt quá số kết quả mới lọc.
* **Tự động chỉnh trang khi dữ liệu bị thu hẹp (Boundary Clamping)**:
  - Nếu người dùng đang ở trang 5 nhưng sau khi áp dụng bộ lọc chỉ còn 2 trang, hệ thống tự động nhảy về trang 2.

---

## 2. Quy Tắc Kích Hoạt Loading & Skeleton (Khi Nào Thì Load Trang?)

Để đạt chuẩn trải nghiệm **mượt mà, không giật màn hình (No Layout Shift)** theo phong cách Facebook / Linear, giao diện cần phân định rõ **4 cấp độ Loading**:

| Tình huống người dùng | Phạm vi hiển thị Skeleton | Cụ thể trên UI | Lý do & Trải nghiệm |
|---|---|---|---|
| **1. Lần đầu vào trang / F5 làm mới** (`isInitialLoading`) | **Toàn trang (Cả 4 khối)** | • Khối 1: Header Metric nhấp nháy<br>• Khối 2: Filter bar dạng pill mờ<br>• Khối 3: 10 dòng bảng Skeleton<br>• Khối 4: Footer mờ và khóa click | Chưa có dữ liệu của cả chỉ số, bộ lọc và danh sách. Hiển thị full khung xương giúp dựng sẵn cấu trúc giao diện. |
| **2. Bấm chuyển trang** (Trang 1 ➔ 2, Next, Prev, Nhảy trang) | **Chỉ Khối 3 (Bảng) + Mờ nhẹ Khối 4** | • Khối 1 & 2: **Giữ nguyên 100%** không nhấp nháy<br>• Khối 3: Chuyển sang 10 dòng `TableRowsSkeleton` trong ~200ms<br>• Khối 4: Giảm độ mờ (`opacity-50`) và khóa click tạm thời | Chỉ có dữ liệu bảng thay đổi. Các chỉ số tổng quan và bộ lọc ở trên không đổi nên tuyệt đối không được render lại gây mỏi mắt. |
| **3. Đổi Tab trạng thái hoặc Đổi sắp xếp** | **Chỉ Khối 3 (Bảng)** | • Khối 1 & 2: Giữ nguyên<br>• Khối 3: Hiển thị `TableRowsSkeleton`<br>• Khối 4: Cập nhật lại số liệu tương ứng | Giữ cố định thanh công cụ điều hướng để người dùng cảm thấy ứng dụng phản hồi nhanh và kiểm soát được vị trí đang click. |
| **4. TanStack Query Fetch ngầm trong nền** (`isFetching && !isPending`) | **Không dùng Skeleton** | • Bảng hơi mờ nhẹ (`opacity-70 transition-opacity`)<br>• Icon xoay `Loader2 animate-spin` hiện ở footer cạnh chữ "Đang tải…" | Dữ liệu cũ vẫn hiển thị cho người dùng đọc bình thường trong lúc tải bản mới. Tránh giật màn hình. |

---

## 3. Cấu Trúc Khung Xương Skeleton Từng Khối (Facebook-Style Skeleton Specs)

Sử dụng component [`Skeleton`](file:///e:/Project/SmartHire-AI/frontend/src/components/ux/Skeleton.tsx) có hiệu ứng `skeleton-shimmer` nhấp nháy mượt mà:

```
+----------------------------------------------------------------------------------------------------+
| KHỐI 1: HEADER METRIC SKELETON                                                                    |
| [Tổng CV: ████]   |   [Đã chấm: ████]   |   [Điểm TB: █████]         Bắt buộc: [████] [███] [████] |
+----------------------------------------------------------------------------------------------------+
| KHỐI 2: FILTER BAR SKELETON                                                                        |
| [██ Tất cả ██]  [██ Đã chấm ██]  [██ Đang xử lý ██]  [██ Lỗi ██]            Sắp xếp: [███████████] |
+----------------------------------------------------------------------------------------------------+
| KHỐI 3: DATA TABLE ROWS SKELETON (10 DÒNG)                                                         |
| Header: ỨNG VIÊN             FILE CV               TRẠNG THÁI          ĐIỂM            THAO TÁC     |
| (O) █████████  ██████        [📄 ████████████]     [  ███████  ]       ██  [====    ]      [Chi tiết] |
| (O) █████████  ██████        [📄 ████████████]     [  ███████  ]       ██  [========]      [Chi tiết] |
+----------------------------------------------------------------------------------------------------+
| KHỐI 4: FOOTER SKELETON                                                                            |
| [████████████████████████]              [████████]                     [█████████████████████████] |
+----------------------------------------------------------------------------------------------------+
```

### Chi tiết các phần tử Skeleton:
* **Khối 1 (Metric Bar)**:
  - 3 khối chữ nhật bo góc nhỏ (`h-6 w-12 rounded-md`) đại diện cho các con số chỉ số.
  - 3 chip bo góc mờ (`h-6 w-14 rounded-md`) đại diện cho các tag kỹ năng.
* **Khối 2 (Filter Bar)**:
  - 4 pill tabs mờ (`h-8.5 rounded-lg`) với độ dài ngẫu nhiên từ `w-16` đến `w-28`.
  - 1 khối hộp bo góc mờ (`h-8.5 w-32 rounded-lg`) đại diện cho dropdown sắp xếp.
* **Khối 3 (Table Rows)**:
  - **Cột Ứng viên**: Hình tròn Avatar (`size-9 rounded-full`) + 2 thanh chữ nhật mờ (`h-4 w-32` cho Tên và `h-3 w-20` cho Ngày nộp).
  - **Cột File CV**: Khối hộp chữ nhật mờ kèm icon file (`h-4 w-36 rounded`).
  - **Cột Trạng thái**: 1 pill badge mờ bo tròn (`h-6 w-24 rounded-full`).
  - **Cột Điểm**: 1 con số mờ + thanh tiến trình mờ xám (`h-1.5 w-28 rounded-full`).
  - **Cột Thao tác**: 1 nút mờ căn phải (`ml-auto h-8 w-20 rounded-lg`).
* **Khối 4 (Footer)**:
  - Khối chữ nhật mờ đại diện text thông tin (`h-4 w-48`).
  - Khối hộp đại diện dropdown chọn số dòng (`h-8 w-24`).
  - Cụm nút bấm mờ bị khóa click (`opacity-40 pointer-events-none`).

---

## 4. Mã Nguồn Tham Khảo Chuẩn (Copy & Paste Ready)

### 4.1. Thuật toán Rút Gọn Dấu Ba Chấm Thông Minh (`getPaginationItems`)
```typescript
export function getPaginationItems(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const showStartEllipsis = current > 4;
  const showEndEllipsis = current < total - 3;

  if (!showStartEllipsis && showEndEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis-end", total];
  }

  if (showStartEllipsis && !showEndEllipsis) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}
```

### 4.2. Khung Quản Lý State & Đồng Bộ URL Query
```typescript
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function useTablePagination(totalItems: number) {
  const [params, setParams] = useSearchParams();

  // Đọc từ URL (Mặc định trang 1, 10 dòng/trang)
  const requestedPage = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawSize = parseInt(params.get("limit") || params.get("size") || "10", 10);
  const requestedSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize) ? rawSize : 10;

  const [page, setPage] = useState(requestedPage);
  const [pageSize, setPageSize] = useState(requestedSize);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  const triggerTransition = (action: () => void) => {
    setIsTransitioning(true);
    action();
    setTimeout(() => setIsTransitioning(false), 220);
  };

  const goToPage = (nextPage: number, nextSize: number = pageSize) => {
    const calcTotalPages = Math.max(1, Math.ceil(totalItems / nextSize));
    const target = Math.max(1, Math.min(nextPage, calcTotalPages));
    triggerTransition(() => {
      setPage(target);
      if (nextSize !== pageSize) setPageSize(nextSize);
      const next = new URLSearchParams(params);
      next.set("page", String(target));
      next.set("limit", String(nextSize));
      next.delete("size");
      setParams(next, { replace: true });
    });
  };

  // Đồng bộ khi user bấm Back / Forward trên trình duyệt
  useEffect(() => {
    const p = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const raw = parseInt(params.get("limit") || params.get("size") || "10", 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : 10;
    if (p !== page) setPage(p);
    if (s !== pageSize) setPageSize(s);
  }, [params]);

  return {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    isTransitioning,
    goToPage,
    triggerTransition,
  };
}
```

### 4.3. Layout Footer Bảng 1 Dòng Chuẩn JSX
```tsx
<div className={cn(
  "flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between transition-opacity",
  isTransitioning && "opacity-50 pointer-events-none"
)}>
  {/* [TRÁI]: Thông tin dữ liệu & loading */}
  <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600">
    <p>
      Hiển thị <strong className="font-semibold text-slate-900">{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</strong> trên <strong className="font-semibold text-slate-900">{totalItems}</strong> kết quả
    </p>
    <span className="text-slate-300">·</span>
    <span className="tabular-nums">Trang {currentPage} / {totalPages}</span>
    {isFetching && (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary ml-1">
        <Loader2 className="size-3.5 animate-spin" />
        <span className="hidden sm:inline">Đang tải…</span>
      </span>
    )}
  </div>

  {/* [GIỮA]: Dropdown chọn số dòng / trang */}
  <div className="flex items-center justify-start lg:justify-center">
    <label className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600">
      <span>Hiển thị</span>
      <select
        value={pageSize}
        onChange={(e) => goToPage(1, Number(e.target.value))}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs sm:text-[13px] font-semibold text-slate-800 shadow-2xs outline-none hover:border-brand-primary cursor-pointer"
      >
        {[10, 20, 50, 100].map((s) => (
          <option key={s} value={s}>{s} / trang</option>
        ))}
      </select>
    </label>
  </div>

  {/* [PHẢI]: Nút điều hướng + Nhập trang nhanh */}
  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
    <nav className="flex items-center gap-1">
      <button title="Về trang đầu" disabled={currentPage === 1} onClick={() => goToPage(1)} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
        <ChevronsLeft className="size-4" />
      </button>
      <button title="Trang trước" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
        <ChevronLeft className="size-4" />
      </button>

      {pageItems.map((item, idx) => typeof item !== "number" ? (
        <span key={idx} className="grid size-8 place-items-center text-xs text-slate-400">…</span>
      ) : (
        <button key={item} onClick={() => goToPage(item)} className={cn("grid size-8 place-items-center rounded-lg text-xs font-semibold shadow-2xs", item === currentPage ? "bg-brand-primary text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-brand-primary/5")}>
          {item}
        </button>
      ))}

      <button title="Trang sau" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
        <ChevronRight className="size-4" />
      </button>
      <button title="Đến trang cuối" disabled={currentPage >= totalPages} onClick={() => goToPage(totalPages)} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
        <ChevronsRight className="size-4" />
      </button>
    </nav>

    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

    {/* Page Jumper */}
    <form onSubmit={(e) => { e.preventDefault(); const p = parseInt(jumpVal, 10); if (p >= 1 && p <= totalPages) { goToPage(p); setJumpVal(""); } }} className="flex items-center gap-1.5 text-xs text-slate-600">
      <span>Đi đến:</span>
      <input type="number" min={1} max={totalPages} placeholder={String(currentPage)} value={jumpVal} onChange={(e) => setJumpVal(e.target.value)} className="h-8 w-11 rounded-lg border border-slate-200 bg-white text-center text-xs font-semibold" />
      <span>Trang</span>
      <button type="submit" disabled={!jumpVal || Number(jumpVal) < 1 || Number(jumpVal) > totalPages} className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold hover:border-brand-primary disabled:opacity-40">
        Đi
      </button>
    </form>
  </div>
</div>
```

---

## 5. Màn Hình Tham Chiếu Đã Triển Khai Hoàn Hảo Trong Dự Án

Khi cần sao chép hoặc tham khảo mã nguồn thực tế, xem tại 2 file chính:
1. **Server-side Pagination (Gọi API phân trang từ Backend)**:
   [`ApplicantsPage.tsx`](file:///e:/Project/SmartHire-AI/frontend/src/features/tenant/recruiter/applicants/pages/ApplicantsPage.tsx) — Phân trang trực tiếp qua `applicantApi.list({ page, size })` kết hợp giữ nguyên `q`, `status`, `source`, `archived`.
2. **Client-side Pagination & Facebook-style Skeleton (Phân trang danh sách & Loading theo 4 khối)**:
   [`CvScreeningPage.tsx`](file:///e:/Project/SmartHire-AI/frontend/src/features/tenant/recruiter/cv-screening/pages/CvScreeningPage.tsx) — Phân chia 4 cấp độ Skeleton (`HeaderMetricBarSkeleton`, `FilterBarSkeleton`, `TableRowsSkeleton`, Footer Skeleton) với hiệu ứng chuyển trang êm ái.
