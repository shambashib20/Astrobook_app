import { useQuery } from "@tanstack/react-query";
import { paymentService } from "../service";

export const transactionsKey = ["payments", "transactions"] as const;

// Astrologer ke received payments — dashboard (recent 5) aur Transactions
// screen dono isi ek cache se padhte hain.
export function useMyTransactions() {
  const q = useQuery({
    queryKey: transactionsKey,
    queryFn: () => paymentService.getMyTransactions(),
  });
  return {
    transactions: q.data ?? [],
    loading: q.isLoading,
    refreshing: q.isRefetching,
    error: q.isError
      ? ((q.error as any)?.response?.data?.message ?? "Failed to load transactions")
      : null,
    refetch: q.refetch,
  };
}
