import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import api from "@/scripts/fetch.api";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.49:3000";

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

  useEffect(() => {
    if (token) {
      console.log("🚀 ~ ResetPasswordScreen ~ token:", token);

      validateToken(token);
    } else {
      setIsValidatingToken(false);
      Alert.alert("Erreur", "Aucun token fourni", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    }
  }, [token]);

  // Valider le token
  const validateToken = async (tokenToValidate: string) => {
    try {
      setIsValidatingToken(true);

      const response = await api.post(
        `/auth/validate-reset-token`,
        {
          token: tokenToValidate,
        }
      );

      if (response.data.valid) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        Alert.alert(
          "Token invalide",
          "Ce lien de réinitialisation est invalide ou a expiré.",
          [
            {
              text: "Demander un nouveau lien",
              onPress: () =>
                router.replace("/home/profile/subscription/forgot-password"),
            },
            {
              text: "Annuler",
              onPress: () => router.replace("/auth/login"),
              style: "cancel",
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Erreur validation token:", error);
      setTokenValid(false);

      const errorMessage =
        error.response?.data?.message ||
        "Impossible de valider le token. Veuillez réessayer.";

      Alert.alert("Erreur", errorMessage, [
        { text: "OK", onPress: () => router.replace("/auth/login") },
      ]);
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Validation du mot de passe
  const validatePassword = () => {
    if (!password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return false;
    }

    if (password.length < 6) {
      Alert.alert(
        "Erreur",
        "Le mot de passe doit contenir au moins 6 caractères"
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return false;
    }

    return true;
  };

  // Réinitialiser le mot de passe
  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    try {
      setIsLoading(true);

      await api.post(`/auth/reset-password`, {
        token,
        password,
      });

      Alert.alert(
        "Succès ! 🎉",
        "Votre mot de passe a été réinitialisé avec succès.",
        [
          {
            text: "Se connecter",
            onPress: () => router.replace("/auth/login"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Erreur reset password:", error.response?.data || error);

      const errorMessage =
        error.response?.data?.message ||
        "Une erreur est survenue lors de la réinitialisation";

      Alert.alert("Erreur", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Indicateur de validité du mot de passe
  const passwordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { color: "#ef4444", text: "Trop court" };
    if (password.length < 8) return { color: "#f59e0b", text: "Moyen" };
    return { color: "#10b981", text: "Fort" };
  };

  // Afficher le loader pendant la validation
  if (isValidatingToken) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Validation du lien...</Text>
      </View>
    );
  }

  // Si le token n'est pas valide
  if (!tokenValid) {
    return null;
  }

  const strength = passwordStrength();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={60} color="#667eea" />
            </View>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Choisissez un mot de passe sécurisé pour votre compte
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Nouveau mot de passe */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Entrez votre nouveau mot de passe"
                  placeholderTextColor="#a0aec0"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#718096"
                  />
                </TouchableOpacity>
              </View>
              {strength && (
                <View style={styles.strengthContainer}>
                  <View
                    style={[
                      styles.strengthBar,
                      { backgroundColor: strength.color },
                    ]}
                  />
                  <Text
                    style={[styles.strengthText, { color: strength.color }]}
                  >
                    {strength.text}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirmer mot de passe */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirmez votre mot de passe"
                  placeholderTextColor="#a0aec0"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#718096"
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword && password !== confirmPassword && (
                <Text style={styles.errorText}>
                  <Ionicons name="close-circle" size={14} color="#ef4444" /> Les
                  mots de passe ne correspondent pas
                </Text>
              )}
              {confirmPassword && password === confirmPassword && (
                <Text style={styles.successText}>
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />{" "}
                  Les mots de passe correspondent
                </Text>
              )}
            </View>

            {/* Exigences */}
            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>
                <Ionicons name="information-circle" size={16} color="#4a5568" />{" "}
                Exigences du mot de passe :
              </Text>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={
                    password.length >= 6
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={16}
                  color={password.length >= 6 ? "#10b981" : "#cbd5e0"}
                />
                <Text
                  style={[
                    styles.requirementText,
                    password.length >= 6 && styles.requirementValid,
                  ]}
                >
                  Au moins 6 caractères
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name={
                    password && confirmPassword && password === confirmPassword
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={16}
                  color={
                    password && confirmPassword && password === confirmPassword
                      ? "#10b981"
                      : "#cbd5e0"
                  }
                />
                <Text
                  style={[
                    styles.requirementText,
                    password &&
                      confirmPassword &&
                      password === confirmPassword &&
                      styles.requirementValid,
                  ]}
                >
                  Les mots de passe correspondent
                </Text>
              </View>
            </View>

            {/* Bouton de soumission */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    Réinitialiser le mot de passe
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Retour */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/auth/login")}
            >
              <Ionicons name="arrow-back" size={16} color="#667eea" />
              <Text style={styles.backButtonText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7fafc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4a5568",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#edf2f7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 8,
  },
  passwordWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    color: "#1a202c",
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  strengthBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: "#ef4444",
  },
  successText: {
    marginTop: 6,
    fontSize: 13,
    color: "#10b981",
  },
  requirements: {
    backgroundColor: "#edf2f7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: "#718096",
    marginLeft: 8,
  },
  requirementValid: {
    color: "#10b981",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#667eea",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  backButtonText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});
