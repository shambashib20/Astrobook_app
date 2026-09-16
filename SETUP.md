# AstroBook — Fresh Setup Guide (Team)

Ye guide un logon ke liye hai jo apne computer pe AstroBook app aur backend
pehli baar (ya sab delete karke dobara) chalana chahte hain.

**Ek line mein rule:** koi bhi apna keystore, apna Expo project, ya apna
Google client **nahi banayega**. Sab kuch `astrobook` Expo organization aur
`astrobook-4a069` Google Cloud project se shared hai. Isi wajah se Google login
har laptop pe bina kuch badle chalega.

---

## 0. Pehle access check karo

In sab ke bina aage mat badhna:

- [ ] **Expo:** `astrobook` organization ka invite email accept kiya ho,
      usi email wale Expo account se.
- [ ] **Google Cloud:** `astrobook-4a069` project ka IAM invite accept kiya ho
      (email mein aata hai).
- [ ] **GitHub:** app repo aur backend repo dono ka access ho.
- [ ] **Backend secrets:** backend ki `.env` Tushar se mile, **secure tareeke se**
      (password manager / Bitwarden Send jaisa). WhatsApp ya email pe plain text
      mein nahi.

---

## 1. Purana sab saaf karo

```bash
# Purane app aur backend folders delete karo (apna path daalo)
rm -rf ~/path/to/old/Astrobook_app
rm -rf ~/path/to/old/astrobook-backend

# Purana EAS login hatao
npx eas-cli logout
```

**Phone pe:** purani "Astrobook" dev build app uninstall karo. Purana package
`com.tushar440.astrobook` tha, naya `com.astrobook.app` hai. Dono ek saath
install ho sakte hain aur confusion hoga.

---

## 2. Tools install karo

**Node.js 22** (nvm se sabse aasaan):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# terminal band karke dobara kholo
nvm install 22
nvm use 22
node -v   # v22.x.x aana chahiye
```

**Git** (agar nahi hai):

```bash
sudo apt install git   # Linux
```

**EAS CLI:**

```bash
npm i -g eas-cli
```

> Linux pe `EACCES` permission error aaye to `sudo` mat lagao. nvm se installed
> Node pe ye error nahi aata.

---

## 3. Expo mein login

```bash
eas login          # apne invited email wale account se
eas whoami
```

Output mein `Accounts:` ke neeche **`astrobook`** dikhna chahiye. Nahi dikh raha
matlab org invite accept nahi hua ya galat account se login hai.

---

## 4. App setup

```bash
git clone <app-repo-url> Astrobook_app
cd Astrobook_app
npm ci
```

> `npm install` ki jagah `npm ci` use karo — ye `package-lock.json` se exact
> same versions lagata hai jo baaki team ke paas hain.

**Env variables EAS se lo** (haath se copy mat karo):

```bash
eas env:pull --environment development
```

Ye `.env.local` file banayega (git ignored hai). Ab local backend use karne ke
liye API URL ko auto mode pe set karo:

```bash
sed -i 's#^EXPO_PUBLIC_API_URL=.*#EXPO_PUBLIC_API_URL=auto:9000#' .env.local
grep EXPO_PUBLIC_API_URL .env.local
# EXPO_PUBLIC_API_URL=auto:9000 aana chahiye
```

> **`auto:9000` kya karta hai:** app apne aap us laptop ka IP le leti hai jahan
> Metro chal raha hai, aur port 9000 laga deti hai. Kisi ko kabhi IP likhna
> nahi padega.
>
> Render wala live backend use karna ho (local backend nahi chal raha), to
> wahan `https://astrobook-backend.onrender.com` likh do.
>
> `eas env:pull` dobara chalaoge to `.env.local` overwrite hogi — `sed` wali
> line phir se chalana.

Check karo sab theek hai:

```bash
npx tsc --noEmit        # koi output nahi = zero errors
npx expo install --check  # "Dependencies are up to date"
```

---

## 5. Backend setup

```bash
cd ..
git clone <backend-repo-url> astrobook-backend
cd astrobook-backend
npm ci
```

Tushar se mili `.env` file ko backend folder ke root mein rakho (naam exactly
`.env`). Phir:

```bash
npm run dev
```

`Server listening at http://0.0.0.0:9000` jaisa dikhna chahiye.
"Invalid environment variables" aaye to `.env` mein kuch missing hai.

