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

function buildDemoPath(
  tierName?: string,
  type: "DEMO" | "CONTRACT_QUOTE" = "DEMO",
) {
  const params = new URLSearchParams();
  if (tierName?.trim()) {
    params.set("tier", tierName);
  }
  params.set("type", type);
  return `/demo?${params.toString()}`;
}

const defaultContextValue: LandingModalContextType = {
  showWorkspaceModal: false,
  showOrderLookupModal: false,
  openDemoModal: (tierName, type) => {
    window.location.assign(buildDemoPath(tierName, type));
  },
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
    tierName?: string,
    type: "DEMO" | "CONTRACT_QUOTE" = "DEMO",
  ) => {
    navigate(buildDemoPath(tierName, type));
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
