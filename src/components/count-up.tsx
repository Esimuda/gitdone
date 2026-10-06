"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  format = (next) => String(next),
}: {
  value: number;
  format?: (next: number) => string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const display = reduce ? value : shown;

  useEffect(() => {
    if (reduce) return;
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    let start = 0;
    const duration = 1100;
    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        frame = requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduce, value]);

  return <span ref={ref}>{format(display)}</span>;
}
