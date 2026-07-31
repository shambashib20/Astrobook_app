import { Stack } from "expo-router";

// Explore tab apna khud ka mini-stack rakhta hai: index -> [category].
// Screens already apna custom header/back button render karte hain,
// isliye native header yahan hide rakha hai.
export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[category]" />
    </Stack>
  );
}