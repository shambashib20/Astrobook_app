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
  // Cashfree's checkout launches off this, not a raw amount+key like
  // Razorpay did — see CFSession usage in cart.tsx.
  paymentSessionId: string;
  amount: number; // rupees
  currency: string;
  appointmentIds: string[];
};

// Cashfree's hosted checkout doesn't hand the client a signed payment id
// the way Razorpay did (razorpayOrderId/PaymentId/Signature — commented
// out) — confirmation is webhook-driven server-side, so this just tells
// the backend which order to re-check the status of.
export type CartCheckoutVerifyPayload = {
  orderId: string;
};

export type CartCheckoutVerifyResponse = {
  message: string;
  appointments: { id: string; status: string }[];
};
