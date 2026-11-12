import { createContext, useContext, type MutableRefObject } from "react";

export type NavLinkRect = {
  left: number;
  width: number;
  centerX: number;
};

export type DockedArcBounds = {
  left: number;
  width: number;
};

export type SubPillSnapshot = {
  left: number;
  width: number;
  centerPct: number;
  index: number;
};

export type NavArcContextValue = {
  activeMainRect: NavLinkRect | null;
  canDockWithTopNav: boolean;
  setDockedArcBounds: (bounds: DockedArcBounds | null) => void;
  lastSubArcLeftRef: MutableRefObject<number | null>;
  lastSubPillByGroupRef: MutableRefObject<Record<string, SubPillSnapshot>>;
};

const fallbackArcLeftRef: MutableRefObject<number | null> = { current: null };
const fallbackPillMapRef: MutableRefObject<Record<string, SubPillSnapshot>> = { current: {} };

export const NavArcContext = createContext<NavArcContextValue>({
  activeMainRect: null,
  canDockWithTopNav: false,
  setDockedArcBounds: () => {},
  lastSubArcLeftRef: fallbackArcLeftRef,
  lastSubPillByGroupRef: fallbackPillMapRef,
});

export function useNavArc(): NavArcContextValue {
  return useContext(NavArcContext);
}

