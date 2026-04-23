"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { transactionsClient } from "@/services/transactions-client";
import type {
  Transaction,
  TransactionInput,
} from "@/types/transaction";

const KEY = ["transactions"] as const;

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: KEY,
    queryFn: transactionsClient.list,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      transactionsClient.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      transactionsClient.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsClient.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
