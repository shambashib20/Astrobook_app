import { queryKeys } from "@/lib/queryClient";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { astrologersService } from "../services";
import type { AstrologerListParams, AstrologerProfile } from "../types";

export type AstrologerListItem = AstrologerProfile;

// Sort / online-offline / search server pe hote hain (GET /astrologers
// query params), isliye har filter combination ka apna cache entry hai.
//
// keepPreviousData: chip ya toggle badalne par list ek pal ke liye khaali
// hokar spinner nahi dikhati — purani list dikhti rehti hai (thodi dim) jab
// tak naya result nahi aa jaata. `isSwitching` isi ke liye hai.
export function useAstrologersList(
  params: AstrologerListParams = {},
  options: { enabled?: boolean } = {},
) {
  const query = useQuery({
    queryKey: queryKeys.astrologers.list(params),
    queryFn: () => astrologersService.getAll(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });

  return {
    astrologers: query.data ?? [],
    // Sirf pehli baar (koi purana data nahi) — skeleton ke liye
    loading: query.isPending && options.enabled !== false,
    // Filter badla, purani list dikh rahi hai, naya aa raha hai
    isSwitching: query.isPlaceholderData && query.isFetching,
    refreshing: query.isRefetching && !query.isPlaceholderData,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message ?? "Failed to load astrologers")
      : null,
    refetch: query.refetch,
  };
}
