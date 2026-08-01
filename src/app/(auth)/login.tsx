import AstroGradient from "@/assets/images/astro-gradient.svg";
import AstroLogo from "@/assets/images/astro-icon.svg";
import GoogleLogo from "@/assets/images/google-icon.svg";
import { useGoogleLogin, useOtpLogin } from "@/features/auth/hooks/useAuth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import Checkbox from "expo-checkbox";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "+88", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
];

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
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [remember, setRemember] = useState(false);
  const [selectedCode, setSelectedCode] = useState(COUNTRY_CODES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const { sendOtp, sending: otpSending } = useOtpLogin();
  const { googleLogin, loading: googleLoading } = useGoogleLogin();

  const handleSendOTP = async () => {
    const fullPhone = `${selectedCode.code}${phone.trim()}`;
    const { success, debugOtp } = await sendOtp(fullPhone);
    if (success) {
      router.push({
        pathname: "/(auth)/otp",
        params: { contact: fullPhone, ...(debugOtp ? { debugOtp } : {}) },
      });
    }
  };

  const handleGoogleLogin = async () => {
    await googleLogin();
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
          {/* White Card */}
          <View style={styles.card}>
            <AstroLogo width={260} height={120} />

            {/* Phone Input */}
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.codeBtn}
                onPress={() => setShowDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.codeBtnText}>
                  {selectedCode.flag} {selectedCode.code}
                </Text>
                <Text style={styles.codeArrow}>▾</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.codeDivider} />

              <TextInput
                placeholder="Phone number"
                style={styles.phoneInput}
                keyboardType="phone-pad"
                placeholderTextColor="#919191"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            </View>
            {/* Send OTP Button */}
            <TouchableOpacity
              style={[styles.otpBtn, otpSending && { opacity: 0.7 }]}
              onPress={handleSendOTP}
              disabled={otpSending}
              activeOpacity={0.85}
            >
              <Text style={styles.otpBtnText}>
                {otpSending ? "Sending..." : "Send OTP"}
              </Text>
            </TouchableOpacity>

            {/* Remember Me */}
            <View style={styles.rememberRow}>
              <Checkbox
                value={remember}
                onValueChange={setRemember}
                color={remember ? "#9d0399" : undefined}
                style={styles.checkbox}
              />
              <Text style={styles.rememberText}>Remember Me</Text>
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={styles.googleBtn}
              activeOpacity={0.8}
              onPress={handleGoogleLogin}
            >
              <View style={styles.googleInner}>
                <GoogleLogo width={16} height={16} />
                <Text style={styles.googleText}>Sign in with Google</Text>
              </View>
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

      {/* Country Code Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Select Country Code</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRY_CODES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.dropdownItem,
                    selectedCode.code === item.code &&
                      styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCode(item);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownFlag}>{item.flag}</Text>
                  <Text style={styles.dropdownName}>{item.name}</Text>
                  <Text style={styles.dropdownCode}>{item.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: "center",
    marginBottom: 16,
    elevation: 8,
    marginTop: 30,
  },
  phoneRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#9d0399",
    borderRadius: 8,
    overflow: "hidden",
  },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  codeBtnText: { fontSize: 14, color: "#1A1A2E", fontWeight: "600" },
  codeArrow: { fontSize: 10, color: "#9d0399" },
  codeDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#D8B4FE",
    marginRight: 8,
  },
  phoneInput: {
    paddingVertical: 16,
    fontSize: 16,
    flex: 1,
    color: "#1A1A2E",
    backgroundColor: "#ffffff",
  },
  otpBtn: {
    width: "100%",
    backgroundColor: "#9d0399",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 30,
  },
  otpBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  rememberRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 16,
  },
  checkbox: { width: 14, height: 14 },
  rememberText: { fontSize: 14, color: "#0b1d5b" },
  googleBtn: {
    borderWidth: 1,
    borderColor: "#008cff",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
    width: 220,
  },
  googleInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
  },
  googleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    paddingStart: 10,
    backgroundColor: "#008cff",
    paddingVertical: 8,
    paddingRight: 16,
    width: "100%",
    marginLeft: 10,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdownCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxHeight: 400,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 12,
    textAlign: "center",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dropdownItemActive: { backgroundColor: "#FAF0FF" },
  dropdownFlag: { fontSize: 22 },
  dropdownName: { flex: 1, fontSize: 15, color: "#1A1A2E" },
  dropdownCode: { fontSize: 15, color: "#9d0399", fontWeight: "600" },
});