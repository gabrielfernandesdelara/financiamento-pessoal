"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { comprasClient } from "@/services/compras-client";
import type { Compra, CompraInput } from "@/types/compra";

const KEY = ["compras"] as const;
const HIST = ["historico"] as const;

export function useCompras() {
  return useQuery<Compra[]>({ queryKey: KEY, queryFn: comprasClient.list });
}

export function useCreateCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompraInput) => comprasClient.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: HIST });
    },
  });
}

export function useUpdateCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompraInput }) =>
      comprasClient.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: HIST });
    },
  });
}

export function useDeleteCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => comprasClient.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: HIST });
    },
  });
}

export function usePagarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => comprasClient.pagar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: HIST });
    },
  });
}
