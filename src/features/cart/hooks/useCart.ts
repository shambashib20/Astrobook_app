import { astrologersService } from "@/features/astrologer/services";
import { useState } from "react";
import { cartService } from "../service";
import type { CartItem } from "../types";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cartService.getMyCart();

      // Astrologer naam/emoji client-side enrich karte hain (feed.tsx wala
      // hi pattern) — cart mein items kam hote hain, isliye module-level
      // cache ki zaroorat nahi, seedha fetch kar lo
      const uniqueAstroIds = Array.from(
        new Set(data.map((i) => i.astrologerId)),
      );
      const astrologers = await Promise.all(
        uniqueAstroIds.map((id) => astrologersService.getById(id).catch(() => null)),
      );
      const astroMap = new Map(
        uniqueAstroIds.map((id, idx) => [id, astrologers[idx]]),
      );

      const enriched = data.map((item) => ({
        ...item,
        astrologerName: astroMap.get(item.astrologerId)?.name ?? "Astrologer",
        astrologerAvatar: astroMap.get(item.astrologerId)?.meta?.emoji,
      }));

      setItems(enriched);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Cart load nahi hua");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id: string) => {
    await cartService.removeItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return { items, loading, error, fetchCart, removeItem, setItems };
}
