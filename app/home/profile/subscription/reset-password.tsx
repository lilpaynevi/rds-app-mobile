import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "@/scripts/fetch.api";

const { width, height } = Dimensions.get("window");

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  accent: "#4F8EF7",
  accentDark: "#2D6BE4",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.30)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.10)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.12)",
  successBorder: "rgba(0,230,118,0.35)",
  error: "#FF5252",
  errorDim: "rgba(255,82,82,0.12)",
  errorBorder: "rgba(255,82,82,0.35)",
  warning: "#FFB74D",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
};

// ─── Hook animation d'entrée ─────────────────────────────────────────────────
const useEntrance = (delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, transform: [{ translateY }] };
};

// ─── Strength bar animée ─────────────────────────────────────────────────────
const StrengthBar = ({ password }: { password: string }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  const getStrength = () => {
    if (!password) return { level: 0, color: C.border, label: "" };
    if (password.length < 6)
      return { level: 1, color: C.error, label: "Trop court" };
    if (password.length < 8)
      return { level: 2, color: C.warning, label: "Moyen" };
    if (password.length < 10)
      return { level: 3, color: C.accent, label: "Bon" };
    return { level: 4, color: C.success, label: "Fort 💪" };
  };

  const { level, color, label } = getStrength();

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: level / 4,
      tension: 60,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [password]);

  if (!password) return null;

  return (
    <View style={sb.wrapper}>
      <View style={sb.track}>
        <Animated.View
          style={[
            sb.fill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={[sb.label, { color }]}>{label}</Text>
    </View>
  );
};

const sb = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: C.white10,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
  label: { fontSize: 11, fontWeight: "700", minWidth: 60, textAlign: "right" },
});

// ─── Composant Input ─────────────────────────────────────────────────────────
interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secure: boolean;
  showToggle: boolean;
  onToggle: () => void;
  status?: "idle" | "success" | "error";
  hint?: string;
}

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  secure,
  showToggle,
  onToggle,
  status = "idle",
  hint,
}: InputFieldProps) => {
  const focusAnim = useRef(new Animated.Value(0)).current;

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      status === "success"
        ? C.successBorder
        : status === "error"
          ? C.errorBorder
          : C.border,
      C.accent,
    ],
  });

  const handleFocus = () =>
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  const handleBlur = () =>
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

  const iconColor =
    status === "success" ? C.success : status === "error" ? C.error : C.white40;
  const iconName =
    status === "success"
      ? "checkmark-circle"
      : status === "error"
        ? "close-circle"
        : "lock-closed-outline";

  return (
    <View style={inf.container}>
      <Text style={inf.label}>{label}</Text>
      <Animated.View style={[inf.inputWrapper, { borderColor }]}>
        {/* Left icon */}
        <View style={inf.leftIcon}>
          <Ionicons name={iconName as any} size={16} color={iconColor} />
        </View>

        <TextInput
          style={inf.input}
          placeholder={placeholder}
          placeholderTextColor={C.white40}
          secureTextEntry={secure}
          value={value}
          onChangeText={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Right eye toggle */}
        <TouchableOpacity
          onPress={onToggle}
          style={inf.eyeBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={(showToggle ? "eye" : "eye-off") as any}
            size={18}
            color={C.white40}
          />
        </TouchableOpacity>
      </Animated.View>

      {hint && (
        <Text
          style={[
            inf.hint,
            {
              color:
                status === "success"
                  ? C.success
                  : status === "error"
                    ? C.error
                    : C.white40,
            },
          ]}
        >
          {hint}
        </Text>
      )}
    </View>
  );
};

const inf = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: C.white60,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white05,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  leftIcon: { paddingLeft: 14, paddingRight: 4 },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 8,
    fontSize: 15,
    color: C.white,
    fontWeight: "500",
  },
  eyeBtn: { padding: 14 },
  hint: { marginTop: 6, fontSize: 12, fontWeight: "500" },
});

// ─── Requirement Row ─────────────────────────────────────────────────────────
const Req = ({ ok, text }: { ok: boolean; text: string }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    }}
  >
    <Ionicons
      name={ok ? "checkmark-circle" : "ellipse-outline"}
      size={15}
      color={ok ? C.success : C.white40}
    />
    <Text
      style={{
        fontSize: 13,
        color: ok ? C.success : C.white40,
        fontWeight: ok ? "600" : "400",
      }}
    >
      {text}
    </Text>
  </View>
);

