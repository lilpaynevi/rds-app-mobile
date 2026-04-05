import { useAuth } from "@/scripts/AuthContext";
import { socket } from "@/scripts/socket.io";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Vibration,
  BackHandler,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  bgCard: "rgba(255,255,255,0.05)",
  accent: "#4F8EF7",
  accentDark: "#2D6BE4",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.30)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.12)",
  cyanBorder: "rgba(0,229,255,0.30)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.12)",
  successBorder: "rgba(0,230,118,0.35)",
  error: "#FF5252",
  errorDim: "rgba(255,82,82,0.12)",
  errorBorder: "rgba(255,82,82,0.35)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ConnectionStatus = "idle" | "connecting" | "success" | "error";

// ─── DigitBox ─────────────────────────────────────────────────────────────────
const DigitBox: React.FC<{
  value: string;
  isFilled: boolean;
  isActive: boolean;
  isError: boolean;
  index: number;
}> = ({ value, isFilled, isActive, isError, index }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFilled) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 200,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
        }),
      ]).start();
    }
  }, [isFilled]);

  const boxStyle = isError
    ? { backgroundColor: C.errorDim, borderColor: C.error }
    : isFilled
      ? { backgroundColor: C.cyanDim, borderColor: C.cyan }
      : isActive
        ? { backgroundColor: C.accentDim, borderColor: C.accent }
        : { backgroundColor: C.white05, borderColor: C.border };

  // Séparateur après le 3e et 6e chiffre
  const showSep = index === 2 || index === 5;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={[s.digitBox, boxStyle, { transform: [{ scale }] }]}>
        <Text
          style={[
            s.digitText,
            isFilled && s.digitFilled,
            isError && s.digitError,
          ]}
        >
          {value || ""}
        </Text>
        {!isFilled && isActive && <View style={s.cursor} />}
      </Animated.View>
      {showSep && <View style={s.digitSep} />}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const TVConnectScreen = () => {
  const [code, setCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [connectedDevice, setConnectedDevice] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [connectionStep, setConnectionStep] = useState("");
  const { user } = useAuth();

  const inputRef = useRef<TextInput>(null);
  const entranceOp = useRef(new Animated.Value(0)).current;
  const entranceY = useRef(new Animated.Value(20)).current;
  const successScale = useRef(new Animated.Value(0.6)).current;
  const successOp = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ── Entrance animation ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOp, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(entranceY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Socket & back handler ──
  useEffect(() => {
    socket.on("connect-tv-code-success", (data) => {
      setConnectedDevice({ id: data.deviceId, name: data.tvName });
      setIsConnecting(false);
      setStatus("success");
      stopPulse();
      animateSuccess();
      Vibration?.vibrate([100, 50, 100, 50, 100]);
      setTimeout(() => router.navigate("/home"), 3000);
    });

    socket.on("connect-tv-code-error", (data) => {
      showError(data.error);
      stopPulse();
    });

    setTimeout(() => inputRef.current?.focus(), 300);

    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (status === "connecting") return true;
      router.back();
      return true;
    });

    return () => {
      back.remove();
      socket.off("connect-tv-code-success");
      socket.off("connect-tv-code-error");
    };
  }, [status]);

  // ── Pulse (connecting) ──
  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  // ── Success anim ──
  const animateSuccess = () => {
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        tension: 80,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(successOp, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Handlers ──
  const handleCodeChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, "").slice(0, 9);
    setCode(numeric);
    if (status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }
    if (numeric.length === 9) setTimeout(() => handleConnect(numeric), 400);
  };

  const handleConnect = async (inputCode = code) => {
    if (inputCode.length !== 9) {
      showError("Le code doit contenir exactement 9 chiffres");
      return;
    }
    setIsConnecting(true);
    setStatus("connecting");
    startPulse();
    setConnectionStep("Recherche de l'appareil...");
    await new Promise((r) => setTimeout(r, 1800));
    socket.emit("connect-tv-code", { code: inputCode, userId: user?.id });
  };

  const showError = (msg: string) => {
    setIsConnecting(false);
    setStatus("error");
    setErrorMsg(msg);
    Vibration?.vibrate([200, 100, 200]);
  };

  const handleRetry = () => {
    setCode("");
    setStatus("idle");
    setErrorMsg("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ─── Render: Code Input ───────────────────────────────────────────────────
  const renderCodeInput = () => (
    <Animated.View
      style={{ opacity: entranceOp, transform: [{ translateY: entranceY }] }}
    >
      {/* Hero Card */}
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
        style={s.heroCard}
      >
        {/* Icon */}
        <LinearGradient colors={[C.cyanDim, C.white05]} style={s.heroIconWrap}>
          <Ionicons name="tv-outline" size={32} color={C.cyan} />
        </LinearGradient>
        <Text style={s.heroTitle}>Code d'Appairage</Text>
        <Text style={s.heroSub}>
          Entrez le code à 9 chiffres{"\n"}affiché sur votre télévision
        </Text>

        {/* Digits */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
        >
          <View style={s.digitRow}>
            {Array.from({ length: 9 }).map((_, i) => (
              <DigitBox
                key={i}
                index={i}
                value={code[i] ?? ""}
                isFilled={i < code.length}
                isActive={i === code.length && status !== "error"}
                isError={status === "error"}
              />
            ))}
          </View>
        </TouchableOpacity>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <Animated.View
            style={[
              s.progressFill,
              {
                width: `${(code.length / 9) * 100}%`,
                backgroundColor: status === "error" ? C.error : C.cyan,
              },
            ]}
          />
        </View>

        <Text style={s.progressLabel}>{code.length} / 9 chiffres</Text>

        {/* Hidden input */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="numeric"
          maxLength={9}
          style={{ position: "absolute", opacity: 0, left: -9999 }}
          editable={status !== "connecting"}
        />
      </LinearGradient>

      {/* Error */}
      {status === "error" && errorMsg ? (
        <View style={s.errorBox}>
          <View style={s.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={18} color={C.error} />
          </View>
          <Text style={s.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={handleRetry} style={s.errorRetryBtn}>
            <Text style={s.errorRetryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* CTA */}
      {code.length === 9 && status !== "error" ? (
        <TouchableOpacity
          style={s.ctaWrap}
          onPress={() => handleConnect()}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[C.cyan, C.accent]} style={s.ctaGrad}>
            <Ionicons name="link-outline" size={20} color={C.white} />
            <Text style={s.ctaText}>Connecter la TV</Text>
            <Ionicons
              name="arrow-forward-outline"
              size={18}
              color="rgba(255,255,255,0.6)"
            />
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={s.ctaWrapDisabled}>
          <Text style={s.ctaDisabledText}>
            {9 - code.length} chiffre{9 - code.length > 1 ? "s" : ""} restant
            {9 - code.length > 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Help */}
      {renderHelp()}
    </Animated.View>
  );

  // ─── Render: Connecting ───────────────────────────────────────────────────
  const renderConnecting = () => (
    <View style={s.stateCenter}>
      {/* Orb */}
      <View style={s.orbOuter}>
        <View style={s.orbMid}>
          <Animated.View
            style={[s.orbInner, { transform: [{ scale: pulseAnim }] }]}
          >
            <ActivityIndicator size="large" color={C.cyan} />
          </Animated.View>
        </View>
      </View>

      <Text style={s.stateTitle}>Connexion en cours…</Text>
      <View style={s.stepBadge}>
        <Ionicons name="radio-outline" size={13} color={C.cyan} />
        <Text style={s.stepText}>{connectionStep}</Text>
      </View>

      {/* Tips */}
      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
        style={s.tipsCard}
      >
        <View style={s.tipsHeader}>
          <Ionicons name="bulb-outline" size={16} color={C.cyan} />
          <Text style={s.tipsTitle}>Conseils</Text>
        </View>
        {[
          { icon: "tv-outline", text: "Gardez la TV allumée" },
          { icon: "wifi-outline", text: "Vérifiez votre connexion WiFi" },
          { icon: "timer-outline", text: "Le code expire dans 5 minutes" },
        ].map((tip, i) => (
          <View key={i} style={s.tipRow}>
            <Ionicons name={tip.icon as any} size={14} color={C.white40} />
            <Text style={s.tipText}>{tip.text}</Text>
          </View>
        ))}
      </LinearGradient>
    </View>
  );

  // ─── Render: Success ──────────────────────────────────────────────────────
  const renderSuccess = () => (
    <View style={s.stateCenter}>
      <Animated.View
        style={{ transform: [{ scale: successScale }], opacity: successOp }}
      >
        <LinearGradient colors={[C.successDim, C.white05]} style={s.successOrb}>
          <Ionicons name="checkmark-circle" size={64} color={C.success} />
        </LinearGradient>
      </Animated.View>

      <Text style={s.stateTitle}>Connexion Réussie !</Text>
      <Text style={s.stateSub}>Votre télévision est maintenant connectée</Text>

      {/* Device card */}
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
        style={s.deviceCard}
      >
        <View style={s.deviceRow}>
          <View style={s.deviceIconWrap}>
            <Ionicons name="tv-outline" size={20} color={C.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.deviceLabel}>Télévision connectée</Text>
            <Text style={s.deviceName}>{connectedDevice?.name}</Text>
          </View>
          <View style={s.deviceStatusDot} />
        </View>
      </LinearGradient>

      <View style={s.redirectRow}>
        <ActivityIndicator
          size="small"
          color={C.cyan}
          style={{ marginRight: 8 }}
        />
        <Text style={s.redirectText}>Redirection dans 3 secondes…</Text>
      </View>
    </View>
  );

  // ─── Help ─────────────────────────────────────────────────────────────────
  const renderHelp = () => (
    <LinearGradient
      colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
      style={s.helpCard}
    >
      <View style={s.helpHeader}>
        <Ionicons name="help-circle-outline" size={16} color={C.white60} />
        <Text style={s.helpTitle}>Besoin d'aide ?</Text>
      </View>
      {[
        {
          q: "Où trouver le code ?",
          a: "Le code s'affiche sur l'écran de votre TV dans l'application de connexion.",
        },
        {
          q: "Le code ne fonctionne pas ?",
          a: "Vérifiez que la TV et le téléphone sont connectés à internet.",
        },
      ].map((item, i) => (
        <View key={i} style={[s.helpItem, i > 0 && s.helpItemBorder]}>
          <Text style={s.helpQ}>{item.q}</Text>
          <Text style={s.helpA}>{item.a}</Text>
        </View>
      ))}
    </LinearGradient>
  );

  // ─── Root ─────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            disabled={status === "connecting"}
          >
            <Ionicons name="arrow-back-outline" size={18} color={C.white60} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Connecter la TV</Text>
            <Text style={s.headerSub}>Appairage sécurisé · RDS Screen</Text>
          </View>

          {/* Secure badge */}
          <View style={s.secureBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={C.success}
            />
          </View>
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {status === "idle" || status === "error" ? renderCodeInput() : null}
            {status === "connecting" ? renderConnecting() : null}
            {status === "success" ? renderSuccess() : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const DIGIT_SIZE = Math.floor((width - 80) / 9) - 6;

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingBottom: 50, paddingTop: 8 },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.white },
  headerSub: { fontSize: 12, color: C.white40, marginTop: 2 },
  secureBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: C.successBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Hero Card ──
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cyanBorder,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.white,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 14,
    color: C.white40,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },

  // ── Digits ──
  digitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
    gap: 4,
    marginBottom: 20,
  },
  digitBox: {
    width: DIGIT_SIZE,
    height: DIGIT_SIZE + 10,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  digitText: { fontSize: 18, fontWeight: "700", color: C.white40 },
  digitFilled: { color: C.white },
  digitError: { color: C.error },
  cursor: {
    position: "absolute",
    bottom: 8,
    width: 2,
    height: 16,
    backgroundColor: C.cyan,
    borderRadius: 1,
  },
  digitSep: {
    width: 8,
    height: 2,
    backgroundColor: C.border,
    borderRadius: 1,
    marginHorizontal: 2,
  },

  // ── Progress ──
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: C.white05,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: {
    fontSize: 11,
    color: C.white40,
    marginTop: 8,
    letterSpacing: 0.4,
  },

  // ── Error ──
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.errorDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.errorBorder,
    padding: 14,
    marginBottom: 14,
  },
  errorIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,82,82,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { flex: 1, fontSize: 13, color: C.white80, fontWeight: "500" },
  errorRetryBtn: {
    backgroundColor: C.errorBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  errorRetryText: { fontSize: 12, color: C.error, fontWeight: "700" },

  // ── CTA ──
  ctaWrap: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    flex: 1,
    textAlign: "center",
  },
  ctaWrapDisabled: {
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  ctaDisabledText: { fontSize: 13, color: C.white40 },

  // ── Help ──
  helpCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 10,
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.white60,
    letterSpacing: 0.3,
  },
  helpItem: { paddingVertical: 12 },
  helpItemBorder: { borderTopWidth: 1, borderTopColor: C.border },
  helpQ: { fontSize: 14, fontWeight: "700", color: C.cyan, marginBottom: 5 },
  helpA: { fontSize: 13, color: C.white40, lineHeight: 19 },

  // ── State center (connecting / success) ──
  stateCenter: {
    minHeight: height * 0.72,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 6,
  },

  // Connecting orbs
  orbOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(0,229,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  orbMid: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,229,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  orbInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.cyanDim,
    borderWidth: 1.5,
    borderColor: C.cyanBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  stateTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.3,
  },
  stateSub: { fontSize: 14, color: C.white40, textAlign: "center" },

  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.cyanDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepText: { fontSize: 13, color: C.cyan, fontWeight: "600" },

  tipsCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 10,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.white60,
    letterSpacing: 0.3,
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tipText: { fontSize: 13, color: C.white40 },

  // Success
  successOrb: {
    width: 120,
    height: 120,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.successBorder,
  },
  deviceCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: C.successBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceLabel: {
    fontSize: 11,
    color: C.white40,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  deviceName: { fontSize: 16, fontWeight: "700", color: C.white },
  deviceStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.success,
  },

  redirectRow: { flexDirection: "row", alignItems: "center" },
  redirectText: { fontSize: 13, color: C.white40, fontStyle: "italic" },
});

export default TVConnectScreen;
