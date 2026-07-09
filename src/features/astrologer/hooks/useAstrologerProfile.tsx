import type { ConsultationService } from "@/features/consultation/types";
import { useState } from "react";
import { astrologersService } from "../services";
import type { AstrologerProfile } from "../types";

export function useAstrologerProfile(id: string | undefined) {
  const [astrologer, setAstrologer] = useState<AstrologerProfile | null>(null);
  const [services, setServices] = useState<ConsultationService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [astro, svc] = await Promise.all([
        astrologersService.getById(id),
        astrologersService.getServices(id),
      ]);
      setAstrologer(astro);
      setServices(svc);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Astrologer profile load nahi hui",
      );
    } finally {
      setLoading(false);
    }
  };

  // Basic Consultation — "Book Now" button isi ke price/id se driven hai
  const basicService = services.find((s) => s.isBasic) ?? null;
  // Baaki "normal" services — Consultations carousel ke liye
  const normalServices = services.filter((s) => !s.isBasic);

  return {
    astrologer,
    services,
    basicService,
    normalServices,
    loading,
    error,
    fetchProfile,
  };
}
