// Aceternity UI "Bento Grid", re-themed to quizzMonkey's tokens so it follows
// light/dark mode instead of hard-coded neutrals.

import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className={cn("mx-auto grid max-w-6xl grid-cols-1 gap-4 md:auto-rows-[17rem] md:grid-cols-3", className)}>
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border bg-card p-5 transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_40px_-24px_oklch(0.38_0.06_45/0.45)]",
        className,
      )}
    >
      {header}
      <div className="transition duration-300 group-hover/bento:translate-x-1">
        {icon}
        <div className="mt-2 mb-1.5 font-heading text-base font-semibold text-foreground">{title}</div>
        <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
      </div>
    </div>
  );
};
