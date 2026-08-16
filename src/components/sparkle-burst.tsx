import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const colors = [
  "bg-accent-warm",
  "bg-accent-coral",
  "bg-accent-lilac",
  "bg-accent-sun",
];

interface SparkleBurstProps {
  x: number;
  y: number;
  done: () => void;
}

/** Small joyful confetti burst anchored to a screen coordinate. */
export function SparkleBurst({ x, y, done }: SparkleBurstProps) {
  const reduce = useReducedMotion();
  const dots = [0, 1, 2, 3, 4, 5, 6, 7];

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(done, 600);
    return () => clearTimeout(t);
  }, [reduce, done]);

  if (reduce) {
    return null;
  }

  return (
    <motion.div className="pointer-events-none fixed z-50" style={{ left: x, top: y }}>
      {dots.map((d) => (
        <motion.span
          key={d}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: Math.cos((d / dots.length) * Math.PI * 2) * 28,
            y: Math.sin((d / dots.length) * Math.PI * 2) * 28 - 8,
            opacity: 0,
            scale: 1.1,
          }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={cn("absolute h-1.5 w-1.5 rounded-full", colors[d % colors.length])}
        />
      ))}
    </motion.div>
  );
}
