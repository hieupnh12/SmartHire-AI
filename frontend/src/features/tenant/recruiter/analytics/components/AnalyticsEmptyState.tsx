import type { ReactNode } from "react";
import { Card } from "@/components/ux/Card";
export function AnalyticsEmptyState({ children }: { children: ReactNode }) { return <Card className="py-12 text-center text-sm text-[var(--color-text-secondary)]">{children}</Card>; }
