import { useState } from "react";
import { cartService } from "../service";

// ─── useCartCount ───────────────────────────────────────────────────────────
// Header ke cart badge ke liye — lightweight, sirf count (useUnreadCount
// notifications wale hi pattern se). Full cart list (astrologer-enriched)
// wala useCart() cart.tsx screen ke liye hai — yahan sirf number chahiye.

export function useCartCount() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const items = await cartService.getMyCart();
      setCount(items.length);
    } catch {
      // silent — badge sirf cosmetic hai, fail hone pe bas 0 dikhega
    }
  };

  return { count, fetchCount };
}