import { apiClient } from "@/services/apiClient";

export type CreatePaymentOrderResponse = {
  orderId: string;
  amount: number; // rupees (NOT paise — convert *100 before passing to Razorpay SDK)
  currency: string;
  appointmentId: string;
};

export type VerifyPaymentPayload = {
  appointmentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type VerifyPaymentResponse = {
  message: string;
  appointment: {
    id: string;
    status: string;
    agoraChannel: string | null;
    agoraToken: string | null;
    [key: string]: any;
  };
};

class PaymentServiceApi {
  private readonly base = "/payments";

  // NOTE: /payments/create-order aur /payments/verify dono raw object return
  // karte hain — {success, data} envelope mein NAHI (jaisa /users/me,
  // /astrologers/* karte hain). Isliye yahan `res` ko hi seedha cast kar rahe
  // hain, `res.data.xxx` nahi karna is case mein.

  async createOrder(
    appointmentId: string,
  ): Promise<CreatePaymentOrderResponse> {
    const res = await apiClient.post<CreatePaymentOrderResponse>(
      `${this.base}/create-order`,
      { appointmentId },
    );
    return res as unknown as CreatePaymentOrderResponse;
  }

  async verifyPayment(
    payload: VerifyPaymentPayload,
  ): Promise<VerifyPaymentResponse> {
    const res = await apiClient.post<VerifyPaymentResponse>(
      `${this.base}/verify`,
      payload,
    );
    return res as unknown as VerifyPaymentResponse;
  }
}

export const paymentService = new PaymentServiceApi();
