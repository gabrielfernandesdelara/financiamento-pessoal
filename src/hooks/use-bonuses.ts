"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bonusesClient } from "@/services/bonuses-client";
import type { BonusInput } from "@/types/bonus";

const KEY = ["bonuses"] as const;

export function useBonuses() {
  return useQuery({ queryKey: KEY, queryFn: bonusesClient.list });
}

export function useCreateBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BonusInput) => bonusesClient.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bonusesClient.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
