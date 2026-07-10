import Header from "@/components/header";
import { useUser } from "@/features/auth/store/auth.store";
import { consultationService } from "@/features/consultation/service";
import type { AppointmentWithChildren } from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
} from "react-native-agora";

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID as string;
// Scheduled time se kitne minute pehle join allowed hai — backend ke
// JOIN_GRACE_MINUTES se match hona chahiye
const JOIN_GRACE_MINUTES = 5;
// Status poll interval — dusri party ne call end ki ya nahi yeh check karne ke liye
const STATUS_POLL_MS = 6000;

type ScreenState =
  | "loading"
  | "waiting_for_time"
  | "ready_to_join"
  | "joining"
  | "in_call"
  | "ended"
  | "error";

function formatCountdown(ms: number) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function SessionScreen() {
  const router = useRouter();
  const user = useUser();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [appointment, setAppointment] = useState<AppointmentWithChildren | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState("");
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);
  const [remoteVideoMuted, setRemoteVideoMuted] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const engineRef = useRef<IRtcEngine | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endsAtRef = useRef<number>(0);
  const endingRef = useRef(false); // double-tap/duplicate-end guard

  const isAstrologer = appointment ? user?.id === appointment.astrologerId : false;
  const otherPersonLabel = isAstrologer ? "Client" : "Astrologer";
  const otherPersonName = appointment
    ? isAstrologer
      ? appointment.userName ?? "Client"
      : appointment.astrologerName ?? "Astrologer"
    : "";

  // ── Load appointment + countdown-before-join ticker ──────────────────────
  const loadAppointment = useCallback(async () => {
    if (!appointmentId) {
      setErrorMsg("Session ID missing hai — link galat lagta hai");
      setScreenState("error");
      return;
    }
    try {
      const data = await consultationService.getAppointmentById(appointmentId);
      setAppointment(data);

      if (data.status === "completed" || data.status === "cancelled") {
        setScreenState(data.status === "completed" ? "ended" : "error");
        if (data.status === "cancelled") setErrorMsg("Yeh booking cancel ho chuki hai");
        return;
      }

      endsAtRef.current = new Date(data.endsAt).getTime();
      const joinOpensAt = new Date(data.scheduledAt).getTime() - JOIN_GRACE_MINUTES * 60000;
      const now = Date.now();

      if (data.status === "ongoing") {
        setScreenState((prev) => (prev === "in_call" ? prev : "ready_to_join"));
      } else if (now < joinOpensAt) {
        setScreenState("waiting_for_time");
      } else {
        setScreenState("ready_to_join");
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || "Session details load nahi hui",
      );
      setScreenState("error");
    }
  }, [appointmentId]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  // Pre-join countdown ticker ("Session starts in X minutes")
  useEffect(() => {
    if (screenState !== "waiting_for_time" || !appointment) return;
    const joinOpensAt = new Date(appointment.scheduledAt).getTime() - JOIN_GRACE_MINUTES * 60000;

    const tick = () => {
      const diff = joinOpensAt - Date.now();
      if (diff <= 0) {
        setScreenState("ready_to_join");
        return;
      }
      setCountdownText(formatCountdown(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [screenState, appointment]);

  // In-call countdown (session duration) — client-side self-enforced end
  useEffect(() => {
    if (screenState !== "in_call") return;
    const tick = () => {
      const diff = endsAtRef.current - Date.now();
      setRemainingMs(Math.max(diff, 0));
      if (diff <= 0) {
        handleEndCall(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState]);

  // Pre-call states (waiting/ready) mein bhi halka background refresh —
  // agar doosri party pehle join kar chuki ho (status "ongoing" ho jaaye)
  // ya astrologer/admin ne cancel kar diya ho, toh yeh screen turant update ho
  useEffect(() => {
    if (screenState !== "waiting_for_time" && screenState !== "ready_to_join") return;
    const id = setInterval(loadAppointment, 15000);
    return () => clearInterval(id);
  }, [screenState, loadAppointment]);

  // Poll appointment status while in-call — doosri party ne end kiya toh pata chale
  useEffect(() => {
    if (screenState !== "in_call") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const data = await consultationService.getAppointmentById(appointmentId);
        if (data.status === "completed") {
          await teardownAgora();
          setScreenState("ended");
        }
      } catch {
        // network blip — agla poll try karega, abhi ignore karo
      }
    }, STATUS_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState, appointmentId]);

  // ── Agora setup ────────────────────────────────────────────────────────────

  const teardownAgora = useCallback(async () => {
    try {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
    } catch {
      // ignore — best-effort cleanup
    }
    engineRef.current = null;
    setRemoteUid(null);
    setRemoteAudioMuted(false);
    setRemoteVideoMuted(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    // Screen chhodte waqt (back/unmount) bhi properly cleanup ho
    return () => {
      teardownAgora();
    };
  }, [teardownAgora]);

  // In-call ke dauran hardware back button galti se dabne se poora session
  // chhod ke chala jaana easy hai — confirm karke hi jaane do
  useEffect(() => {
    if (screenState !== "in_call" || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        "Session Chhodna Hai?",
        "Agar tum ab call se bahar gaye toh session end nahi hoga, lekin video/audio ruk jaayega. Dobara isi booking se join kar sakte ho.",
        [
          { text: "Nahi, wapas jao", style: "cancel" },
          {
            text: "Haan, chhodo",
            style: "destructive",
            onPress: async () => {
              await teardownAgora();
              router.back();
            },
          },
        ],
      );
      return true; // default back action rok do
    });
    return () => sub.remove();
  }, [screenState, teardownAgora, router]);

  // Android pe manifest mein permission declare karna kaafi nahi hai —
  // "dangerous" permissions (camera/mic) explicitly RUNTIME pe maangni
  // padti hain, warna popup kabhi aayega hi nahi aur engine silently video
  // capture nahi kar payega (blank screen dikhega, koi error bhi nahi dega)
  const requestAgoraPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true; // iOS khud handle karta hai Info.plist se

    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);

    const cameraOk =
      granted[PermissionsAndroid.PERMISSIONS.CAMERA] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const micOk =
      granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (!cameraOk || !micOk) {
      Alert.alert(
        "Permission Chahiye",
        "Video session ke liye Camera aur Microphone dono ki permission zaroori hai. Settings mein jaake manually allow kar do.",
      );
      return false;
    }
    return true;
  };

  const handleJoin = async () => {
    if (!appointmentId) return;
    setScreenState("joining");

    const permissionsOk = await requestAgoraPermissions();
    if (!permissionsOk) {
      setScreenState("ready_to_join");
      return;
    }

    try {
      const { agora } = await consultationService.joinSession(appointmentId);

      const engine = createAgoraRtcEngine();
      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
      engine.enableAudio();
      engine.enableVideo();
      engine.startPreview();
      // Video call ke liye by-default loudspeaker chahiye — warna Agora
      // "Communication" profile default earpiece use karta hai aur audio
      // "kaam nahi kar raha" jaisa lagta hai (phone kaan se lagana padta)
      engine.setDefaultAudioRouteToSpeakerphone(true);
      engine.setEnableSpeakerphone(true);

      engine.registerEventHandler({
        onUserJoined: (_connection, uid) => {
          // Bug tha yahan — pehle hardcoded 1 daal diya tha, isliye remote
          // video kabhi nahi dikhta tha. Agora jo REAL uid deta hai wahi
          // RtcSurfaceView ko chahiye hota hai canvas render karne ke liye
          setRemoteUid(uid);
        },
        onUserOffline: () => {
          // NOTE: yeh temporary disconnect bhi ho sakta hai (app background) —
          // session ko turant end nahi karte, status-poll hi asal signal hai
          setRemoteUid(null);
        },
        onRemoteAudioStateChanged: (_connection, _uid, state) => {
          // state === 0 (Stopped) matlab doosri party ne mic mute kiya hai
          setRemoteAudioMuted(state === 0);
        },
        onRemoteVideoStateChanged: (_connection, _uid, state) => {
          setRemoteVideoMuted(state === 0);
        },
        onError: (err) => {
          console.log("Agora error:", err);
        },
      });

      engine.joinChannel(agora.token, agora.channel, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      engineRef.current = engine;
      setScreenState("in_call");
    } catch (err: any) {
      Alert.alert(
        "Join Nahi Ho Paya",
        err?.response?.data?.message || "Session join nahi ho paya",
      );
      setScreenState("ready_to_join");
    }
  };

  const handleEndCall = async (auto = false) => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      await teardownAgora();
      if (appointmentId) {
        await consultationService.endSession(appointmentId).catch(() => {});
      }
      setScreenState("ended");
    } finally {
      endingRef.current = false;
    }
  };

  const toggleMic = () => {
    const next = !micMuted;
    engineRef.current?.muteLocalAudioStream(next);
    setMicMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    engineRef.current?.muteLocalVideoStream(next);
    setCameraOff(next);
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (screenState === "loading") {
    return (
      <View style={[styles.root, styles.centerFill]}>
        <ActivityIndicator color="#9d0399" size="large" />
      </View>
    );
  }

  if (screenState === "error") {
    return (
      <View style={[styles.root, styles.centerFill, { padding: 24 }]}>
        <Header />
        <Feather name="alert-circle" size={32} color="#DC2626" />
        <Text style={styles.errorText}>{errorMsg ?? "Kuch galat ho gaya"}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/(user)/my-bookings" as any)}
        >
          <Text style={styles.primaryBtnText}>My Bookings pe jao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screenState === "ended") {
    return (
      <View style={[styles.root, styles.centerFill, { padding: 24 }]}>
        <Header />
        <View style={styles.endedIconCircle}>
          <Feather name="phone-off" size={36} color="#4B5563" />
        </View>
        <Text style={styles.endedTitle}>Session Khatam Ho Gaya</Text>
        <Text style={styles.errorText}>
          Consultation complete ho chuki hai.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/(user)/my-bookings" as any)}
        >
          <Text style={styles.primaryBtnText}>My Bookings pe jao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screenState === "waiting_for_time" || screenState === "ready_to_join" || screenState === "joining") {
    return (
      <View style={styles.root}>
        <Header />
        <View style={[styles.centerFill, { padding: 24 }]}>
          <View style={styles.preCallIconCircle}>
            <Feather name="video" size={36} color="#9d0399" />
          </View>
          <Text style={styles.serviceTitle}>{appointment?.service.title}</Text>
          <Text style={styles.withText}>with {otherPersonName}</Text>

          {screenState === "waiting_for_time" ? (
            <>
              <Text style={styles.countdownLabel}>Session starts in</Text>
              <Text style={styles.countdownBig}>{countdownText}</Text>
            </>
          ) : (
            <Text style={styles.readyText}>
              Session shuru ho sakta hai — join karo
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.joinBtn,
              screenState !== "ready_to_join" && styles.joinBtnDisabled,
            ]}
            disabled={screenState !== "ready_to_join"}
            onPress={handleJoin}
          >
            {screenState === "joining" ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="phone-call" size={16} color="#FFF" />
                <Text style={styles.joinBtnText}>Join Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── in_call ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.callRoot}>
      {/* Remote video (full screen) */}
      {remoteUid !== null ? (
        remoteVideoMuted ? (
          <View style={[styles.remoteVideo, styles.waitingBox]}>
            <View style={styles.remoteAvatarCircle}>
              <Feather name="user" size={40} color="#FFF" />
            </View>
            <Text style={styles.waitingText}>
              {otherPersonName} ne camera band kiya hai
            </Text>
          </View>
        ) : (
          <RtcSurfaceView style={styles.remoteVideo} canvas={{ uid: remoteUid }} />
        )
      ) : (
        <View style={[styles.remoteVideo, styles.waitingBox]}>
          <ActivityIndicator color="#FFF" size="large" />
          <Text style={styles.waitingText}>
            {otherPersonLabel} ka wait ho raha hai...
          </Text>
        </View>
      )}

      {/* Doosri party ne mic mute kiya hai — badge */}
      {remoteUid !== null && remoteAudioMuted && (
        <View style={styles.remoteMutedBadge}>
          <Feather name="mic-off" size={12} color="#FFF" />
          <Text style={styles.remoteMutedBadgeText}>{otherPersonName} muted</Text>
        </View>
      )}

      {/* Local video (small overlay) */}
      {!cameraOff && (
        <View style={styles.localVideoBox}>
          <RtcSurfaceView style={{ flex: 1 }} canvas={{ uid: 0 }} zOrderMediaOverlay />
        </View>
      )}

      {/* Top bar: timer */}
      <View style={styles.topBar}>
        <View style={styles.timerPill}>
          <Feather name="clock" size={12} color="#FFF" />
          <Text style={styles.timerText}>{formatCountdown(remainingMs)}</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.controlBtn, micMuted && styles.controlBtnActive]}
          onPress={toggleMic}
        >
          <Feather name={micMuted ? "mic-off" : "mic"} size={22} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallBtn} onPress={() => handleEndCall(false)}>
          <Feather name="phone-off" size={26} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, cameraOff && styles.controlBtnActive]}
          onPress={toggleCamera}
        >
          <Feather name={cameraOff ? "video-off" : "video"} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },

  errorText: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  primaryBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 10,
  },
  primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

  endedIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  endedTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },

  preCallIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  serviceTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  withText: { fontSize: 13, color: "#6B7280", marginTop: 4, marginBottom: 20 },
  countdownLabel: { fontSize: 13, color: "#6B7280" },
  countdownBig: {
    fontSize: 40,
    fontWeight: "800",
    color: "#9d0399",
    marginTop: 4,
    marginBottom: 24,
  },
  readyText: {
    fontSize: 14,
    color: "#15803D",
    fontWeight: "600",
    marginBottom: 24,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#9d0399",
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 15,
  },
  joinBtnDisabled: { backgroundColor: "#D1D5DB" },
  joinBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },

  // In-call
  callRoot: { flex: 1, backgroundColor: "#000" },
  remoteVideo: { flex: 1 },
  waitingBox: { alignItems: "center", justifyContent: "center", gap: 10 },
  waitingText: { color: "#FFF", fontSize: 13 },
  remoteAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  remoteMutedBadge: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#00000080",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  remoteMutedBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  localVideoBox: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#222",
    borderWidth: 1.5,
    borderColor: "#FFF3",
  },
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#00000080",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  controlsBar: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF30",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActive: { backgroundColor: "#FFFFFF60" },
  endCallBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
});
