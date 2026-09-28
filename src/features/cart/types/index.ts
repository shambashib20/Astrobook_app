import type {
  ConsultationService,
  ConsultationServiceVariant,
} from "@/features/consultation/types";

export type CartItem = {
  id: string;
  userId: string;
  astrologerId: string;
  serviceId: string;
  variantId: string | null;
  scheduledAt: string | null; // ISO — null jab tak slot pick na ho
  createdAt: string;
  updatedAt: string;
  // `service` ke durationMinutes/price yahan variant ke hisaab se override
  // hote hain (backend cart.service.ts getMyCart enrichment) — jo variant
  // select kiya wahi cart card pe dikhta/charge hota hai
  service: ConsultationService | null;
  variant: ConsultationServiceVariant | null;
  // Client-side enriched (astrologer.tsx pattern jaisa Feed mein hai)
  astrologerName?: string;
  astrologerAvatar?: string;
  // addItem() response mein hi aata hai — batata hai ki yeh naya row bana ya
  // pehle se cart mein maujood usi service ka item update hua (same user
  // same consultancy dobara add nahi hoti, existing hi update hoti hai)
  wasAlreadyInCart?: boolean;
};

export type AddCartItemPayload = {
  astrologerId: string;
  serviceId: string;
  // Konsa duration/price variant — na diya ho toh service ka default
  // (30-min) variant use ho jaata hai
  variantId?: string;
};

export type CartCheckoutOrderResponse = {
  orderId: string;
  amount: number; // rupees
  currency: string;
  appointmentIds: string[];
};

// Razorpay's checkout hands back a signed payment id client-side —
// backend verifies the HMAC signature itself, no webhook needed.
export type CartCheckoutVerifyPayload = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type CartCheckoutVerifyResponse = {
  message: string;
  appointments: { id: string; status: string }[];
};