import { useState } from "react";
import { astrologersService } from "../services";
import type { AstrologerProfile } from "../types";

export type AstrologerListItem = AstrologerProfile & {
  basicPrice: string | null;
  basicServiceId: string | null;
};

export function useAstrologersList() {
  const [astrologers, setAstrologers] = useState<AstrologerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAstrologers = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await astrologersService.getAll();
      // Har astrologer ki Basic consultancy price nikaalne ke liye parallel
      // fetch — list card pe "Book Now ₹X" real price ke saath dikhane ke liye
      const withPrices = await Promise.all(
        list.map(async (a) => {
          try {
            const services = await astrologersService.getServices(a.id);
            const basic = services.find((s) => s.isBasic) ?? null;
            return {
              ...a,
              basicPrice: basic?.price ?? null,
              basicServiceId: basic?.id ?? null,
            };
          } catch {
            return { ...a, basicPrice: null, basicServiceId: null };
          }
        }),
      );
      setAstrologers(withPrices);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Astrologers load nahi hue");
    } finally {
      setLoading(false);
    }
  };

  return { astrologers, loading, error, fetchAstrologers };
}
