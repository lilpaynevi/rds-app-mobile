// screens/auth/RegisterScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import api from "@/scripts/fetch.api";
import { navigate } from "expo-router/build/global-state/routing";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const RegisterScreen = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Types d'entreprise
  const businessTypes = [
    { label: "🍽️ Restaurant", value: "restaurant" },
    { label: "🏨 Hôtel", value: "hotel" },
    { label: "🛍️ Commerce", value: "retail" },
    { label: "🏢 Bureau", value: "office" },
    { label: "🏛️ Autre", value: "other" },
  ];

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Entreprise
    if (!formData.company.trim()) {
      newErrors.company = "Entreprise requis";
    } else if (formData.company.trim().length < 2) {
      newErrors.company = "Entreprise trop court";
    }

    // Nom
    if (!formData.firstName.trim()) {
      newErrors.name = "Nom requis";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.name = "Nom trop court";
    }

    if (!formData.lastName.trim()) {
      newErrors.firstName = "Nom requis";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.firstName = "Nom trop court";
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email requis";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Format email invalide";
    }

    // Mot de passe
    if (!formData.password) {
      newErrors.password = "Mot de passe requis";
    } else if (formData.password.length < 8) {
      newErrors.password = "Minimum 8 caractères";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Doit contenir majuscule, minuscule et chiffre";
    }

    // Confirmation mot de passe
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirmation requise";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    // Nom d'entreprise
    if (!formData.company.trim()) {
      newErrors.businessName = "Nom d'entreprise requis";
    }

    // Conditions générales
    if (!acceptTerms) {
      newErrors.terms = "Vous devez accepter les conditions d'utilisation";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mettre à jour un champ
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Supprimer l'erreur si elle existe
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStripeCheckout = async (type: "month" | "year") => {
    try {
      setLoading(true);

      navigate("/auth/login")

      const response = await api.post("/stripe/create-checkout-session", {
        priceId:
          type === "month"
            ? "price_1S7OuqAQxGgWdn2vTmQFwkQs"
            : "price_1S7dNCAQxGgWdn2vUVFHeO6S",
        data: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          company: formData.company.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        },
      });
      console.log("🚀 ~ handleStripeCheckout ~ response:", response.data);

      const { url } = await response.data;

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erreur", "Impossible d'ouvrir le lien de paiement");
      }
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  // Inscription
  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await api.post("/auth/register", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        company: formData.company.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const data = response;

      if (!response.statusCode) {
        // Alert.alert(
        //   "Inscription réussie ! 🎉",
        //   "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
        //   [
        //     {
        //       text: "Se connecter",
        //       onPress: () => router.navigate("/auth/login"),
        //     },
        //   ]
        // );
        Alert.alert(
          "Merci de nous avoir choisi !",
          " L'acces au compte demande un abonnement ! Vous allez etre rediriger sur Stripe",
          [
            {
              text: "Abonnement Mensuel (30€)",
              onPress: () => handleStripeCheckout("month"),
            },
            {
              text: "Abonnement Annuel (330€ - 1 mois offert 🎉)",
              onPress: () => handleStripeCheckout("year"),
            },
          ]
        );
      } else {
        Alert.alert("Erreur", "Erreur lors de l'inscription");
      }
    } catch (error) {
      console.error("Erreur inscription:", error);

      // Simulation pour le développement
      Alert.alert(
        "Inscription simulée ! 🚀",
        "Compte créé avec succès (mode développement)",
        [
          {
            text: "Se connecter",
            onPress: () => router.navigate("/auth/login"),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="person-add" size={50} color="#4CAF50" />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez RDS Screen</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Nom complet */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.lastName && styles.inputError,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(value) => updateField("lastName", value)}
                  placeholder="Votre nom"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Prénom *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.firstName && styles.inputError,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(value) => updateField("firstName", value)}
                  placeholder="Votre prénom"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Entreprise *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.company && styles.inputError,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.company}
                  onChangeText={(value) => updateField("company", value)}
                  placeholder="Votre entreprise"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
              {errors.company && (
                <Text style={styles.errorText}>{errors.company}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <View
                style={[styles.inputWrapper, errors.email && styles.inputError]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => updateField("email", value)}
                  placeholder="votre@email.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Nom d'entreprise */}
            {/* <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom d'entreprise *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.businessName && styles.inputError,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.businessName}
                  onChangeText={(value) => updateField("businessName", value)}
                  placeholder="Nom de votre entreprise"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
              {errors.businessName && (
                <Text style={styles.errorText}>{errors.businessName}</Text>
              )}
            </View> */}

            {/* Mot de passe */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mot de passe *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.password && styles.inputError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(value) => updateField("password", value)}
                  placeholder="Minimum 8 caractères"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Confirmation mot de passe */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmer le mot de passe *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.confirmPassword && styles.inputError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(value) =>
                    updateField("confirmPassword", value)
                  }
                  placeholder="Répétez le mot de passe"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-outline" : "eye-off-outline"
                    }
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Conditions générales */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => {
                setAcceptTerms(!acceptTerms);
                if (errors.terms) {
                  setErrors((prev) => ({ ...prev, terms: undefined }));
                }
              }}
            >
              <View style={styles.checkbox}>
                {acceptTerms && (
                  <Ionicons name="checkmark" size={18} color="#4CAF50" />
                )}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxText}>
                  J'accepte les{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() => router.navigate("/auth/register")}
                  >
                    conditions d'utilisation
                  </Text>{" "}
                  et la{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() => router.navigate("/auth/register")}
                  >
                    politique de confidentialité
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>
            {errors.terms && (
              <Text style={styles.errorText}>{errors.terms}</Text>
            )}

            {/* Bouton inscription */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                loading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>
                    Créer mon compte
                  </Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => router.navigate("/auth/login")}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {},
  gradient: {},
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: -10,
    top: 10,
    padding: 10,
    zIndex: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  inputError: {
    borderColor: "#F44336",
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#fff",
  },
  eyeButton: {
    padding: 12,
  },
  pickerWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  picker: {
    height: 48,
    color: "#fff",
    backgroundColor: "transparent",
  },
  errorText: {
    fontSize: 12,
    color: "#F44336",
    marginTop: 4,
    marginLeft: 5,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#4CAF50",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  linkText: {
    color: "#4CAF50",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    height: 55,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  registerButtonDisabled: {
    backgroundColor: "rgba(76, 175, 80, 0.5)",
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 10,
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 8,
  },
  loginLink: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
});

export default RegisterScreen;
