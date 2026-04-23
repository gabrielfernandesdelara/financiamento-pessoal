"use client";

// Lightweight toast store inspired by shadcn/ui's pattern.
import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 4000;

type State = { toasts: ToasterToast[] };
type Listener = (state: State) => void;

let memoryState: State = { toasts: [] };
const listeners: Listener[] = [];

function notify() {
  for (const l of listeners) l(memoryState);
}

function addToast(toast: Omit<ToasterToast, "id">) {
  const id = Math.random().toString(36).slice(2);
  const t: ToasterToast = { ...toast, id, open: true };
  memoryState = {
    toasts: [t, ...memoryState.toasts].slice(0, TOAST_LIMIT),
  };
  notify();
  setTimeout(() => dismissToast(id), TOAST_REMOVE_DELAY);
  return id;
}

function dismissToast(id: string) {
  memoryState = {
    toasts: memoryState.toasts.map((t) =>
      t.id === id ? { ...t, open: false } : t,
    ),
  };
  notify();
  setTimeout(() => {
    memoryState = {
      toasts: memoryState.toasts.filter((t) => t.id !== id),
    };
    notify();
  }, 200);
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast: (props: Omit<ToasterToast, "id">) => addToast(props),
    dismiss: (id: string) => dismissToast(id),
  };
}

export const toast = (props: Omit<ToasterToast, "id">) => addToast(props);
