"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function getFifthBusinessDay(year: number, month: number): Date {
  let count = 0;
  let day = 1;
  while (count < 5) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) count++;
    if (count < 5) day++;
  }
  return new Date(year, month, day);
}

function storageKey(year: number, month: number) {
  return `qd_ok_${year}_${month}`;
}

export function QuintoDiaPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const today = new Date();
      const y = today.getFullYear();
      const m = today.getMonth();
      const fifth = getFifthBusinessDay(y, m);

      const isFifthOrLater = today >= fifth;
      const alreadyConfirmed = localStorage.getItem(storageKey(y, m)) === "1";

      if (isFifthOrLater && !alreadyConfirmed) setOpen(true);
    } catch {
      // localStorage unavailable (SSR guard)
    }
  }, []);

  function handleConfirm() {
    const today = new Date();
    localStorage.setItem(storageKey(today.getFullYear(), today.getMonth()), "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Verificação mensal 📋</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Hoje é ou já passou o <strong>5º dia útil do mês</strong> — data de referência para pagamento do salário e das compras.
            <br /><br />
            Você pagou todas as suas compras em aberto?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            Sim, está tudo pago! ✓
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
