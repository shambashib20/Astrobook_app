// Help & Support content — single source of truth for all FAQ and contact info.

// TODO(before launch): fill in real WhatsApp number and email.
// If left empty, those contact buttons won't appear on the screen.
export const SUPPORT_CONTACT = {
  // Include country code, no + or spaces. Example: "919876543210"
  whatsappNumber: "",
  email: "",
  // Support availability — sets user expectations
  hours: "Every day, 10 AM – 8 PM",
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

// Keep the refund window in sync with the backend rule:
// booking.service.ts → USER_CANCEL_REFUND_WINDOW_MS = 48 hours
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "join",
    question: "How do I join a session?",
    answer:
      "Go to Profile → My Bookings, open your booking, and tap the Join button at the scheduled time. You cannot join before the session starts, so make sure to be on time.",
  },
  {
    id: "cancel-refund",
    question: "Will I get a refund if I cancel my booking?",
    answer:
      "You will receive a full refund if you cancel at least 48 hours before the session. Cancellations within 48 hours, or missed sessions, are not eligible for a refund. If the astrologer cancels, you will always receive a full refund.",
  },
  {
    id: "payment-no-booking",
    question: "Payment went through but booking isn't showing",
    answer:
      "Wait a moment and pull down to refresh My Bookings — confirmation can sometimes take a little time. If the booking still doesn't appear after 10–15 minutes, send us a screenshot of your payment.",
  },
  {
    id: "payment-failed",
    question: "Payment failed but money was deducted",
    answer:
      "Your bank will usually reverse the amount automatically within a few working days. If the money hasn't returned after that, contact us with your transaction ID.",
  },
  {
    id: "call-issue",
    question: "Audio or video isn't working in the session",
    answer:
      "Make sure the app has camera and microphone permissions and that your internet connection is stable. If the issue persists, leave the session and rejoin, or close and reopen the app.",
  },
  {
    id: "become-astrologer",
    question: "How can I become an astrologer on AstroBook?",
    answer:
      "Tap Upgrade to Astrologer on the Profile screen and fill in the form. Our team will review your details and send you a notification once you are approved.",
  },
];
