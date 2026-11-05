// ─── Payment failure classification ─────────────────────────────────────────
// Ek hi jagah jahan decide hota hai ki payment kyun fail hua aur user ko kya
// dikhana hai. Checkout (single booking) aur Cart (multi) dono yehi use karte
// hain; payment-failed screen sirf `kind` leke copy dikhati hai.

export type PaymentStage = "booking" | "order" | "gateway" | "verify";

export type PaymentFailureKind =
  | "cancelled" // user ne Razorpay modal band kar diya
  | "declined" // bank/UPI ne authenticate/approve nahi kiya
  | "network" // internet / timeout
  | "slot_taken" // slot kisi aur ne le liya
  | "server" // hamari taraf ki dikkat (backend / gateway keys)
  | "verify" // paisa gateway tak gaya, confirm karna fail hua
  | "unknown";

export type PaymentFailureCopy = {
  kind: PaymentFailureKind;
  icon: "x-circle" | "slash" | "wifi-off" | "clock" | "tool" | "alert-triangle" | "help-circle";
  tone: "neutral" | "danger" | "warning";
  title: string;
  message: string;
  // Chhote "ab kya karun" points
  tips: string[];
  /** Kya is case mein "Dobara try" dikhana theek hai */
  canRetry: boolean;
  /** Retry ki jagah slot badalna hai */
  changeSlot: boolean;
  /** Booking cancel karni hai ya nahi (verify fail mein NAHI — paisa kat chuka ho sakta hai) */
  cancelBooking: boolean;
};

const COPY: Record<PaymentFailureKind, Omit<PaymentFailureCopy, "kind">> = {
  cancelled: {
    icon: "slash",
    tone: "neutral",
    title: "Payment Cancelled",
    message: "You cancelled the payment midway, so no amount was charged.",
    tips: ["The slot may still be available — you can try again."],
    canRetry: true,
    changeSlot: false,
    cancelBooking: true,
  },
  declined: {
    icon: "x-circle",
    tone: "danger",
    title: "Payment Declined by Bank",
    message:
      "The OTP/PIN was incorrect, the request timed out, or your bank blocked the transaction.",
    tips: [
      "Try a different UPI, card, or payment method.",
      "If any amount was deducted, it will be refunded automatically within 5–7 business days.",
    ],
    canRetry: true,
    changeSlot: false,
    cancelBooking: true,
  },
  network: {
    icon: "wifi-off",
    tone: "warning",
    title: "Internet Connection Problem",
    message: "Your payment could not be completed due to a network issue.",
    tips: [
      "Check your Wi-Fi or mobile data and try again.",
      "If any amount was deducted, check the status in My Bookings.",
    ],
    canRetry: true,
    changeSlot: false,
    cancelBooking: true,
  },
  slot_taken: {
    icon: "clock",
    tone: "warning",
    title: "This Slot is No Longer Available",
    message: "Someone else just booked this time. You have not been charged.",
    tips: ["Pick a different time slot — the whole process takes about a minute."],
    canRetry: false,
    changeSlot: true,
    cancelBooking: true,
  },
  server: {
    icon: "tool",
    tone: "warning",
    title: "Something Went Wrong on Our End",
    message:
      "This is not your fault — our payment system is not working correctly right now. You have not been charged.",
    tips: ["Please try again in a little while.", "If this keeps happening, contact Support."],
    canRetry: true,
    changeSlot: false,
    cancelBooking: true,
  },
  verify: {
    icon: "alert-triangle",
    tone: "warning",
    title: "Confirming Your Payment",
    message:
      "Your payment reached the gateway, but we were unable to confirm it right now.",
    tips: [
      "Do not pay again — you may be charged twice.",
      "Check the status in My Bookings in a few minutes.",
      "If the booking is not confirmed and you were charged, contact Support — we will check and help you immediately.",
    ],
    canRetry: false,
    changeSlot: false,
    cancelBooking: false,
  },
  unknown: {
    icon: "help-circle",
    tone: "danger",
    title: "Payment Could Not Be Completed",
    message: "Something went wrong. You have likely not been charged.",
    tips: ["Try again.", "If the issue persists, contact Support."],
    canRetry: true,
    changeSlot: false,
    cancelBooking: true,
  },
};

export function copyForKind(kind: PaymentFailureKind): PaymentFailureCopy {
  return { kind, ...COPY[kind] };
}

export function isPaymentFailureKind(v: unknown): v is PaymentFailureKind {
  return typeof v === "string" && v in COPY;
}

// Razorpay RN SDK errors alag-alag shape mein aate hain:
//   { code: 2, description: "Payment Cancelled" }                     (Android/iOS)
//   { error: { code, description, reason, step, source } }           (nested)
// Isliye dono shapes padhte hain.
function razorpayParts(err: any) {
  const inner = err?.error && typeof err.error === "object" ? err.error : err;
  return {
    code: inner?.code ?? err?.code,
    description: String(inner?.description ?? err?.description ?? ""),
    reason: String(inner?.reason ?? ""),
    step: String(inner?.step ?? ""),
    source: String(inner?.source ?? ""),
  };
}

export function classifyPaymentFailure(
  err: any,
  stage: PaymentStage,
): PaymentFailureKind {
  const status: number | undefined = err?.response?.status;
  const apiMsg = String(err?.response?.data?.message ?? "").toLowerCase();

  // 1. Payment gateway ke baad confirm karte waqt dikkat
  if (stage === "verify") return "verify";

  // 2. Razorpay modal se aaye errors
  if (stage === "gateway") {
    const r = razorpayParts(err);
    const text = `${r.description} ${r.reason}`.toLowerCase();
    if (
      r.code === 2 ||
      text.includes("cancel") ||
      r.reason === "payment_cancelled" ||
      r.step === "payment_cancelled"
    ) {
      return "cancelled";
    }
    if (r.code === 0 || text.includes("network") || text.includes("internet")) {
      return "network";
    }
    if (
      r.code === 1 ||
      r.code === 3 ||
      r.code === 4 ||
      r.code === "SERVER_ERROR" ||
      r.code === "GATEWAY_ERROR"
    ) {
      return "server";
    }
    // "Error in opening checkout" — checkout modal khula hi nahi, ye bank side
    // nahi hai. Ye tab hota hai jab order test key se bana ho par app live key
    // use kar raha ho (ya vice versa). Humari taraf ki dikkat hai.
    if (
      r.code === "BAD_REQUEST_ERROR" &&
      (text.includes("opening checkout") || text.includes("open checkout"))
    ) {
      return "server";
    }
    // BAD_REQUEST_ERROR / payment_failed / authentication step = bank side
    return "declined";
  }

  // 3. Hamari API calls (booking / order)
  if (!err?.response && (err?.request || err?.code === "ERR_NETWORK" || err?.code === "ECONNABORTED")) {
    return "network";
  }
  if (
    status === 409 ||
    apiMsg.includes("already booked") ||
    apiMsg.includes("slot") ||
    apiMsg.includes("not available")
  ) {
    return "slot_taken";
  }
  if (status && status >= 500) return "server";
  return "unknown";
}