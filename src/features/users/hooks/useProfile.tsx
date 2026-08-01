import { queryKeys } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import type { UpdateProfilePayload, UserProfile } from "../services";
import { usersService } from "../services";

// ─── useMyProfile ────────────────────────────────────────────────────────────
// React Query se — yeh cache poore app mein SHARED hai. Jahan bhi
// useMyProfile() call hoga (Edit Profile, Profile tab, kahin bhi), sabko
// wahi ek cached value milegi, aur jab bhi mutation (updateProfile) succeed
// hoti hai, cache update hote hi yeh SAB jagah automatically re-render ho
// jaate hain — koi manual "yahan bhi update karo" wiring nahi chahiye.

export function useMyProfile() {
  const query = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => usersService.getMe(),
  });

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    // Purane call-sites `fetchProfile()` explicitly call karte the — ab
    // sirf ek manual refetch trigger karta hai (auto-fetch already hota
    // hai mount pe), backward-compatible rakha hai.
    fetchProfile: () => query.refetch(),
  };
}

// ─── useUpdateProfile ────────────────────────────────────────────────────────

export function useUpdateProfile(onSuccess?: (user: UserProfile) => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (dto: UpdateProfilePayload) => usersService.updateProfile(dto),
    onSuccess: (user) => {
      // Cache mein turant naya data daal do — profile.tsx, edit-profile.tsx,
      // header, jahan bhi useMyProfile() use ho raha hai sab turant refresh.
      queryClient.setQueryData(queryKeys.profile.me, user);
      onSuccess?.(user);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.[0]?.message ||
        "Profile update nahi hui";
      Alert.alert("Error", msg);
    },
  });

  return {
    updateProfile: (dto: UpdateProfilePayload) => mutation.mutateAsync(dto).catch(() => undefined),
    loading: mutation.isPending,
  };
}