**Network check** (phone isi IP se backend tak jayega):

```bash
hostname -I
curl http://$(hostname -I | awk '{print $1}'):9000/api/v1/categories
```

JSON aaya = theek. Hang / refused = firewall:

```bash
sudo ufw status
# "active" hai to:
sudo ufw allow 9000   # backend
sudo ufw allow 8081   # Metro (app ka JS isi port se phone tak jaata hai)
```

> **Cashfree webhook** local pe test karna ho tabhi ngrok chahiye, aur `.env`
> mein `BACKEND_PUBLIC_URL` apne ngrok URL pe set karna. Normal kaam ke liye
> zaroorat nahi.

---

## 6. Dev build phone pe install karo

**Apna build mat banao.** Team ka bana hua dev build install karo:

1. Phone pe browser mein <https://expo.dev> kholo, login karo.
2. Organization **AstroBook** → project **astrobook** → **Builds**.
3. Sabse naya **Android · development** build kholo → **Install**.
4. Android "unknown sources" permission maange to allow karo.

Naya dev build sirf tab chahiye jab koi **native** cheez badle (neeche section 9).
Wo team mein bata ke ek hi banda banayega.

---

## 7. App chalao

Phone aur laptop **same WiFi** pe hon. App folder mein:

```bash
npx expo start --dev-client --clear
```

Phone pe **Astrobook** app kholo → wo LAN pe Metro server dhoondh lega,
use tap karo. Na dikhe to terminal wala QR scan karo.

> `--tunnel` mat lagana. Tunnel mode mein `auto:9000` ko laptop ka IP nahi
> milta aur app Render pe chali jaati hai (Metro mein warning dikhegi:
> `[api] auto mode mein Metro host nahi mila`).
>
> `.env.local` badalne ke baad hamesha `--clear` ke saath restart karo.

---

## 8. Sab chal raha hai? Checklist

- [ ] App mein feed / astrologers list khule, aur **backend terminal mein
      requests ke logs** aayen (logs nahi = app Render pe ja rahi hai).
- [ ] **OTP login** chale.
- [ ] **Google login** chale. `DEVELOPER_ERROR` aaye to galat build install hai
      (section 6) — khud se SHA-1 add mat karna, team ko batao.
- [ ] Login ke baad notification permission Allow karne pe backend logs mein
      `POST /api/v1/users/me/push-token` dikhe.

---

## 9. Team rules (inse hi purana friction wapas nahi aayega)

**Kabhi mat karna:**

- `npx expo run:android` se Google login test — ye laptop ki debug keystore
  use karta hai, SHA-1 alag hoga, login fail hoga.
- `eas credentials` mein naya keystore banana.
- `eas init` ya `app.json` mein `owner`, `package`, `projectId` badalna.
- `.env`, `.env.local`, ya koi service account key git mein commit karna.
- `npm audit fix --force` — Expo ke pinned versions tod deta hai.
- Expo packages `npm install` se daalna — hamesha `npx expo install <package>`.

**Rebuild kab chahiye (team ko bata ke):**

| Change | Naya dev build? |
|---|---|
| JS/TS code, screens, styles | Nahi |
| `.env` / `.env.local` values | Nahi (bas `--clear` restart) |
| Naya native package (jaise camera, payment SDK) | **Haan** |
| `app.json` mein plugins / permissions / icons / splash | **Haan** |
| `google-services.json` | **Haan** |

**Env variable badalna ho** (sabke liye): EAS pe update karo, local file mein
nahi. Phir baaki log `eas env:pull --environment development` chalayein.

---

## Shared setup reference

| Cheez | Value |
|---|---|
| Expo organization / project | `astrobook` / `@astrobook/astrobook` |
| Android package | `com.astrobook.app` |
| Google Cloud / Firebase project | `astrobook-4a069` |
| Google Web client ID (app + backend dono mein) | `863538894717-h7387re39sf7o82e7nsmkutaekegtafh.apps.googleusercontent.com` |
| EAS keystore SHA-1 | `9B:5B:31:52:19:BC:8A:A9:7B:C5:0A:CA:44:E7:81:E4:4E:43:12:D0` |
| Local backend port | `9000` |
| Live backend | `https://astrobook-backend.onrender.com` |