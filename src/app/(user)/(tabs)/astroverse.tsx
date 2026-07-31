import { StyleSheet, Text, View } from "react-native";

export default function AstroVerse() {
  return (
    <View style={styles.root}>
      <Text style={styles.emoji}>🌟</Text>
      <Text style={styles.title}>AstroVerse</Text>
      <Text style={styles.sub}>Coming Soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F9F5FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  sub: { fontSize: 14, color: "#9CA3AF" },
});
