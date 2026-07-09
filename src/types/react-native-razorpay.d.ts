declare module "react-native-razorpay" {
  export type RazorpayOptions = {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount: number; // paise
    name: string;
    order_id: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: { color?: string };
  };

  export type RazorpaySuccessResponse = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  export type RazorpayErrorResponse = {
    code?: number;
    description?: string;
    // Cancellation ke case mein bhi isi shape se reject hota hai
  };

  const RazorpayCheckout: {
    open: (options: RazorpayOptions) => Promise<RazorpaySuccessResponse>;
  };

  export default RazorpayCheckout;
}
