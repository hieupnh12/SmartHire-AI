import React, { createContext, useContext, useState } from "react";
import { t as globalT } from "@/i18n";

interface LandingModalContextType {
  showDemoModal: boolean;
  showWorkspaceModal: boolean;
  showOrderLookupModal: boolean;
  selectedTier: string;
  requestType: "DEMO" | "CONTRACT_QUOTE";
  openDemoModal: (tierName?: string, type?: "DEMO" | "CONTRACT_QUOTE") => void;
  closeDemoModal: () => void;
  openWorkspaceModal: () => void;
  closeWorkspaceModal: () => void;
  openOrderLookupModal: () => void;
  closeOrderLookupModal: () => void;
}

const defaultContextValue: LandingModalContextType = {
  showDemoModal: false,
  showWorkspaceModal: false,
  showOrderLookupModal: false,
  selectedTier: "",
  requestType: "DEMO",
  openDemoModal: () => {},
  closeDemoModal: () => {},
  openWorkspaceModal: () => {},
  closeWorkspaceModal: () => {},
  openOrderLookupModal: () => {},
  closeOrderLookupModal: () => {},
};

const LandingModalContext = createContext<LandingModalContextType>(defaultContextValue);

export function LandingModalProvider({ children }: { children: React.ReactNode }) {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showOrderLookupModal, setShowOrderLookupModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>(() =>
    globalT("master.landingChrome.modals.defaultEnterpriseTier"),
  );
  const [requestType, setRequestType] = useState<"DEMO" | "CONTRACT_QUOTE">("DEMO");

  // Navigate to the dedicated /demo page instead of opening a popup modal.
  const openDemoModal = (
    tierName?: string,
    type: "DEMO" | "CONTRACT_QUOTE" = "DEMO",
  ) => {
    const resolvedTier = tierName ?? globalT("master.landingChrome.modals.defaultConsultTier");
    setSelectedTier(resolvedTier);
    setRequestType(type);
    const params = new URLSearchParams({ tier: resolvedTier, type });
    window.location.href = `/demo?${params.toString()}`;
  };

  const closeDemoModal = () => {
    setShowDemoModal(false);
  };

  const openWorkspaceModal = () => {
    setShowWorkspaceModal(true);
  };

  const closeWorkspaceModal = () => {
    setShowWorkspaceModal(false);
  };

  const openOrderLookupModal = () => {
    setShowOrderLookupModal(true);
  };

  const closeOrderLookupModal = () => {
    setShowOrderLookupModal(false);
  };

  return (
    <LandingModalContext.Provider
      value={{
        showDemoModal,
        showWorkspaceModal,
        showOrderLookupModal,
        selectedTier,
        requestType,
        openDemoModal,
        closeDemoModal,
        openWorkspaceModal,
        closeWorkspaceModal,
        openOrderLookupModal,
        closeOrderLookupModal,
      }}
    >
      {children}
    </LandingModalContext.Provider>
  );
}

export function useLandingModal() {
  return useContext(LandingModalContext);
}
