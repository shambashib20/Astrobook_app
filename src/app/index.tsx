// Root _layout.tsx already handles the initial redirect (login ya feed)
// restoreSession() ke result ke hisaab se. Yahan se apna alag redirect
// nahi karna — pehle yahan bhi hardcoded "/(auth)/login" redirect tha,
// jo root layout ke restoreSession()-based redirect ke saath RACE karta
// tha. Dono simultaneously fire hote the — agar user already logged-in
// hota, root layout use feed (tabs ke saath) pe le jaata, lekin yeh file
// use FORCE login pe bhej deta — result: purani tab bar screen background
// mein reh jaati aur login card upar overlay ho jaata (tab bar peek-through
// bug). Ab yeh file kuch nahi karta, sirf root layout ka decision wait karta hai.
export default function Index() {
  return null;
}
