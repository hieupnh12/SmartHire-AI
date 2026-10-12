import { useEffect } from "react";

/**
 * Activates scroll-reveal animations on the landing page.
 * Observes all [data-reveal] and [data-reveal-stagger] elements and
 * adds the "is-visible" class when they enter the viewport.
 *
 * Usage: call useScrollReveal() in a page component.
 * Pair with CSS classes defined in index.css.
 */
export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      "[data-reveal], [data-reveal-stagger]"
    );

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            // Stop observing once visible — no re-trigger on scroll-up
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,   // Trigger when 12% of element is visible
        rootMargin: "0px 0px -48px 0px", // Slight bottom offset for earlier feel
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
