"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchasesClient } from "@/services/purchases-client";
import type { Purchase, PurchaseInput } from "@/types/purchase";

const KEY = ["purchases"] as const;

export function usePurchases() {
  return useQuery<Purchase[]>({
    queryKey: KEY,
    queryFn: purchasesClient.list,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PurchaseInput) => purchasesClient.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PurchaseInput }) =>
      purchasesClient.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesClient.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
