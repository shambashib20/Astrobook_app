import AstroGradient from "@/assets/images/astro-gradient.svg";
import AstroLogo from "@/assets/images/astro-icon.svg";
import { useOtpLogin } from "@/features/auth/hooks/useAuth";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const VIDEOS = [
  {
    id: "1",
    title: "রাশি অনুযায়ী\nধনতেরাস টিপস!",
    color: "#4C1D95",
    emoji: "🎬",
  },
  { id: "2", title: "Mercury\nRetrograde Tips", color: "#1E3A5F", emoji: "🪐" },
  { id: "3", title: "Daily\nHoroscope", color: "#1A3320", emoji: "⭐" },
];

const links = [
  { label: "About Us", url: "https://astrobook-vert.vercel.app/about" },
  { label: "Contact Us", url: "https://astrobook-vert.vercel.app/contact" },
  { label: "Policy", url: "https://astrobook-vert.vercel.app/policy" },
  { label: "Blog", url: "https://astrobook-vert.vercel.app/blog" },
  { label: "Help", url: "https://astrobook-vert.vercel.app/help" },
];

const RESEND_TIMEOUT = 30;

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
  const [activeSlide, setActiveSlide] = useState(0);
  const [timer, setTimer] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
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
    if (otp.length !== 6 || verifying) return;
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

  const onSlideChange = (e: any) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / (SCREEN_WIDTH * 0.85),
    );
    setActiveSlide(index);
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
            <AstroLogo width={260} height={100} />
            {/* Contact info */}
            {/* <Text style={styles.subtitle}>OTP bheja gaya</Text> */}
            {/* <Text style={styles.contact}>{contact}</Text> */}
            {/* Hidden input */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(text) => {
                if (/^\d*$/.test(text) && text.length <= 6) setOtp(text);
              }}
              keyboardType="number-pad"
              maxLength={6}
              style={{ position: "absolute", opacity: 0, height: 0 }}
            />
            {/* OTP Boxes */}
            <TouchableOpacity
              style={styles.otpContainer}
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
            >
              {[...Array(6)].map((_, i) => (
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
                (otp.length !== 6 || verifying) && styles.submitBtnDisabled,
              ]}
              disabled={otp.length !== 6 || verifying}
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
          <View style={styles.sliderSection}>
            <FlatList
              ref={flatListRef}
              data={VIDEOS}
              horizontal
              pagingEnabled={false}
              snapToInterval={SCREEN_WIDTH * 0.62}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sliderContent}
              onMomentumScrollEnd={onSlideChange}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.videoCard,
                    index === activeSlide && styles.videoCardActive,
                    { backgroundColor: item.color },
                  ]}
                  activeOpacity={0.9}
                >
                  <Text style={styles.videoEmoji}>{item.emoji}</Text>
                  <Text style={styles.videoTitle}>{item.title}</Text>
                  <View style={styles.playBtn}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <View style={styles.dotsRow}>
              {VIDEOS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeSlide && styles.dotActive]}
                />
              ))}
            </View>
          </View>

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
    justifyContent: "space-between",
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
  sliderSection: { width: "100%", marginBottom: 12 },
  sliderContent: { paddingHorizontal: 12, gap: 10 },
  videoCard: {
    width: SCREEN_WIDTH * 0.7,
    height: 200,
    borderRadius: 12,
    padding: 12,
    justifyContent: "space-between",
    opacity: 0.75,
  },
  videoCardActive: { opacity: 1, transform: [{ scale: 1.03 }] },
  videoEmoji: { fontSize: 22 },
  videoTitle: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  playBtn: {
    alignSelf: "flex-end",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF30",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: "#FFF", fontSize: 10 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 30,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF40" },
  dotActive: { backgroundColor: "#FFF", width: 20 },
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