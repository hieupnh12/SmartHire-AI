import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileSignature, Building2, ShieldCheck, CreditCard, Loader2, Plus } from "lucide-react";
import { type TenantInfo } from "@/api/master/masterAdminApi";
import { useTenants, useSubscriptions, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { contractApi } from "@/api/master/contractApi";
import { consultationApi } from "@/api/master/consultationApi";
import { LEGAL_POLICY_META } from "@/config/legalConfig";
import { formatNumber, useLocale, useT } from "@/i18n";

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("master.commerce.createContract.backAria")}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-indigo-600" />
            {t("master.commerce.createContract.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("master.commerce.createContract.subtitle")}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs relative">
        {loadingLead && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}

        <form onSubmit={handleCreateContractSubmit} className="space-y-6 text-sm">
          {/* SECTION 1: CONTRACT GENERAL & TENANT */}
          <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
            <div className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>{t("master.commerce.createContract.section1Title")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!leadId || contractTenantId !== "") && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {t("master.commerce.createContract.workspaceLabel")}{" "}
                    <span className="font-normal text-slate-500 text-xs ml-1">
                      {leadId ? t("master.commerce.createContract.workspaceLinked") : t("master.commerce.createContract.workspaceOptional")}
                    </span>
                  </label>
                  <select
                    disabled={!!leadId}
                    value={contractTenantId}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    if (!rawVal) {
                      setContractTenantId("");
                      if (!leadId) {
                        clearPartyBFields();
                      }
                      return;
                    }
                    const tId = Number(rawVal);
                    setContractTenantId(tId);
                    const selectedT = tenants.find((item) => item.id === tId);
                    if (selectedT) {
                      applyTenantPartyB(selectedT, !leadId);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="">{t("master.commerce.createContract.workspacePlaceholder")}</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.code} - {tenant.subdomain}.smarthire.top)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">{t("master.commerce.createContract.workspaceHint")}</p>
              </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.planLabel")}</label>
                <select
                  value={contractPlanId}
                  onChange={(e) => {
                    const planIdVal = e.target.value ? Number(e.target.value) : "";
                    setContractPlanId(planIdVal);
                    const selectedP = plans.find((p) => String(p.id) === String(planIdVal));
                    if (selectedP) {
                      const basePrice = selectedP.priceYearly || 36000000;
                      setContractValue(basePrice);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="">{t("master.commerce.createContract.planPlaceholder")}</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.priceYearly ? t("master.commerce.createContract.planPricePerYear", { price: formatNumber(p.priceYearly, undefined, locale) }) : t("master.commerce.createContract.planZeroPerYear")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.contractTitleLabel")}</label>
              <input
                type="text"
                required
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder={t("master.commerce.createContract.contractTitlePlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          {/* SECTION 2: PARTY B LEGAL DETAILS */}
          <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
            <div className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-600" />
              <span>{t("master.commerce.createContract.section2Title")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBNameLabel")}</label>
                <input
                  type="text"
                  required
                  value={contractPartyBName}
                  onChange={(e) => setContractPartyBName(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBNamePlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBTaxCodeLabel")}</label>
                <input
                  type="text"
                  required
                  value={contractPartyBTaxCode}
                  onChange={(e) => setContractPartyBTaxCode(e.target.value)}
                  placeholder="0108899776"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBAddressLabel")}</label>
              <input
                type="text"
                required
                value={contractPartyBAddress}
                onChange={(e) => setContractPartyBAddress(e.target.value)}
                placeholder={t("master.commerce.createContract.partyBAddressPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBRepLabel")}</label>
                <input
                  type="text"
                  required
                  value={contractPartyBRepresentative}
                  onChange={(e) => setContractPartyBRepresentative(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBRepPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBPositionLabel")}</label>
                <input
                  type="text"
                  required
                  value={contractPartyBPosition}
                  onChange={(e) => setContractPartyBPosition(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBPositionPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBPhoneLabel")}</label>
                <input
                  type="text"
                  value={contractPartyBPhone}
                  onChange={(e) => setContractPartyBPhone(e.target.value)}
                  placeholder="0988123456"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBEmailLabel")}</label>
                <input
                  type="email"
                  required
                  value={contractPartyBEmail}
                  onChange={(e) => setContractPartyBEmail(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBEmailPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-indigo-700 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.partyBBankLabel")}</label>
                <input
                  type="text"
                  value={contractPartyBBankAccount}
                  onChange={(e) => setContractPartyBBankAccount(e.target.value)}
                  placeholder={t("master.commerce.createContract.partyBBankPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: FINANCIAL VALUE */}
          <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
            <div className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>{t("master.commerce.createContract.section3Title")}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.valueLabel")}</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.currencyLabel")}</label>
                <select
                  value={contractCurrency}
                  onChange={(e) => setContractCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="VND">VND (₫)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-sm">
              <span className="text-slate-500">{t("master.commerce.createContract.paymentSummaryPrefix")} <strong className="text-slate-700">{t("master.commerce.createContract.paymentSummaryMethod")}</strong></span>
              <div>
                <span className="font-bold text-slate-900">{t("master.commerce.createContract.totalValueLabel")} </span>
                <span className="font-mono font-bold text-emerald-600 text-lg ml-2">
                  {formatNumber(contractValue, undefined, locale)} ₫
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: DATES & SLA */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-5 bg-slate-50/50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.startDateLabel")}</label>
              <input
                type="date"
                required
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.endDateLabel")}</label>
              <input
                type="date"
                required
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.termsLabel")}</label>
            <textarea
              rows={4}
              value={contractTerms}
              onChange={(e) => setContractTerms(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 resize-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createContract.notesLabel")}</label>
            <input
              type="text"
              value={contractNotes}
              onChange={(e) => setContractNotes(e.target.value)}
              placeholder={t("master.commerce.createContract.notesPlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 text-sm"
            />
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate("/admin/contracts")}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
            >
              {t("master.commerce.common.cancelAction")}
            </button>
            <button
              type="submit"
              disabled={creatingContract}
              className="px-8 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors"
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
