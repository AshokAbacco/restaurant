// ==============================================
// src/landing/hooks/useLandingMotion.js
// ==============================================
//
// The three bits of scroll behaviour the landing page needs. They live
// together because they share one rule: if the visitor has asked their
// operating system for reduced motion, none of them do anything, and the
// content is shown in its final state immediately rather than being left
// invisible waiting for an observer that never fires.

import { useEffect, useRef, useState } from "react";

// ==============================================
// PREFERS REDUCED MOTION
// ==============================================

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ==============================================
// useReveal
// ==============================================
//
// Attach the returned ref to an element carrying the `lp-reveal` class.
// It gains `is-in` the first time it enters the viewport and keeps it —
// re-animating on the way back up is distracting when someone is
// scrolling to find something they already read.
//
//   const ref = useReveal();
//   <div ref={ref} className="lp-reveal">…</div>

export const useReveal = ({ threshold = 0.15, rootMargin = "0px 0px -8% 0px" } = {}) => {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No observer support, or motion turned down: show it and stop.
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      node.classList.add("is-in");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
};

// ==============================================
// useScrolledPast
// ==============================================
//
// True once the page has scrolled past `offset`. The navbar uses it to
// swap from sitting transparently on the hero to a solid bar with a
// hairline underneath.
//
// Read from a passive scroll listener and gated through requestAnimation-
// Frame so a fast wheel doesn't queue a state update per event.

export const useScrolledPast = (offset = 12) => {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    let frame = null;

    const read = () => {
      frame = null;
      setPassed(window.scrollY > offset);
    };

    const onScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [offset]);

  return passed;
};

// ==============================================
// useActiveStep
// ==============================================
//
// Which of N stacked panels is currently the one being read, for the
// pinned-image story section.
//
// The observer's rootMargin squeezes the viewport down to a thin band
// across its middle. A panel counts as active while it crosses that
// band, which is the same thing a reader means by "the one I'm looking
// at" — using plain intersection instead would flip to the next panel
// the instant a pixel of it appeared at the bottom of the screen.

export const useActiveStep = (count) => {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  const setStepRef = (index) => (node) => {
    refs.current[index] = node;
  };

  useEffect(() => {
    const nodes = refs.current.filter(Boolean);
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number(entry.target.dataset.stepIndex);
          if (!Number.isNaN(index)) setActive(index);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [count]);

  return { active, setStepRef };
};
