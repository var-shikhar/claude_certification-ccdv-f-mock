"use client";

// Aceternity UI "Card Spotlight", trimmed: the radial glow follows the
// pointer using motion values only (no WebGL canvas), so it costs nothing
// until hovered and stays cheap on low-end phones.

import { useMotionValue, motion, useMotionTemplate } from "motion/react";
import React, { type MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/lib/utils";

export const CardSpotlight = ({
  children,
  radius = 320,
  className,
  ...props
}: {
  radius?: number;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: ReactMouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, var(--spotlight), transparent 80%)`;

  return (
    <div
      className={cn("group/spotlight relative overflow-hidden rounded-xl border bg-card", className)}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px z-0 rounded-xl opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
        style={{ background }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
