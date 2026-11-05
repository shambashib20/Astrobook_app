import ScreenHeader from "@/components/ScreenHeader";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FAQ_ITEMS, SUPPORT_CONTACT } from "../constants";

async function openLink(url: string, failMessage: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Nahi khul paya", failMessage);
  }
}

export default function HelpSupportScreen() {
  // Ek time pe ek hi sawaal khula rahe — screen chhoti aur saaf rehti hai
  const [openId, setOpenId] = useState<string | null>(null);

  const { whatsappNumber, email, hours } = SUPPORT_CONTACT;
  const hasContact = Boolean(whatsappNumber || email);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="Help & Support"
        subtitle="We're here to help"
        fallbackHref="/(user)/(tabs)/profile"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro — screen khaali/rookhi na lage, aur user ko turant direction mile */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="headphones" size={22} color="#9d0399" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Having trouble?</Text>
            <Text style={styles.heroSub}>
              {hasContact
                ? "Browse the questions below first. If you can't find an answer, reach out to us directly."
                : "Browse the questions below — most issues can be resolved here."}
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
          <View style={styles.card}>
            {FAQ_ITEMS.map((item, index) => {
              const open = openId === item.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.faqItem,
                    index < FAQ_ITEMS.length - 1 && styles.faqBorder,
                    open && styles.faqItemOpen,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.faqHeader}
                    activeOpacity={0.7}
                    onPress={() => toggle(item.id)}
                  >
                    <Text
                      style={[styles.faqQuestion, open && styles.faqQuestionOpen]}
                    >
                      {item.question}
                    </Text>
                    <Feather
                      name={open ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#9d0399"
                    />
                  </TouchableOpacity>
                  {open && <Text style={styles.faqAnswer}>{item.answer}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {hasContact && (
          <View>
            <Text style={styles.sectionLabel}>Didn't find an answer?</Text>
            <View style={styles.card}>
              <Text style={styles.hours}>{hours}</Text>

              {whatsappNumber ? (
                <TouchableOpacity
                  style={[styles.contactRow, !!email && styles.contactRowBorder]}
                  activeOpacity={0.7}
                  onPress={() =>
                    openLink(
                      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                        "Hi Astrobook, I need some help.",
                      )}`,
                      "Make sure WhatsApp is installed on your device.",
                    )
                  }
                >
                  <View style={styles.iconWrap}>
                    <Feather name="message-circle" size={18} color="#9d0399" />
                  </View>
                  <Text style={styles.contactLabel}>WhatsApp pe message karo</Text>
                  <Feather name="chevron-right" size={20} color="#B8B0D0" />
                </TouchableOpacity>
              ) : null}

              {email ? (
                <TouchableOpacity
                  style={styles.contactRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    openLink(
                      `mailto:${email}?subject=${encodeURIComponent(
                        "Astrobook Support",
                      )}`,
                      `Humein seedha ${email} pe mail bhej do.`,
                    )
                  }
                >
                  <View style={styles.iconWrap}>
                    <Feather name="mail" size={18} color="#9d0399" />
                  </View>
                  <Text style={styles.contactLabel}>Email bhejo</Text>
                  <Feather name="chevron-right" size={20} color="#B8B0D0" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        <Text style={styles.version}>Astrobook v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F0FF" },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    padding: 16,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A2E" },
  heroSub: { fontSize: 13, color: "#6B7280", marginTop: 3, lineHeight: 18 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
  },
  hours: {
    fontSize: 12,
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F0FF" },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: { flex: 1, fontSize: 14, color: "#1A1A2E", fontWeight: "500" },
  faqItem: { paddingHorizontal: 16, paddingVertical: 16 },
  faqItemOpen: { backgroundColor: "#FBF5FF" },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F0FF" },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    lineHeight: 20,
  },
  faqQuestionOpen: { color: "#9d0399" },
  faqAnswer: {
    marginTop: 10,
    fontSize: 13,
    color: "#4A4468",
    lineHeight: 20,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
  },
});
