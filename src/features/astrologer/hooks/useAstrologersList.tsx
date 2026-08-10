import { queryKeys } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { astrologersService } from "../services";
import type { AstrologerProfile } from "../types";

export type AstrologerListItem = AstrologerProfile;

// React Query cache (30s staleTime) se — pehle plain useState+useEffect tha,
// har naye mount pe (screen remount ho ya pehli baar visit ho) poori list
// dobara fetch hoti thi. Ab component lifecycle se independent cache hai,
// isliye tab revisit hamesha turant aata hai chahe screen kabhi unmount hua
// ho ya nahi — sirf pehli baar hi real network+DB round trip lagta hai.
export function useAstrologersList() {
  const query = useQuery({
    queryKey: queryKeys.astrologers.list,
    queryFn: () => astrologersService.getAll(),
  });

  // Feed screen jaisa hi pattern — mount pe explicit fetchAstrologers() call
  // hota hai, initial load useQuery khud handle karta hai, yahan sirf
  // manual refresh ke liye forward karna hai.
  const fetchAstrologers = () => {
    query.refetch();
  };

  return {
    astrologers: query.data ?? [],
    loading: query.isPending,
    error: query.isError
      ? ((query.error as any)?.response?.data?.message ?? "Astrologers load nahi hue")
      : null,
    fetchAstrologers,
  };
}
