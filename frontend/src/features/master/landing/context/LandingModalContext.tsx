import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

interface LandingModalContextType {
  showWorkspaceModal: boolean;
  showOrderLookupModal: boolean;
  openDemoModal: (tierName?: string, type?: "DEMO" | "CONTRACT_QUOTE") => void;
  openWorkspaceModal: () => void;
  closeWorkspaceModal: () => void;
  openOrderLookupModal: () => void;
  closeOrderLookupModal: () => void;
}

const defaultContextValue: LandingModalContextType = {
  showWorkspaceModal: false,
  showOrderLookupModal: false,
  openDemoModal: () => {},
  openWorkspaceModal: () => {},
  closeWorkspaceModal: () => {},
  openOrderLookupModal: () => {},
  closeOrderLookupModal: () => {},
};

const LandingModalContext = createContext<LandingModalContextType>(defaultContextValue);

export function LandingModalProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showOrderLookupModal, setShowOrderLookupModal] = useState(false);

  // Navigate to the dedicated /demo page instead of opening a popup modal.
  const openDemoModal = (
    tierName: string = "Tư Vấn Giải Pháp Doanh Nghiệp",
    type: "DEMO" | "CONTRACT_QUOTE" = "DEMO"
  ) => {
    const params = new URLSearchParams({ tier: tierName, type });
    navigate(`/demo?${params.toString()}`);
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
        showWorkspaceModal,
        showOrderLookupModal,
        openDemoModal,
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
