import { useEffect, useState } from "react";
import { formatCountdown } from "../utils/formatCountdown";

export function useCountdown(deadline: Date | null) {
  const [label, setLabel] = useState(() =>
    deadline ? formatCountdown(Math.floor((deadline.getTime() - Date.now()) / 1000)) : "—",
  );
  const [expired, setExpired] = useState(() => (deadline ? deadline.getTime() <= Date.now() : false));

  useEffect(() => {
    if (!deadline) {
      setLabel("—");
      setExpired(false);
      return;
    }
    const tick = () => {
      const remaining = Math.floor((deadline.getTime() - Date.now()) / 1000);
      setExpired(remaining <= 0);
      setLabel(formatCountdown(remaining));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  return { label, expired };
}
