import type { ConsultationService } from "@/features/consultation/types";

export type CartItem = {
  id: string;
  userId: string;
  astrologerId: string;
  serviceId: string;
  scheduledAt: string | null; // ISO — null jab tak slot pick na ho
  createdAt: string;
  updatedAt: string;
  service: ConsultationService | null;
  // Client-side enriched (astrologer.tsx pattern jaisa Feed mein hai)
  astrologerName?: string;
  astrologerAvatar?: string;
};

export type AddCartItemPayload = {
  astrologerId: string;
  serviceId: string;
};

export type CartCheckoutOrderResponse = {
  orderId: string;
  amount: number; // rupees
  currency: string;
  appointmentIds: string[];
};

export type CartCheckoutVerifyPayload = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type CartCheckoutVerifyResponse = {
  message: string;
  appointments: { id: string; status: string }[];
};
