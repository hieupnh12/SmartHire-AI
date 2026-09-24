import React, { createContext, useContext, useState } from "react";

interface LandingModalContextType {
  showDemoModal: boolean;
  showWorkspaceModal: boolean;
  selectedTier: string;
  requestType: "DEMO" | "CONTRACT_QUOTE";
  openDemoModal: (tierName?: string, type?: "DEMO" | "CONTRACT_QUOTE") => void;
  closeDemoModal: () => void;
  openWorkspaceModal: () => void;
  closeWorkspaceModal: () => void;
}

const defaultContextValue: LandingModalContextType = {
  showDemoModal: false,
  showWorkspaceModal: false,
  selectedTier: "Gói Doanh Nghiệp (Enterprise)",
  requestType: "DEMO",
  openDemoModal: () => {},
  closeDemoModal: () => {},
  openWorkspaceModal: () => {},
  closeWorkspaceModal: () => {},
};

const LandingModalContext = createContext<LandingModalContextType>(defaultContextValue);

export function LandingModalProvider({ children }: { children: React.ReactNode }) {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("Gói Doanh Nghiệp (Enterprise)");
  const [requestType, setRequestType] = useState<"DEMO" | "CONTRACT_QUOTE">("DEMO");

  const openDemoModal = (
    tierName: string = "Tư Vấn Giải Pháp Doanh Nghiệp",
    type: "DEMO" | "CONTRACT_QUOTE" = "DEMO"
  ) => {
    setSelectedTier(tierName);
    setRequestType(type);
    setShowDemoModal(true);
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

  return (
    <LandingModalContext.Provider
      value={{
        showDemoModal,
        showWorkspaceModal,
        selectedTier,
        requestType,
        openDemoModal,
        closeDemoModal,
        openWorkspaceModal,
        closeWorkspaceModal,
      }}
    >
      {children}
    </LandingModalContext.Provider>
  );
}

export function useLandingModal() {
  return useContext(LandingModalContext);
}
