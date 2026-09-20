import { create } from "zustand";

interface RankingState {
  jobId: number | null;
  cohort: string;
  search: string;
  status: string;
  minimum: string;
  page: number;
  pageSize: number;
  selectedId: number | null;
  sort: string;
  setJob: (id: number | null) => void;
  filter: (value: Partial<Pick<RankingState, "cohort" | "search" | "status" | "minimum" | "sort">>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  select: (id: number | null) => void;
}
export const useRankingStore = create<RankingState>((set) => ({
  jobId: null, cohort: "ALL", search: "", status: "ACTIVE", minimum: "", page: 0, pageSize: 20, selectedId: null, sort: "score",
  setJob: (jobId) => set({ jobId, cohort: "ALL", search: "", status: "ACTIVE", minimum: "", page: 0, selectedId: null }),
  filter: (value) => set({ ...value, page: 0 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 0 }),
  select: (selectedId) => set({ selectedId }),
}));
