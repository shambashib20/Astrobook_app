import ScreenHeader from "@/components/ScreenHeader";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BankOnboardingScreen() {
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="🏦 Bank Onboarding" subtitle="Payout setup" />
      <View style={styles.content}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.subtitle}>
          Bank onboarding is not available yet. We'll notify you once you can
          add your payout details here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emoji: { fontSize: 40 },
  title: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
