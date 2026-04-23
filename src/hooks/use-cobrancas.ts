"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cobrancasClient } from "@/services/cobrancas-client";
import type { Cobranca, CobrancaInput } from "@/types/cobranca";

const KEY = ["cobrancas"] as const;
const HIST = ["historico"] as const;

export function useCobrancas() {
  return useQuery<Cobranca[]>({ queryKey: KEY, queryFn: cobrancasClient.list });
}

export function useCreateCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CobrancaInput) => cobrancasClient.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: HIST });
    },
  });
}

export function useUpdateCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CobrancaInput }) =>
      cobrancasClient.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: HIST });
    },
  });
}

export function useDeleteCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cobrancasClient.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: HIST });
    },
  });
}
