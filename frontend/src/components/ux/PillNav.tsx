import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Link } from "react-router-dom";
import { useNavArc } from "@/components/ux/NavArcContext";
import { cn } from "@/lib/utils";

export type PillNavItem<T extends string = string> = {
  id: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  to?: string;
};

type Props<T extends string> = {
  items: readonly PillNavItem<T>[];
  activeId: T;
  ariaLabel: string;
  onSelect?: (id: T) => void;
  onDirectionChange?: (direction: "left" | "right") => void;
  className?: string;
  variant?: "docked" | "cradle";
  dockGroup?: string;
};

type PillBox = {
  left: number;
  width: number;
};

type BeamDash = {
  dasharray: string;
  dashoffset: number;
};

function findLengthAtX(pathEl: SVGPathElement, targetX: number): number {
  const total = pathEl.getTotalLength();
  if (total <= 0) return 0;
  let lo = 0;
  let hi = total;
  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) * 0.5;
    const pt = pathEl.getPointAtLength(mid);
    if (pt.x < targetX) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

function buildDockedArcPaths(width: number, height: number): {
  fillPath: string;
  strokePath: string;
} {
  const shoulderX = Math.min(46, Math.max(38, width * 0.12));
  const midY = Math.round(height * 0.62);
  const shoulderY = height - 8;
  const controlY = height + 2;

  const fillPath = [
    `M 0,0`,
    `C 14,0 18,5 20,17`,
    `C 22,${midY} 27,${shoulderY} ${shoulderX},${shoulderY}`,
    `Q ${width / 2},${controlY} ${width - shoulderX},${shoulderY}`,
    `C ${width - 27},${shoulderY} ${width - 22},${midY} ${width - 20},17`,
    `C ${width - 18},5 ${width - 14},0 ${width},0`,
    `Z`,
  ].join(" ");

  const strokePath = [
    `M 0,0.4`,
    `C 14,0.4 18,5 20,17`,
    `C 22,${midY} 27,${shoulderY} ${shoulderX},${shoulderY}`,
    `Q ${width / 2},${controlY} ${width - shoulderX},${shoulderY}`,
    `C ${width - 27},${shoulderY} ${width - 22},${midY} ${width - 20},17`,
    `C ${width - 18},5 ${width - 14},0.4 ${width},0.4`,
  ].join(" ");

  return { fillPath, strokePath };
}