// ─── Loading Screen ──────────────────────────────────────────────────────────
const LoadingScreen = () => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        <StatusBar barStyle="light-content" />
        <View style={ls.ring}>
          <ActivityIndicator size={36} color={C.accent} />
        </View>
        <Text style={ls.title}>Vérification du lien</Text>
        <Text style={ls.sub}>Validation de votre token de sécurité...</Text>
        <View style={ls.pill}>
          <View style={ls.dot} />
          <Text style={ls.pillText}>Connexion sécurisée</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const ls = StyleSheet.create({
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.accentDim,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  title: { fontSize: 22, fontWeight: "700", color: C.white },
  sub: { fontSize: 14, color: C.white40, textAlign: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.successDim,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.successBorder,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  pillText: { fontSize: 12, color: C.success, fontWeight: "600" },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const headerAnim = useEntrance(0);
  const formAnim = useEntrance(120);
  const reqAnim = useEntrance(220);

  // ── Token validation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (token) validateToken(token);
    else {
      setIsValidatingToken(false);
      router.replace("/home");
    }
  }, [token]);

  const validateToken = async (t: string) => {
    try {
      const res = await api.post("/auth/validate-reset-token", { token: t });
      setTokenValid(res.data.valid);
      if (!res.data.valid)
        router.replace("/home/profile/subscription/forgot-password");
    } catch {
      router.replace("/auth/login");
    } finally {
      setIsValidatingToken(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;
  const passwordLongEnough = password.length >= 6;
  const canSubmit = passwordsMatch && passwordLongEnough && !isLoading;

  const handleResetPassword = async () => {
    if (!canSubmit) return;
    try {
      setIsLoading(true);
      await api.post("/auth/reset-password", { token, password });
      setSubmitSuccess(true);
      setTimeout(() => router.replace("/auth/login"), 2000);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Une erreur est survenue";
      // inline error instead of Alert
      console.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (isValidatingToken) return <LoadingScreen />;
  if (!tokenValid) return null;

  // ── Success State ──────────────────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <LinearGradient
        colors={[C.bgDeep, C.bgMid, "#0D1B4B"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            padding: 24,
          }}
        >
          <StatusBar barStyle="light-content" />
          <View
            style={[
              ls.ring,
              {
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: C.successDim,
                borderColor: C.successBorder,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={48} color={C.success} />
          </View>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: C.white,
              textAlign: "center",
            }}
          >
            Mot de passe modifié !
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: C.white40,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            Votre mot de passe a été mis à jour.{"\n"}Redirection en cours...
          </Text>
          <ActivityIndicator color={C.accent} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={s.container}>
            {/* ── Header ────────────────────────────────────────────────── */}
            <Animated.View style={[s.header, headerAnim]}>
              {/* Orb décoratif */}
              <View style={s.orb} />

              <LinearGradient
                colors={["rgba(79,142,247,0.18)", "rgba(79,142,247,0.04)"]}
                style={s.headerCard}
              >
                <View style={s.headerIconWrapper}>
                  <LinearGradient
                    colors={[C.accent, C.accentDark]}
                    style={s.headerIconGradient}
                  >
                    <Ionicons name="lock-closed" size={26} color={C.white} />
                  </LinearGradient>
                </View>
                <Text style={s.title}>Nouveau mot de passe</Text>
                <Text style={s.subtitle}>
                  Choisissez un mot de passe sécurisé pour protéger votre compte
                </Text>
                {/* Badge */}
                <View style={s.secureBadge}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={13}
                    color={C.success}
                  />
                  <Text style={s.secureBadgeText}>
                    Connexion chiffrée · TLS 1.3
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* ── Form ──────────────────────────────────────────────────── */}
            <Animated.View style={[s.formCard, formAnim]}>
              <InputField
                label="Nouveau mot de passe"
                value={password}
                onChange={setPassword}
                placeholder="Minimum 6 caractères"
                secure={!showPassword}
                showToggle={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                status={
                  password.length === 0
                    ? "idle"
                    : password.length < 6
                      ? "error"
                      : "success"
                }
              />
              <StrengthBar password={password} />

              <View style={{ marginTop: 4 }} />

              <InputField
                label="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Répétez votre mot de passe"
                secure={!showConfirmPassword}
                showToggle={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
                status={
                  confirmPassword.length === 0
                    ? "idle"
                    : passwordsMatch
                      ? "success"
                      : "error"
                }
                hint={
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? "✓ Les mots de passe correspondent"
                      : "✗ Les mots de passe ne correspondent pas"
                    : undefined
                }
              />
            </Animated.View>

            {/* ── Requirements ──────────────────────────────────────────── */}
            <Animated.View style={[s.reqCard, reqAnim]}>
              <View style={s.reqHeader}>
                <Ionicons name="shield-outline" size={14} color={C.accent} />
                <Text style={s.reqTitle}>Exigences de sécurité</Text>
              </View>
              <Req ok={passwordLongEnough} text="Au moins 6 caractères" />
              <Req ok={passwordsMatch} text="Les mots de passe correspondent" />
            </Animated.View>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <Animated.View style={[{ gap: 8 }, reqAnim]}>
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={!canSubmit}
                activeOpacity={0.85}
                style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
              >
                <LinearGradient
                  colors={
                    canSubmit
                      ? [C.accent, C.accentDark]
                      : [C.white10, C.white10]
                  }
                  style={s.submitBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color={C.white} size={20} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={canSubmit ? C.white : C.white40}
                      />
                      <Text
                        style={[
                          s.submitBtnText,
                          !canSubmit && { color: C.white40 },
                        ]}
                      >
                        Réinitialiser le mot de passe
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.backBtn}
                onPress={() => router.replace("/auth/login")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={15}
                  color={C.white40}
                />
                <Text style={s.backBtnText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: "center",
    gap: 12,
  },

  // ── Header Card ──
  header: { position: "relative" },
  orb: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(79,142,247,0.06)",
  },
  headerCard: {
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.accentBorder,
    gap: 8,
    overflow: "hidden",
  },
  headerIconWrapper: { marginBottom: 4 },
  headerIconGradient: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: C.white40,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.successDim,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.successBorder,
    marginTop: 4,
  },
  secureBadgeText: { fontSize: 11, color: C.success, fontWeight: "600" },

  // ── Form Card ──
  formCard: {
    backgroundColor: C.white05,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },

  // ── Requirements Card ──
  reqCard: {
    backgroundColor: C.white05,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  reqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  reqTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.white60,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Submit ──
  submitBtn: {
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.2,
  },

  // ── Back ──
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  backBtnText: { fontSize: 13, color: C.white40, fontWeight: "500" },
});
