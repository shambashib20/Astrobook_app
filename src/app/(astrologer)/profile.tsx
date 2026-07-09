// Astrologer profile ab (user)/profile.tsx ke andar hi render hoti hai
// (role ke hisaab se conditional view). Yeh route sirf backward-compat
// ke liye hai — agar kahin purana link/deep-link isse point karta ho.
import { Redirect } from "expo-router";

export default function AstrologerProfileRedirect() {
  return <Redirect href="/(user)/profile" />;
}
