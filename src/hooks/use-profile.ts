"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileClient } from "@/services/profile-client";
import type { Profile, ProfileInput } from "@/types/profile";

const KEY = ["profile"] as const;

export function useProfile() {
  return useQuery<Profile | null>({ queryKey: KEY, queryFn: profileClient.get });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) => profileClient.upsert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
