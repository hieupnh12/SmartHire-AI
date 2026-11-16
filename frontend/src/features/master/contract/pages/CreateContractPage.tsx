import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  CreditCard,
  Loader2,
  Plus,
  FileText,
  HelpCircle,
  ChevronDown,
  Check,
} from "lucide-react";
import { Tooltip } from "@/components/ux/Tooltip";
import { type TenantInfo } from "@/api/master/masterAdminApi";
import { useTenants, useSubscriptions, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { contractApi } from "@/api/master/contractApi";
import { consultationApi } from "@/api/master/consultationApi";
import { LEGAL_POLICY_META } from "@/config/legalConfig";
import { formatNumber, useLocale, useT } from "@/i18n";

function SectionHelpTip({ content }: { content?: string }) {
  if (!content) return null;
  return (
    <Tooltip content={content} side="top">
      <span
        tabIndex={0}
        role="button"
        aria-label={content}
        className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}

interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SelectDropdownProps<T extends string | number> {
  value: T | "";
  onChange: (val: T | "") => void;
  options: DropdownOption<T>[];
  placeholder: string;
  emptyLabel?: string;
  disabled?: boolean;
}

function SelectDropdown<T extends string | number>({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
  disabled = false,
}: SelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-left flex items-center justify-between transition-all shadow-2xs ${
          isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs"
            : "border-slate-300 hover:border-slate-400"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100 text-slate-500" : "cursor-pointer"}`}
      >
        <span
          className={`truncate ${
            selectedOption
              ? "text-sm font-medium text-slate-900"
              : "text-xs text-slate-400"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/70 p-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {emptyLabel && (
            <button
              type="button"
              onClick={() => {
                onChange("" as any);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors ${
                !value
                  ? "bg-slate-100 text-slate-800 font-semibold"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              {emptyLabel}
            </button>
          )}
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all ${
                  isSelected
                    ? "bg-indigo-50/90 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="truncate">{opt.label}</div>
                  {opt.sublabel && (
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {opt.sublabel}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CreateContractPage() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("leadId");

  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: plans = [] } = useSubscriptions();
  const setContracts = (updater: any) => queryClient.setQueryData(masterQueryKeys.contracts(), updater);

  const [contractTenantId, setContractTenantId] = useState<number | "">("");
  const [contractPlanId, setContractPlanId] = useState<number | "">("");
  const [contractTitle, setContractTitle] = useState(() => t("master.commerce.createContract.defaults.title"));
  const [contractPartyBName, setContractPartyBName] = useState("");
  const [contractPartyBTaxCode, setContractPartyBTaxCode] = useState("");
  const [contractPartyBAddress, setContractPartyBAddress] = useState("");
  const [contractPartyBRepresentative, setContractPartyBRepresentative] = useState("");
  const [contractPartyBPosition, setContractPartyBPosition] = useState(() => t("master.commerce.createContract.defaults.position"));
  const [contractPartyBPhone, setContractPartyBPhone] = useState("");
  const [contractPartyBEmail, setContractPartyBEmail] = useState("");
  const [contractPartyBBankAccount, setContractPartyBBankAccount] = useState("");
  const [contractValue, setContractValue] = useState(36000000);
  const [contractCurrency, setContractCurrency] = useState("VND");
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [contractEndDate, setContractEndDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]);
  const [contractTerms, setContractTerms] = useState(() =>
    t("master.commerce.createContract.defaults.terms", { law: LEGAL_POLICY_META.lawLabel }),
  );
  const [contractNotes, setContractNotes] = useState("");
  
  const [creatingContract, setCreatingContract] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);
  const initializedDefaultTenantRef = useRef(false);

  const tenantOptions = useMemo(
    () =>
      tenants.map((tenant) => ({
        value: tenant.id,
        label: `${tenant.name} (${tenant.code} - ${tenant.subdomain}.smarthire.top)`,
      })),
    [tenants]
  );

  const planOptions = useMemo(
    () =>
      plans
        .filter((p): p is typeof p & { id: number } => p.id !== undefined && p.id !== null)
        .map((p) => ({
          value: p.id,
          label: `${p.name} - ${
            p.priceYearly
              ? t("master.commerce.createContract.planPricePerYear", {
                  price: formatNumber(p.priceYearly, undefined, locale),
                })
              : t("master.commerce.createContract.planZeroPerYear")
          }`,
        })),
    [plans, t, locale]
  );

  const currencyOptions = useMemo(
    () => [{ value: "VND", label: "VND (₫)" }],
    []
  );

  const clearPartyBFields = () => {
    setContractPartyBName("");
    setContractPartyBAddress("");
    setContractPartyBTaxCode("");
    setContractPartyBRepresentative("");
    setContractPartyBPhone("");
    setContractPartyBEmail("");
  };

  const applyTenantPartyB = (selectedT: TenantInfo, overwrite: boolean) => {
    const realName = selectedT.companyLegalName?.trim() || selectedT.name || "";
    const realAddress = selectedT.address?.trim() || "";
    const realTaxCode = selectedT.taxCode?.trim() || "";
    const realRep = selectedT.contactName?.trim() || "";
    const realPhone = selectedT.contactPhone?.trim() || "";
    const realEmail = selectedT.billingEmail?.trim() || selectedT.contactEmail?.trim() || "";

    if (overwrite) {
      setContractPartyBName(realName);
      setContractPartyBAddress(realAddress);
      setContractPartyBTaxCode(realTaxCode);
      setContractPartyBRepresentative(realRep);
      setContractPartyBPhone(realPhone);
      setContractPartyBEmail(realEmail);
    } else {
      setContractPartyBName((prev) => prev || realName);
      setContractPartyBAddress((prev) => prev || realAddress);
      setContractPartyBTaxCode((prev) => prev || realTaxCode);
      setContractPartyBRepresentative((prev) => prev || realRep);
      setContractPartyBPhone((prev) => prev || realPhone);
      setContractPartyBEmail((prev) => prev || realEmail);
    }
  };

  useEffect(() => {
    // Set default tenant/plan once if none selected
    if (!initializedDefaultTenantRef.current && tenants.length > 0 && contractTenantId === "" && !leadId) {
      initializedDefaultTenantRef.current = true;
      const firstTenant = tenants[0];
      setContractTenantId(firstTenant.id);
      applyTenantPartyB(firstTenant, true);
    }
    if (plans.length > 0 && contractPlanId === "") {
      const defaultPlan = plans[0];
      setContractPlanId(defaultPlan.id || "");
      setContractValue(defaultPlan.priceYearly || 36000000);
    }
  }, [tenants, plans, contractTenantId, contractPlanId, leadId]);

  useEffect(() => {
    if (leadId) {
      const fetchLead = async () => {
        setLoadingLead(true);
        try {
          const lead = await consultationApi.getById(Number(leadId));
          setContractPartyBName(lead.companyName);
          setContractPartyBEmail(lead.workEmail);
          setContractPartyBRepresentative(lead.contactName);
          if (lead.phoneNumber) setContractPartyBPhone(lead.phoneNumber);
          if (lead.notes) setContractNotes(lead.notes);

          // Auto-match Tenant by company name if provisioned
          if (tenants && tenants.length > 0) {
            const matched = tenants.find((item) => item.name.toLowerCase() === lead.companyName.toLowerCase());
            if (matched) {
              setContractTenantId(matched.id);
              applyTenantPartyB(matched, false);
            }
          }
        } catch (error) {
          console.error("Failed to fetch lead", error);
        } finally {
          setLoadingLead(false);
        }
      };
      fetchLead();
    }
  }, [leadId, tenants]);

  const handleCreateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contractEndDate < contractStartDate) {
      toast.error(t("master.commerce.contractsPage.invalidDateRange") || "Ngày kết thúc hiệu lực phải sau ngày bắt đầu.");
      return;
    }
    setCreatingContract(true);
    try {
      const payload = {
        tenantId: contractTenantId ? Number(contractTenantId) : undefined,
        planId: contractPlanId ? Number(contractPlanId) : undefined,
        consultationRequestId: leadId ? Number(leadId) : undefined,
        title: contractTitle,
        partyBName: contractPartyBName,
        partyBTaxCode: contractPartyBTaxCode,
        partyBAddress: contractPartyBAddress,
        partyBRepresentative: contractPartyBRepresentative,
        partyBPosition: contractPartyBPosition,
        partyBPhone: contractPartyBPhone,
        partyBEmail: contractPartyBEmail,
        partyBBankAccount: contractPartyBBankAccount,
        contractValue,
        currency: contractCurrency,
        startDate: contractStartDate,
        endDate: contractEndDate,
        termsAndConditions: contractTerms,
        notes: contractNotes,
      };
      const res = await contractApi.create(payload as any);
      queryClient.invalidateQueries({ queryKey: masterQueryKeys.contracts() });
      setContracts((prev: any[] = []) => [res, ...prev]);
      toast.success(t("master.commerce.createContract.createdToast"));
      navigate("/admin/contracts");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("master.commerce.createContract.createErrorToast"));
    } finally {
      setCreatingContract(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5 animate-fade-in pb-12">
      {/* Top Back Action & Subtitle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t("master.commerce.createContract.backAria")}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>{t("master.commerce.createContract.backAria")}</span>
        </button>
        <div className="h-3.5 w-px bg-slate-200" />
        <span className="text-xs sm:text-sm font-medium text-slate-600">
          {t("master.commerce.createContract.title")}
        </span>
      </div>

      {/* Main Form Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative">
        {loadingLead && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs z-20 flex flex-col items-center justify-center rounded-2xl">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <span className="text-xs font-medium text-slate-600">
              {t("master.commerce.common.loading") || "Đang tải dữ liệu..."}
            </span>
          </div>
        )}

        <form onSubmit={handleCreateContractSubmit} className="space-y-6 text-sm">
          {/* SECTION 1: CONTRACT GENERAL & TENANT */}
          <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-5 transition-all">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {t("master.commerce.createContract.section1Title")}
                </h2>
                <SectionHelpTip content={t("master.commerce.createContract.section1Desc")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!leadId || contractTenantId !== "") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {t("master.commerce.createContract.workspaceLabel")}{" "}
                    <span className="font-normal text-slate-500 text-xs ml-1">
                      {leadId ? t("master.commerce.createContract.workspaceLinked") : t("master.commerce.createContract.workspaceOptional")}
                    </span>
                  </label>
                  <SelectDropdown
                    disabled={!!leadId}
                    value={contractTenantId}
                    onChange={(val) => {
                      if (!val) {
                        setContractTenantId("");
                        if (!leadId) {
                          clearPartyBFields();
                        }
                        return;
                      }
                      const tId = Number(val);
                      setContractTenantId(tId);
                      const selectedT = tenants.find((item) => item.id === tId);
                      if (selectedT) {
                        applyTenantPartyB(selectedT, !leadId);
                      }
                    }}
                    options={tenantOptions}
                    placeholder={t("master.commerce.createContract.workspacePlaceholder")}
                    emptyLabel={t("master.commerce.createContract.workspacePlaceholder")}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">{t("master.commerce.createContract.workspaceHint")}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.planLabel")}
                </label>
                <SelectDropdown
                  value={contractPlanId}
                  onChange={(val) => {
                    const planIdVal = val ? Number(val) : "";
                    setContractPlanId(planIdVal);
                    const selectedP = plans.find((p) => String(p.id) === String(planIdVal));
                    if (selectedP) {
                      const basePrice = selectedP.priceYearly || 36000000;
                      setContractValue(basePrice);
                    }
                  }}
                  options={planOptions}
                  placeholder={t("master.commerce.createContract.planPlaceholder")}
                  emptyLabel={t("master.commerce.createContract.planPlaceholder")}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("master.commerce.createContract.contractTitleLabel")}
              </label>
              <input
                type="text"
                required
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder={t("master.commerce.createContract.contractTitlePlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* SECTION 2: PARTY B LEGAL DETAILS */}
          <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-5 transition-all">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {t("master.commerce.createContract.section2Title")}
                </h2>
                <SectionHelpTip content={t("master.commerce.createContract.section2Desc")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.partyBNameLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={contractPartyBName}
                  onChange={(e) => setContractPartyBName(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBNamePlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.partyBTaxCodeLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={contractPartyBTaxCode}
                  onChange={(e) => setContractPartyBTaxCode(e.target.value)}
                  placeholder="0108899776"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 tracking-wide placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("master.commerce.createContract.partyBAddressLabel")}
              </label>
              <input
                type="text"
                required
                value={contractPartyBAddress}
                onChange={(e) => setContractPartyBAddress(e.target.value)}
                placeholder={t("master.commerce.createContract.partyBAddressPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.partyBRepLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={contractPartyBRepresentative}
                  onChange={(e) => setContractPartyBRepresentative(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBRepPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.partyBPositionLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={contractPartyBPosition}
                  onChange={(e) => setContractPartyBPosition(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBPositionPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.partyBEmailLabel")}
                </label>
                <input
                  type="email"
                  required
                  value={contractPartyBEmail}
                  onChange={(e) => setContractPartyBEmail(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBEmailPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.partyBPhoneLabel")}
                </label>
                <input
                  type="text"
                  value={contractPartyBPhone}
                  onChange={(e) => setContractPartyBPhone(e.target.value)}
                  placeholder="0988123456"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("master.commerce.createContract.partyBBankLabel")}
              </label>
              <input
                type="text"
                value={contractPartyBBankAccount}
                onChange={(e) => setContractPartyBBankAccount(e.target.value)}
                placeholder={t("master.commerce.createContract.partyBBankPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* SECTION 3: FINANCIAL VALUE */}
          <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-5 transition-all">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {t("master.commerce.createContract.section3Title")}
                </h2>
                <SectionHelpTip content={t("master.commerce.createContract.section3Desc")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.valueLabel")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    value={contractValue}
                    onChange={(e) => setContractValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 pr-12 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-xs font-bold text-emerald-600">
                    ₫
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.currencyLabel")}
                </label>
                <SelectDropdown
                  value={contractCurrency}
                  onChange={(val) => setContractCurrency(String(val))}
                  options={currencyOptions}
                  placeholder="VND (₫)"
                />
              </div>
            </div>

            {/* Total value preview banner */}
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-y-3 gap-x-6 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-[280px] flex-1">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                  <span className="text-slate-500">{t("master.commerce.createContract.paymentSummaryPrefix")}</span>{" "}
                  <strong className="text-slate-800 font-semibold">
                    {t("master.commerce.createContract.paymentSummaryMethod")}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
                <span className="text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">
                  {t("master.commerce.createContract.totalValueLabel")}
                </span>
                <span className="text-lg sm:text-xl font-bold text-emerald-600 tracking-tight whitespace-nowrap">
                  {formatNumber(contractValue, undefined, locale)}&nbsp;₫
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: DATES & SLA TERMS */}
          <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-5 transition-all">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {t("master.commerce.createContract.section4Title")}
                </h2>
                <SectionHelpTip content={t("master.commerce.createContract.section4Desc")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.startDateLabel")}
                </label>
                <input
                  type="date"
                  required
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createContract.endDateLabel")}
                </label>
                <input
                  type="date"
                  required
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("master.commerce.createContract.termsLabel")}
              </label>
              <textarea
                rows={5}
                value={contractTerms}
                onChange={(e) => setContractTerms(e.target.value)}
                className="w-full min-h-[140px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-y shadow-2xs transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("master.commerce.createContract.notesLabel")}
              </label>
              <input
                type="text"
                value={contractNotes}
                onChange={(e) => setContractNotes(e.target.value)}
                placeholder={t("master.commerce.createContract.notesPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate("/admin/contracts")}
              className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium transition-all shadow-2xs"
            >
              {t("master.commerce.common.cancelAction")}
            </button>
            <button
              type="submit"
              disabled={creatingContract}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
            >
              {creatingContract ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              <span>{t("master.commerce.createContract.submitBtn")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
