import AstroGradient from "@/assets/images/astro-gradient.svg";
import { useOtpLogin } from "@/features/auth/hooks/useAuth";
import { YoutubeCarousel } from "@/features/youtube/components/YoutubeCarousel";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const links = [
  { label: "About Us", url: "https://astrobook-vert.vercel.app/about" },
  { label: "Contact Us", url: "https://astrobook-vert.vercel.app/contact" },
  { label: "Policy", url: "https://astrobook-vert.vercel.app/policy" },
  { label: "Blog", url: "https://astrobook-vert.vercel.app/blog" },
  { label: "Help", url: "https://astrobook-vert.vercel.app/help" },
];

// WhatsApp delivery mein 10-15s lagte hain (aur kabhi thoda zyada bhi) —
// 30s bahut tight tha, user ke paas message padhne/type karne ke liye
// mushkil se 10-15s bachte the. 2 min se aaram se time milta hai.
const RESEND_TIMEOUT = 120;
const OTP_LENGTH = 4;

export default function OtpScreen() {
  const router = useRouter();
  const { contact, debugOtp: debugOtpParam } = useLocalSearchParams<{
    contact: string;
    debugOtp?: string;
  }>();

  const [otp, setOtp] = useState("");
  const { verifyOtp, resendOtp, verifying, debugOtp: debugOtpFromResend } =
    useOtpLogin();
  // Test/staging servers pe (jahan SMS actually deliver nahi ho raha)
  // server SHOW_OTP_IN_RESPONSE=true karne par OTP wapas bhejta hai — yahan
  // dikha dete hain taaki manually enter kiya ja sake. Resend hone par naya
  // value hook se update ho jaata hai, warna login screen se aaya hua
  // starting value use hota hai. Production mein dono hamesha undefined
  // rahenge, isliye yeh block kabhi render hi nahi hoga.
  const debugOtp = debugOtpFromResend ?? debugOtpParam;
  const [timer, setTimer] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);

  // ─── Clipboard OTP suggestion ────────────────────────────────────────────
  // WhatsApp pe aaye OTP ko user copy karke wapas app mein aata hai — jab
  // bhi clipboard change hota hai (app foreground mein), check karte hain
  // ki kya usme ek 4-digit number hai. Agar hai AUR field abhi khaali hai,
  // seedha auto-fill kar dete hain — user ka manually typed input kabhi
  // overwrite nahi hota (functional setOtp se check karte hain, taaki
  // stale closure ka masla na ho, kyunki listener sirf mount pe register
  // hota hai).
  const checkClipboardForOtp = async () => {
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) return;
      const content = await Clipboard.getStringAsync();
      const match = content?.trim().match(/\b(\d{4})\b/);
      if (!match) return;
      setOtp((prev) => (prev.length === 0 ? match[1] : prev));
    } catch {
      // Clipboard read fail ho sakta hai (permission/platform quirks) —
      // silently ignore, yeh sirf ek convenience feature hai
    }
  };

  useEffect(() => {
    checkClipboardForOtp();
    const subscription = Clipboard.addClipboardListener(() => {
      checkClipboardForOtp();
    });
    return () => subscription.remove();
  }, []);

  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    startTimer();
    return () => clearTimer();
  }, []);

  const startTimer = () => {
    setTimer(RESEND_TIMEOUT);
    setCanResend(false);
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || verifying) return;
    try {
      await verifyOtp(contact, otp);
    } catch {
      setOtp("");
      inputRef.current?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    await resendOtp(contact);
    setOtp("");
    inputRef.current?.focus();
    startTimer();
  };

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  return (
    <View style={styles.root}>
      <AstroGradient
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Card */}
          <View style={styles.card}>
            <Image
              source={require("@/assets/images/astro-icon.png")}
              style={{ width: 260, height: 100 }}
              resizeMode="contain"
            />
            {/* Contact info */}
            {/* <Text style={styles.subtitle}>OTP bheja gaya</Text> */}
            {/* <Text style={styles.contact}>{contact}</Text> */}
            {/* Hidden input */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(text) => {
                if (/^\d*$/.test(text) && text.length <= OTP_LENGTH) setOtp(text);
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={{ position: "absolute", opacity: 0, height: 0 }}
            />
            {/* OTP Boxes */}
            <TouchableOpacity
              style={styles.otpContainer}
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
            >
              {[...Array(OTP_LENGTH)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    otp[i] ? styles.otpBoxFilled : null,
                    otp.length === i ? styles.otpBoxActive : null,
                  ]}
                >
                  <Text style={styles.otpText}>{otp[i] || ""}</Text>
                </View>
              ))}
            </TouchableOpacity>
            {/* Dev/test helper — jab SMS delivery band ho, server-generated
                OTP yahan dikh jaata hai. Tap karne se input mein bhar bhi
                jaata hai. Production mein debugOtp hamesha undefined hoga,
                isliye yeh block kabhi render nahi hoga. */}
            {debugOtp ? (
              <TouchableOpacity
                style={styles.debugOtpBox}
                onPress={() => setOtp(debugOtp)}
              >
                <Text style={styles.debugOtpText}>
                  🔐 Test OTP: {debugOtp} (tap to fill)
                </Text>
              </TouchableOpacity>
            ) : null}
            {/* Resend */}
            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendActive}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimer}>
                  Resend in <Text style={styles.resendTimerBold}>{timer}s</Text>
                </Text>
              )}
            </View>
            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (otp.length !== OTP_LENGTH || verifying) && styles.submitBtnDisabled,
              ]}
              disabled={otp.length !== OTP_LENGTH || verifying}
              onPress={handleVerify}
            >
              <Text style={styles.submitText}>
                {verifying ? "Verifying..." : "Verify OTP"}
              </Text>
            </TouchableOpacity>
            {/* Back */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>← Change number</Text>
            </TouchableOpacity>
          </View>

          {/* Video Slider */}
          <YoutubeCarousel />

          {/* Footer */}
          <View style={styles.footerLinks}>
            {links.map((item, i) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity onPress={() => openLink(item.url)}>
                  <Text style={styles.footerLink}>{item.label}</Text>
                </TouchableOpacity>
                {i < links.length - 1 && (
                  <Text style={styles.footerSep}> | </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#121943" },
  safeArea: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: "space-evenly",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    width: "96%",
    marginHorizontal: "auto",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#9d0399",
    paddingVertical: 30,
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: "center",
    elevation: 8,
    marginTop: 30,
    gap: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B6485",
    marginTop: 8,
  },
  contact: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 16,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  otpBox: {
    width: 52,
    height: 52,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  otpBoxActive: {
    borderColor: "#9d0399",
    backgroundColor: "#FAF0FF",
  },
  debugOtpBox: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFF4CC",
    borderWidth: 1,
    borderColor: "#E0B400",
    alignSelf: "center",
  },
  debugOtpText: {
    color: "#7A5B00",
    fontSize: 13,
    fontWeight: "600",
  },
  otpBoxFilled: {
    borderColor: "#9d0399",
    backgroundColor: "#fff",
  },
  otpText: { fontSize: 22, fontWeight: "700", color: "#1A1A2E" },
  resendRow: {
    marginTop: 4,
    marginBottom: 8,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  resendTimer: { fontSize: 13, color: "#9CA3AF" },
  resendTimerBold: { fontWeight: "700", color: "#6B6485" },
  resendActive: {
    fontSize: 13,
    color: "#9d0399",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  submitBtn: {
    width: "100%",
    backgroundColor: "#9d0399",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  backBtn: { marginTop: 12 },
  backText: { fontSize: 13, color: "#9d0399" },
  footerLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
    marginTop: "auto",
  },
  footerLink: { color: "#E9D5FF", fontSize: 16 },
  footerSep: { color: "#C4B5FD", fontSize: 16 },
});