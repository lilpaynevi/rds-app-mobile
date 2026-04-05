// screens/ForgotPasswordScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { authResetPassword } from "@/requests/auth.requests";
import { router } from "expo-router";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  accent: "#4F8EF7",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.28)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.10)",
  cyanBorder: "rgba(0,229,255,0.25)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.12)",
  successBorder: "rgba(0,230,118,0.28)",
  warning: "#FFB74D",
  warningDim: "rgba(255,183,77,0.12)",
  warningBorder: "rgba(255,183,77,0.28)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert("Erreur", "Veuillez entrer votre adresse email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Erreur", "Veuillez entrer une adresse email valide");
      return;
    }
    try {
      setLoading(true);
      await authResetPassword(email.toLowerCase());
      setEmailSent(true);
    } catch {
      Alert.alert("Erreur", "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (emailSent) {
    return (
      <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={s.centered}>
          <LinearGradient
            colors={[C.successDim, C.white05]}
            style={s.successIconWrap}
          >
            <Ionicons name="mail-outline" size={48} color={C.success} />
          </LinearGradient>

          <Text style={s.successTitle}>Email envoyé !</Text>

          <Text style={s.successText}>
            Si un compte existe avec l'adresse{" "}
            <Text style={{ color: C.cyan, fontWeight: "700" }}>{email}</Text>,
            vous recevrez un lien pour réinitialiser votre mot de passe.
          </Text>

          <LinearGradient
            colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
            style={[s.infoBox, { borderColor: C.accentBorder }]}
          >
            <Ionicons name="information-circle-outline" size={18} color={C.accent} />
            <Text style={[s.infoText, { color: C.white60 }]}>
              Vérifiez également vos spams si vous ne trouvez pas l'email.
            </Text>
          </LinearGradient>

          <TouchableOpacity
            style={{ width: "100%", borderRadius: 14, overflow: "hidden" }}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[C.cyan, C.accent]} style={s.primaryBtn}>
              <Ionicons name="arrow-back" size={18} color={C.white} />
              <Text style={s.primaryBtnText}>Retour à la connexion</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.ghostBtn}
            onPress={() => setEmailSent(false)}
            activeOpacity={0.7}
          >
            <Text style={[s.ghostBtnText, { color: C.accent }]}>Renvoyer l'email</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Main screen ──
  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={C.white80} />
              <Text style={s.backBtnText}>Retour</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={s.header}>
              <LinearGradient
                colors={[C.accentDim, C.white05]}
                style={s.lockIconWrap}
              >
                <Ionicons name="lock-closed-outline" size={42} color={C.accent} />
              </LinearGradient>
              <Text style={s.title}>Mot de passe oublié ?</Text>
              <Text style={s.subtitle}>
                Pas de souci, nous allons vous envoyer un lien pour le réinitialiser.
              </Text>
            </View>

            {/* Form */}
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[s.card, { borderColor: C.accentBorder }]}
            >
              <View style={s.inputRow}>
                <Ionicons name="mail-outline" size={18} color={C.white40} style={{ marginRight: 10 }} />
                <TextInput
                  style={s.input}
                  placeholder="Votre adresse email"
                  placeholderTextColor={C.white20}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectionColor={C.accent}
                />
              </View>
            </LinearGradient>

            <TouchableOpacity
              style={[s.submitBtnWrap, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[C.cyan, C.accent]} style={s.submitBtn}>
                {loading ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <>
                    <Text style={s.submitBtnText}>Envoyer le lien</Text>
                    <Ionicons name="arrow-forward" size={18} color={C.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={14} color={C.accent} />
              <Text style={[s.ghostBtnText, { color: C.accent }]}>Retour à la connexion</Text>
            </TouchableOpacity>

            {/* Help box */}
            <LinearGradient
              colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
              style={[s.helpBox, { borderColor: C.border }]}
            >
              <Ionicons name="help-circle-outline" size={18} color={C.white40} />
              <Text style={s.helpText}>
                Besoin d'aide ? Contactez-nous à{" "}
                <Text style={{ color: C.accent, fontWeight: "600" }}>
                  rdsconnect.contact@gmail.com
                </Text>
              </Text>
            </LinearGradient>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },

  // Back button
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 6,
    marginBottom: 28,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.80)",
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 28,
    gap: 12,
  },
  lockIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(79,142,247,0.28)",
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.40)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Card / input
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
  },

  // Submit
  submitBtnWrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 6,
  },
  submitBtn: {
    flexDirection: "row",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Ghost button
  ghostBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Help box
  helpBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.40)",
    lineHeight: 19,
  },

  // Success
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.28)",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  successText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.60)",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    width: "100%",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: "row",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ForgotPasswordScreen;
