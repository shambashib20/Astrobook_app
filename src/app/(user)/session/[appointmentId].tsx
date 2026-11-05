import Header from "@/components/header";
import { useUser } from "@/features/auth/store/auth.store";
import { consultationService } from "@/features/consultation/service";
import type { AppointmentWithChildren } from "@/features/consultation/types";
import { Feather } from "@expo/vector-icons";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
  | "waiting_for_astrologer"
  | "joining"
  | "in_call"
  | "ended"
  | "error";

type ChatMsg = {
  id: string;
  text: string;
  isMine: boolean;
  senderName: string;
  timestamp: number;
};

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

  // ── In-call chat ────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const engineRef = useRef<IRtcEngine | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endsAtRef = useRef<number>(0);
  const endingRef = useRef(false); // double-tap/duplicate-end guard
  const dataStreamIdRef = useRef<number | null>(null);
  const msgListRef = useRef<FlatList<ChatMsg>>(null);
  // Ref so the Agora event handler (closed over once) always sees current chatOpen
  const chatOpenRef = useRef(false);

  const isAstrologer = appointment ? user?.id === appointment.astrologerId : false;
  const otherPersonLabel = isAstrologer ? "Client" : "Astrologer";
  const otherPersonName = appointment
    ? isAstrologer
      ? appointment.userName ?? "Client"
      : appointment.astrologerName ?? "Astrologer"
    : "";

  // Keep chatOpenRef in sync; clear badge when panel opens
  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  // Auto-scroll FlatList to latest message when panel is visible
  useEffect(() => {
    if (messages.length > 0 && chatOpen) {
      setTimeout(() => msgListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, chatOpen]);

  // ── Load appointment + countdown-before-join ticker ──────────────────────
  const loadAppointment = useCallback(async () => {
    if (!appointmentId) {
      setErrorMsg("Session ID is missing — this link appears to be invalid");
      setScreenState("error");
      return;
    }
    try {
      const data = await consultationService.getAppointmentById(appointmentId);
      setAppointment(data);

      if (data.status === "completed" || data.status === "cancelled") {
        setScreenState(data.status === "completed" ? "ended" : "error");
        if (data.status === "cancelled") setErrorMsg("This booking has been cancelled");
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
        err?.response?.data?.message || "Failed to load session details",
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

  // In-call ke dauraan screen sleep na ho — warna video/audio ruk jaata hai
  // ya user ko lagta hai call drop ho gayi. Sirf in_call state mein zaroori
  // hai, baaki (waiting/loading) screens mein normal auto-lock chalne do.
  useEffect(() => {
    if (screenState !== "in_call") return;
    activateKeepAwakeAsync("session-in-call");
    return () => {
      deactivateKeepAwake("session-in-call");
    };
  }, [screenState]);

  // In-call countdown (session duration) — client-side self-enforced end
  useEffect(() => {
    if (screenState !== "in_call") return;
    const tick = () => {
      const diff = endsAtRef.current - Date.now();
      setRemainingMs(Math.max(diff, 0));
      if (diff <= 0) {
        if (isAstrologer) handleEndCall();
        else handleLeave();
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
    if (
      screenState !== "waiting_for_time" &&
      screenState !== "ready_to_join" &&
      screenState !== "waiting_for_astrologer"
    )
      return;
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
    dataStreamIdRef.current = null;
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
      // Agar chat panel khula hai toh pehle woh band karo
      if (chatOpenRef.current) {
        setChatOpen(false);
        return true;
      }
      Alert.alert(
        "Leave Session?",
        "Leaving now won't end the session, but your video and audio will stop. You can rejoin from this booking.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
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
        "Permissions Required",
        "Camera and Microphone permissions are required for a video session. Please allow them manually in Settings.",
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
        // Doosri party se data stream message aaya — in-call chat ke liye
        onStreamMessage: (_connection, _uid, _streamId, data) => {
          try {
            const text = new TextDecoder().decode(data as Uint8Array);
            const msg = JSON.parse(text) as { text: string; name: string; ts: number };
            const incoming: ChatMsg = {
              id: `remote-${msg.ts}-${Math.random()}`,
              text: msg.text,
              isMine: false,
              senderName: msg.name || otherPersonName,
              timestamp: msg.ts,
            };
            setMessages((prev) => [...prev, incoming]);
            // Panel band hai toh badge badhao
            if (!chatOpenRef.current) {
              setUnreadCount((prev) => prev + 1);
            }
          } catch {
            // corrupt/non-chat data stream — ignore
          }
        },
        // Token ~30s mein expire hone wala hai — naya token backend se le
        // ke engine.renewToken() se de do, call disconnect nahi hoti. Ye
        // khaas taur pe 60-min se lambe services (90-min variant) ke liye
        // zaroori hai kyunki token hamesha 1 hour ke liye banta hai.
        onTokenPrivilegeWillExpire: async () => {
          try {
            const fresh = await consultationService.renewAgoraToken(appointmentId);
            engineRef.current?.renewToken(fresh.token);
          } catch (err) {
            console.log("Agora token renew failed:", err);
          }
        },
      });

      engine.joinChannel(agora.token, agora.channel, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      // Data stream setup — in-call chat ke liye. createDataStream positive
      // number (streamId) return karta hai success pe; negative = error.
      try {
        const dsId = engine.createDataStream({ syncWithAudio: false, ordered: true } as any);
        dataStreamIdRef.current = typeof dsId === "number" && dsId > 0 ? dsId : null;
      } catch (err) {
        // Data stream optional hai — fail hone pe bhi call chalta rehta hai
        console.log("createDataStream failed:", err);
        dataStreamIdRef.current = null;
      }

      engineRef.current = engine;
      setScreenState("in_call");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        // Astrologer abhi tak join nahi hui — ye normal/temporary situation
        // hai (dono ka time-gate ek saath khulta hai ab, bas chand second ka
        // farak hota hai). Harsh error-alert dikhaana galat hoga — khud-b-khud
        // retry karte hain jab tak astrologer aa nahi jaati.
        setScreenState("waiting_for_astrologer");
        return;
      }
      Alert.alert(
        "Could Not Join",
        err?.response?.data?.message || "Failed to join the session",
      );
      setScreenState("ready_to_join");
    }
  };

  // "waiting_for_astrologer" state mein har 3 sec baad khud-b-khud dobara
  // join try karo — user ko baar-baar tap nahi karna padta
  useEffect(() => {
    if (screenState !== "waiting_for_astrologer") return;
    const id = setTimeout(() => {
      handleJoin();
    }, 3000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState]);

  // Auto-start: scheduled time aate hi (ready_to_join) khud-b-khud join
  // try karo — manual "Join Session" tap ki zarurat nahi. Ek baar hi
  // auto-try hota hai per screen-visit; agar fail ho (koi genuine error
  // aaye, alert dikhega) toh dobara auto-loop nahi karte — button abhi
  // bhi manually tap kiya ja sakta hai fallback ke liye.
  const autoJoinTriedRef = useRef(false);
  useEffect(() => {
    if (screenState !== "ready_to_join") return;
    if (autoJoinTriedRef.current) return;
    autoJoinTriedRef.current = true;
    handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState]);

  // Astrologer ke liye — session POORI TARAH khatam, dono ke liye. Backend
  // bhi ab yeh enforce karta hai (sirf astrologer end kar sakta hai).
  const handleEndCall = async () => {
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

  // User ke liye — sirf apni taraf se nikalta hai, backend session
  // "ongoing" hi rehta hai. Isi booking se My Bookings → Join karke wapas
  // aa sakta hai jab tak astrologer end na kare ya duration khatam na ho
  // (tab background cron automatically complete kar deta hai).
  const handleLeave = async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      await teardownAgora();
      router.replace("/(user)/my-bookings" as any);
    } finally {
      endingRef.current = false;
    }
  };

  const confirmEndOrLeave = () => {
    if (isAstrologer) {
      Alert.alert(
        "End Session?",
        "This will end the session for both parties — you will not be able to rejoin.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "End Session", style: "destructive", onPress: handleEndCall },
        ],
      );
    } else {
      Alert.alert(
        "Leave Call?",
        "The session will keep running — you can rejoin from My Bookings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", onPress: handleLeave },
        ],
      );
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

  const flipCamera = () => {
    engineRef.current?.switchCamera();
  };

  // In-call chat — data stream se message bhejo
  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text || !engineRef.current || dataStreamIdRef.current === null) return;
    try {
      const payload = JSON.stringify({
        text,
        name: user?.name ?? "Me",
        ts: Date.now(),
      });
      const bytes = new TextEncoder().encode(payload);
      engineRef.current.sendStreamMessage(
        dataStreamIdRef.current,
        bytes as any,
        bytes.length,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `me-${Date.now()}`,
          text,
          isMine: true,
          senderName: "Me",
          timestamp: Date.now(),
        },
      ]);
      setChatInput("");
      Keyboard.dismiss();
    } catch (err) {
      console.log("sendStreamMessage error:", err);
      Alert.alert("Message Not Sent", "Please try again.");
    }
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
        <Text style={styles.errorText}>{errorMsg ?? "Something went wrong"}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/(user)/my-bookings" as any)}
        >
          <Text style={styles.primaryBtnText}>Go to My Bookings</Text>
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
        <Text style={styles.endedTitle}>Session Ended</Text>
        <Text style={styles.errorText}>
          Your consultation has been completed.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/(user)/my-bookings" as any)}
        >
          <Text style={styles.primaryBtnText}>Go to My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (
    screenState === "waiting_for_time" ||
    screenState === "ready_to_join" ||
    screenState === "waiting_for_astrologer" ||
    screenState === "joining"
  ) {
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
          ) : screenState === "waiting_for_astrologer" ? (
            <>
              <ActivityIndicator color="#9d0399" style={{ marginBottom: 8 }} />
              <Text style={styles.readyText}>
                {otherPersonLabel} session mein aa rahi hai — bas thodi der...
              </Text>
            </>
          ) : (
            <Text style={styles.readyText}>
              Session shuru ho sakta hai — join karo
            </Text>
          )}

          {screenState !== "waiting_for_astrologer" && (
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
          )}
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
          {/* Camera flip button — local preview ke andar hi dikhta hai */}
          <TouchableOpacity style={styles.flipBtn} onPress={flipCamera}>
            <Feather name="refresh-cw" size={14} color="#FFF" />
          </TouchableOpacity>
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
        {/* Chat button with unread badge */}
        <View>
          <TouchableOpacity
            style={[styles.controlBtn, chatOpen && styles.controlBtnActive]}
            onPress={() => setChatOpen((v) => !v)}
          >
            <Feather name="message-circle" size={22} color="#FFF" />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 9 ? "9+" : String(unreadCount)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.controlBtn, micMuted && styles.controlBtnActive]}
          onPress={toggleMic}
        >
          <Feather name={micMuted ? "mic-off" : "mic"} size={22} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallBtn} onPress={confirmEndOrLeave}>
          <Feather name="phone-off" size={26} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, cameraOff && styles.controlBtnActive]}
          onPress={toggleCamera}
        >
          <Feather name={cameraOff ? "video-off" : "video"} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── In-call chat drawer ──────────────────────────────────────────── */}
      {chatOpen && (
        <View style={styles.chatOverlay}>
          {/* Backdrop — tap bahar to close */}
          <TouchableOpacity
            style={styles.chatBackdrop}
            activeOpacity={1}
            onPress={() => {
              setChatOpen(false);
              Keyboard.dismiss();
            }}
          />

          {/* Chat panel */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View style={styles.chatPanel}>
              {/* Header */}
              <View style={styles.chatHeader}>
                <Text style={styles.chatHeaderTitle}>Chat</Text>
                <TouchableOpacity
                  onPress={() => {
                    setChatOpen(false);
                    Keyboard.dismiss();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={20} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Message list */}
              <FlatList
                ref={msgListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.msgList}
                contentContainerStyle={styles.msgListContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.msgBubble,
                      item.isMine ? styles.msgBubbleMine : styles.msgBubbleOther,
                    ]}
                  >
                    {!item.isMine && (
                      <Text style={styles.msgSender}>{item.senderName}</Text>
                    )}
                    <Text
                      style={[
                        styles.msgText,
                        item.isMine && styles.msgTextMine,
                      ]}
                    >
                      {item.text}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.chatEmpty}>
                    Abhi koi message nahi — pehla message bhejo!
                  </Text>
                }
              />

              {/* Input row */}
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Message..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  onSubmitEditing={sendChatMessage}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    !chatInput.trim() && styles.sendBtnDisabled,
                  ]}
                  onPress={sendChatMessage}
                  disabled={!chatInput.trim()}
                >
                  <Feather name="send" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
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

  // ── In-call ────────────────────────────────────────────────────────────────
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
  flipBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#00000060",
    alignItems: "center",
    justifyContent: "center",
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
    gap: 20,
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
  // Chat button unread badge
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },

  // ── Chat overlay + panel ────────────────────────────────────────────────────
  chatOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  chatBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000050",
  },
  chatPanel: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 380,
    overflow: "hidden",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  chatHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  msgList: { flex: 1 },
  msgListContent: {
    padding: 12,
    gap: 8,
    flexGrow: 1,
  },
  msgBubble: {
    maxWidth: "78%",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  msgBubbleOther: {
    alignSelf: "flex-start",
  },
  msgBubbleMine: {
    backgroundColor: "#9d0399",
    borderRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
    alignSelf: "flex-end",
  },
  msgSender: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 3,
  },
  msgText: { fontSize: 14, color: "#1F2937", lineHeight: 20 },
  msgTextMine: { color: "#FFF" },
  chatEmpty: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    padding: 32,
    flex: 1,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 14,
    color: "#1F2937",
    maxHeight: 96,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9d0399",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});