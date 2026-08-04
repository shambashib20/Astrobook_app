import type { ConsultationService } from "@/features/consultation/types";
import { queryKeys } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { astrologersService } from "../services";
import type { AstrologerProfile } from "../types";

// ─── useAstrologerProfile ──────────────────────────────────────────────────
// React Query se — cache astrologerId ke hisaab se SHARED hai poore booking
// flow mein (Astrologer detail -> Service detail -> Book Slot -> Checkout,
// sab same astroId use karte hain). Pehle yeh plain useState tha, isliye har
// screen pe navigate karte hi dobara se poora fetch (astrologer + services)
// hota tha — chahe pichli screen ne abhi-abhi wahi data load kiya ho. Ab
// pehli screen (jo bhi ho) fetch karti hai, baaki sab isi cache se turant
// data paate hain (staleTime ke andar), koi loading spinner nahi dikhta.
export function useAstrologerProfile(id: string | undefined) {
  const astrologerQuery = useQuery({
    queryKey: queryKeys.astrologer.detail(id ?? "none"),
    queryFn: () => astrologersService.getById(id!),
    enabled: !!id,
  });

  const servicesQuery = useQuery<ConsultationService[]>({
    queryKey: queryKeys.astrologer.services(id ?? "none"),
    queryFn: () => astrologersService.getServices(id!),
    enabled: !!id,
  });

  const astrologer: AstrologerProfile | null = astrologerQuery.data ?? null;
  const services = servicesQuery.data ?? [];

  // Basic Consultation — "Book Now" button isi ke price/id se driven hai
  const basicService = services.find((s) => s.isBasic) ?? null;
  // Baaki "normal" services — Consultations carousel ke liye
  const normalServices = services.filter((s) => !s.isBasic);

  // Purane call-sites `fetchProfile()` explicitly call karte the (mount pe
  // useEffect se) — ab woh sirf manual refetch trigger karta hai, auto-fetch
  // already hota hai (query `enabled: !!id` hote hi khud fire ho jaati hai).
  // Backward-compatible rakha hai taaki 4 existing screens (astrologer-
  // profile, service/[id], book-slot, checkout) mein kuch badalna na pade.
  const fetchProfile = () => {
    astrologerQuery.refetch();
    servicesQuery.refetch();
  };

  return {
    astrologer,
    services,
    basicService,
    normalServices,
    // Sirf tab tak loading dikhao jab tak cache mein bilkul kuch na ho —
    // background refetch (stale cache revalidate) ke liye spinner nahi
    loading: astrologerQuery.isLoading || servicesQuery.isLoading,
    error:
      astrologerQuery.isError || servicesQuery.isError
        ? "Astrologer profile load nahi hui"
        : null,
    fetchProfile,
  };
}
