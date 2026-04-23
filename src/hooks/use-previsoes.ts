"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { previsoesClient } from "@/services/previsoes-client";
import type { Previsao, PrevisaoInput } from "@/types/previsao";

const KEY = ["previsoes"] as const;

export function usePrevisoes() {
  return useQuery<Previsao[]>({ queryKey: KEY, queryFn: previsoesClient.list });
}

export function useCreatePrevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PrevisaoInput) => previsoesClient.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePrevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PrevisaoInput }) =>
      previsoesClient.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePrevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => previsoesClient.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
