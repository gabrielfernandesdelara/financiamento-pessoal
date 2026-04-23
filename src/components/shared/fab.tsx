"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  label?: string;
  className?: string;
};

export function Fab({ onClick, label = "Adicionar", className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed bottom-20 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-elevated transition-all hover:bg-primary/90 active:scale-95 md:bottom-8 md:right-8",
        className,
      )}
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