/** Curved lower arc navigation dock with elastic liquid pill & beam choreography. */
export function PillNav<T extends string>({
  items,
  activeId,
  ariaLabel,
  onSelect,
  onDirectionChange,
  className,
  variant = "cradle",
  dockGroup,
}: Props<T>) {
  const {
    activeMainRect,
    canDockWithTopNav,
    setDockedArcBounds,
    lastSubArcLeftRef,
    lastSubPillByGroupRef,
  } = useNavArc();

  const rawId = useId();
  const safeId = rawId.replace(/:/g, "");
  const hullGradId = `pill-nav-hull-${safeId}`;

  const trackRef = useRef<HTMLDivElement>(null);
  const arcBoxRef = useRef<HTMLDivElement>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const beamPathRef = useRef<SVGPathElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  const [trackMetrics, setTrackMetrics] = useState<{ width: number; offsetInMain: number }>({
    width: 0,
    offsetInMain: 0,
  });
  const [arcSize, setArcSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [tablistOffsetInArc, setTablistOffsetInArc] = useState(0);

  const [pillRect, setPillRect] = useState<PillBox | null>(null);
  const [pillTransitionReady, setPillTransitionReady] = useState(false);
  const [hoverPill, setHoverPill] = useState<PillBox | null>(null);
  const [beamDash, setBeamDash] = useState<BeamDash | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const [renderArcX, setRenderArcX] = useState<number>(0);
  const [arcTransitionReady, setArcTransitionReady] = useState(false);

  const prevActiveIdRef = useRef<T | null>(null);
  const pillMountDoneRef = useRef(false);
  const arcMountDoneRef = useRef(false);
  const holdingPillFrameRef = useRef(false);
  const holdingArcFrameRef = useRef(false);
  const latestPillTargetRef = useRef<PillBox | null>(null);
  const latestArcTargetRef = useRef<{ x: number; boundsWidth: number; offsetInMain: number } | null>(null);

  const measureGeometry = useCallback(() => {
    const trackEl = trackRef.current;
    const arcEl = arcBoxRef.current;
    const scrollEl = scrollWrapRef.current;

    if (trackEl) {
      const mainEl = document.getElementById("main-content");
      let offsetInMain = 0;
      if (mainEl) {
        const mainStyle = getComputedStyle(mainEl);
        const mainPadLeft = Number.parseFloat(mainStyle.paddingLeft) || 0;
        const mainOriginX = mainEl.getBoundingClientRect().left + mainPadLeft;
        offsetInMain = Math.max(0, trackEl.getBoundingClientRect().left - mainOriginX);
      }
      const width = trackEl.clientWidth;
      setTrackMetrics((prev) =>
        Math.abs(prev.width - width) < 0.5 && Math.abs(prev.offsetInMain - offsetInMain) < 0.5
          ? prev
          : { width, offsetInMain },
      );
    }

    if (arcEl) {
      const width = arcEl.offsetWidth;
      const height = arcEl.offsetHeight;
      setArcSize((prev) =>
        Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
          ? prev
          : { width, height },
      );
    }

    if (scrollEl) {
      const offsetX = scrollEl.offsetLeft - scrollEl.scrollLeft;
      setTablistOffsetInArc((prev) => (Math.abs(prev - offsetX) < 0.5 ? prev : offsetX));
    }
  }, []);

  useLayoutEffect(() => {
    measureGeometry();
    const scrollEl = scrollWrapRef.current;
    const onTabScroll = () => measureGeometry();
    scrollEl?.addEventListener("scroll", onTabScroll, { passive: true });

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measureGeometry());
      if (trackRef.current) ro.observe(trackRef.current);
      if (arcBoxRef.current) ro.observe(arcBoxRef.current);
    }
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measureGeometry();
    });
    return () => {
      cancelled = true;
      scrollEl?.removeEventListener("scroll", onTabScroll);
      ro?.disconnect();
    };
  }, [measureGeometry, items.length]);

  useLayoutEffect(() => {
    const activeEl = itemRefs.current[activeId];
    const tablistEl = tablistRef.current;
    if (!activeEl || !tablistEl) return;

    const targetLeft = activeEl.offsetLeft;
    const targetWidth = activeEl.offsetWidth;
    const totalW = tablistEl.scrollWidth || activeEl.offsetWidth;
    const targetCenterPct = totalW > 0 ? ((targetLeft + targetWidth / 2) / totalW) * 100 : 50;
    const activeIdx = Math.max(
      0,
      items.findIndex((item) => item.id === activeId),
    );

    latestPillTargetRef.current = { left: targetLeft, width: targetWidth };

    const prevSaved = dockGroup ? lastSubPillByGroupRef.current[dockGroup] : undefined;
    const isInitialMount = !pillMountDoneRef.current;
    pillMountDoneRef.current = true;

    if (isInitialMount && prevSaved && prevSaved.index !== activeIdx) {
      onDirectionChange?.(activeIdx > prevSaved.index ? "right" : "left");
      holdingPillFrameRef.current = true;
      setPillTransitionReady(false);
      setPillRect({ left: prevSaved.left, width: prevSaved.width });
    } else if (!holdingPillFrameRef.current) {
      if (prevActiveIdRef.current !== null && prevActiveIdRef.current !== activeId) {
        const prevIdx = items.findIndex((item) => item.id === prevActiveIdRef.current);
        if (prevIdx !== -1 && prevIdx !== activeIdx) {
          onDirectionChange?.(activeIdx > prevIdx ? "right" : "left");
        }
        setBurstKey((k) => k + 1);
      }
      setPillRect((prev) =>
        prev && Math.abs(prev.left - targetLeft) < 0.5 && Math.abs(prev.width - targetWidth) < 0.5
          ? prev
          : { left: targetLeft, width: targetWidth },
      );
      if (!isInitialMount) {
        setPillTransitionReady(true);
      }
    }

    prevActiveIdRef.current = activeId;
    if (dockGroup) {
      lastSubPillByGroupRef.current[dockGroup] = {
        left: targetLeft,
        width: targetWidth,
        centerPct: targetCenterPct,
        index: activeIdx,
      };
    }
  }, [activeId, dockGroup, items, lastSubPillByGroupRef, onDirectionChange]);

  const isMobileConstrained =
    trackMetrics.width > 0 && arcSize.width > 0 && trackMetrics.width < arcSize.width + 12;
  const isDocked =
    variant === "docked" && canDockWithTopNav && !isMobileConstrained && trackMetrics.width > 0;

  useLayoutEffect(() => {
    if (!isDocked || arcSize.width <= 0) {
      setDockedArcBounds(null);
      return;
    }

    const desiredCenterInTrack = activeMainRect
      ? activeMainRect.centerX - trackMetrics.offsetInMain
      : arcSize.width / 2;
    const maxArcLeft = Math.max(0, trackMetrics.width - arcSize.width);
    const targetArcLeft = Math.max(0, Math.min(desiredCenterInTrack - arcSize.width / 2, maxArcLeft));

    latestArcTargetRef.current = {
      x: targetArcLeft,
      boundsWidth: arcSize.width,
      offsetInMain: trackMetrics.offsetInMain,
    };

    const prevSavedX = lastSubArcLeftRef.current;
    const isInitialMount = !arcMountDoneRef.current;
    arcMountDoneRef.current = true;

    if (isInitialMount && prevSavedX !== null && Math.abs(prevSavedX - targetArcLeft) > 1) {
      holdingArcFrameRef.current = true;
      setArcTransitionReady(false);
      const clampedPrev = Math.max(0, Math.min(prevSavedX, maxArcLeft));
      setRenderArcX(clampedPrev);
      setDockedArcBounds({
        left: clampedPrev + trackMetrics.offsetInMain,
        width: arcSize.width,
      });
    } else if (!holdingArcFrameRef.current) {
      setRenderArcX(targetArcLeft);
      setDockedArcBounds({
        left: targetArcLeft + trackMetrics.offsetInMain,
        width: arcSize.width,
      });
      if (!isInitialMount) {
        setArcTransitionReady(true);
      }
    }

    lastSubArcLeftRef.current = targetArcLeft;
  }, [
    activeMainRect,
    arcSize.width,
    isDocked,
    lastSubArcLeftRef,
    setDockedArcBounds,
    trackMetrics.offsetInMain,
    trackMetrics.width,
  ]);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (holdingPillFrameRef.current && latestPillTargetRef.current) {
          holdingPillFrameRef.current = false;
          setPillTransitionReady(true);
          setPillRect(latestPillTargetRef.current);
          setBurstKey((k) => k + 1);
        } else {
          setPillTransitionReady(true);
        }

        if (holdingArcFrameRef.current && latestArcTargetRef.current) {
          holdingArcFrameRef.current = false;
          setArcTransitionReady(true);
          setRenderArcX(latestArcTargetRef.current.x);
          setDockedArcBounds({
            left: latestArcTargetRef.current.x + latestArcTargetRef.current.offsetInMain,
            width: latestArcTargetRef.current.boundsWidth,
          });
        } else {
          setArcTransitionReady(true);
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      setDockedArcBounds(null);
    };
  }, [setDockedArcBounds]);

  const showDockedSvg = isDocked && arcSize.width >= 80 && arcSize.height >= 24;
  const showCradleSvg = !isDocked && arcSize.width >= 80 && arcSize.height >= 24;
  const dockedPaths = showDockedSvg
    ? buildDockedArcPaths(arcSize.width, arcSize.height)
    : null;
  const cradleArcPath = showCradleSvg
    ? `M 8,${arcSize.height - 2.5} Q ${arcSize.width / 2},${arcSize.height + 0.5} ${arcSize.width - 8},${arcSize.height - 2.5}`
    : null;
  const activeSvgStrokePath = dockedPaths?.strokePath ?? cradleArcPath;

  useLayoutEffect(() => {
    const pathEl = beamPathRef.current;
    if (!pathEl || !pillRect || !activeSvgStrokePath || arcSize.width <= 0) {
      setBeamDash(null);
      return;
    }
    const totalLen = pathEl.getTotalLength();
    if (totalLen <= 0) return;

    const minSafeX = isDocked ? 36 : 10;
    const maxSafeX = arcSize.width - minSafeX;
    const tabLeftInArc = tablistOffsetInArc + pillRect.left;
    const inset = Math.min(10, Math.max(5, pillRect.width * 0.14));
    const x1 = Math.max(minSafeX, tabLeftInArc + inset);
    const x2 = Math.min(maxSafeX, tabLeftInArc + pillRect.width - inset);
    if (x2 <= x1 + 6) {
      setBeamDash(null);
      return;
    }

    const startLen = findLengthAtX(pathEl, x1);
    const endLen = findLengthAtX(pathEl, x2);
    const segLen = Math.max(12, endLen - startLen);

    setBeamDash({
      dasharray: `${segLen.toFixed(1)} ${(totalLen + 80).toFixed(1)}`,
      dashoffset: -startLen,
    });
  }, [activeSvgStrokePath, arcSize.width, arcSize.height, isDocked, pillRect, tablistOffsetInArc]);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative min-w-0 max-w-full",
        isDocked && "z-30 -mt-3 sm:-mt-3.5",
        className,
      )}
    >
      <div
        ref={arcBoxRef}
        style={
          isDocked
            ? {
                transform: `translateX(${renderArcX}px)`,
                transition: arcTransitionReady
                  ? "transform 480ms cubic-bezier(0.22, 1.2, 0.36, 1)"
                  : "none",
              }
            : undefined
        }
        className={cn(
          "relative inline-flex max-w-full items-center",
          isDocked
            ? "px-9 pt-[5px] pb-[12px] drop-shadow-[0_10px_20px_rgba(15,23,42,0.06)]"
            : "rounded-full border border-slate-200/90 bg-white/95 px-2.5 py-1.5 shadow-[0_8px_22px_-12px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95",
        )}
      >
        {dockedPaths && (
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${arcSize.width} ${arcSize.height}`}
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id={hullGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
            </defs>
            <path d={dockedPaths.fillPath} fill={`url(#${hullGradId})`} />
            <path
              d={dockedPaths.strokePath}
              fill="none"
              stroke="var(--color-border-default)"
              strokeWidth="1.2"
            />
            {beamDash && (
              <path
                d={dockedPaths.strokePath}
                fill="none"
                stroke="var(--color-primary)"
                strokeOpacity="0.22"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={beamDash.dasharray}
                strokeDashoffset={beamDash.dashoffset}
                style={{
                  transition: pillTransitionReady
                    ? "stroke-dashoffset 400ms cubic-bezier(0.34, 1.38, 0.64, 1), stroke-dasharray 340ms cubic-bezier(0.22, 1.28, 0.36, 1)"
                    : "none",
                }}
              />
            )}
            <path
              ref={beamPathRef}
              d={dockedPaths.strokePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={beamDash ? beamDash.dasharray : "0 9999"}
              strokeDashoffset={beamDash ? beamDash.dashoffset : 0}
              style={{
                opacity: beamDash ? 1 : 0,
                transition: pillTransitionReady
                  ? "stroke-dashoffset 400ms cubic-bezier(0.34, 1.38, 0.64, 1), stroke-dasharray 340ms cubic-bezier(0.22, 1.28, 0.36, 1), opacity 180ms ease"
                  : "none",
              }}
            />
          </svg>
        )}

        {cradleArcPath && (
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${arcSize.width} ${arcSize.height}`}
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {beamDash && (
              <path
                d={cradleArcPath}
                fill="none"
                stroke="var(--color-primary)"
                strokeOpacity="0.22"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={beamDash.dasharray}
                strokeDashoffset={beamDash.dashoffset}
                style={{
                  transition: pillTransitionReady
                    ? "stroke-dashoffset 400ms cubic-bezier(0.34, 1.38, 0.64, 1), stroke-dasharray 340ms cubic-bezier(0.22, 1.28, 0.36, 1)"
                    : "none",
                }}
              />
            )}
            <path
              ref={beamPathRef}
              d={cradleArcPath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={beamDash ? beamDash.dasharray : "0 9999"}
              strokeDashoffset={beamDash ? beamDash.dashoffset : 0}
              style={{
                opacity: beamDash ? 1 : 0,
                transition: pillTransitionReady
                  ? "stroke-dashoffset 400ms cubic-bezier(0.34, 1.38, 0.64, 1), stroke-dasharray 340ms cubic-bezier(0.22, 1.28, 0.36, 1), opacity 180ms ease"
                  : "none",
              }}
            />
          </svg>
        )}

        <div
          ref={scrollWrapRef}
          role="tablist"
          aria-label={ariaLabel}
          className="relative z-10 max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            ref={tablistRef}
            onMouseLeave={() => setHoverPill(null)}
            className="relative inline-flex items-center gap-1"
          >
            {hoverPill && (
              <div
                aria-hidden="true"
                style={{ left: hoverPill.left, width: hoverPill.width }}
                className="pointer-events-none absolute inset-y-0 rounded-full bg-slate-100/90 transition-[left,width,opacity] duration-200 ease-out dark:bg-slate-800/80"
              />
            )}

            {pillRect && (
              <div
                aria-hidden="true"
                style={{
                  left: pillRect.left,
                  width: pillRect.width,
                  transition: pillTransitionReady
                    ? "left 400ms cubic-bezier(0.34, 1.38, 0.64, 1), width 340ms cubic-bezier(0.22, 1.28, 0.36, 1)"
                    : "none",
                }}
                className="pointer-events-none absolute inset-y-0 overflow-hidden rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] shadow-[0_6px_16px_-5px_var(--color-primary-shadow)]"
              >
                <span
                  key={burstKey}
                  className="animate-nav-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                />
              </div>
            )}

            {items.map((item) => {
              const active = activeId === item.id;
              const Icon = item.icon;
              const itemClass = cn(
                "relative z-10 inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] transition-colors duration-200 cursor-pointer select-none active:scale-[0.96]",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]",
                active
                  ? "font-semibold text-white"
                  : "font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
              );

              const content = (
                <>
                  {active && burstKey > 0 && (
                    <span
                      key={`ripple-${burstKey}`}
                      aria-hidden="true"
                      className="animate-nav-ripple pointer-events-none absolute inset-0 rounded-full bg-white/25"
                    />
                  )}
                  {Icon && (
                    <Icon
                      key={active ? `icon-${burstKey}` : "icon-idle"}
                      className={cn(
                        "size-3.5 shrink-0 transition-transform duration-200",
                        active
                          ? "animate-nav-icon-pop text-white"
                          : "text-slate-500 dark:text-slate-400",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </>
              );

              const handleEnter = (element: HTMLElement) => {
                setHoverPill({ left: element.offsetLeft, width: element.offsetWidth });
              };

              if (item.to != null) {
                return (
                  <Link
                    key={item.id}
                    ref={(node) => {
                      itemRefs.current[item.id] = node;
                    }}
                    to={item.to}
                    role="tab"
                    aria-selected={active}
                    aria-current={active ? "page" : undefined}
                    onMouseEnter={(event) => handleEnter(event.currentTarget)}
                    onClick={() => onSelect?.(item.id)}
                    className={itemClass}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[item.id] = node;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onMouseEnter={(event) => handleEnter(event.currentTarget)}
                  onClick={() => onSelect?.(item.id)}
                  className={itemClass}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
