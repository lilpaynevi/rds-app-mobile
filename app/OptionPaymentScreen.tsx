// components/AddScreenScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TextInput,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/scripts/AuthContext";
import { createSession } from "@/requests/stripe.requests";

const { width } = Dimensions.get("window");

// ─── Palette (same as HomeScreen) ────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  bgCard: "rgba(255,255,255,0.05)",
  accent: "#4F8EF7",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.28)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.10)",
  cyanBorder: "rgba(0,229,255,0.25)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.12)",
  successBorder: "rgba(0,230,118,0.28)",
  error: "#FF5252",
  errorDim: "rgba(255,82,82,0.12)",
  errorBorder: "rgba(255,82,82,0.28)",
  warning: "#FFB74D",
  warningDim: "rgba(255,183,77,0.12)",
  warningBorder: "rgba(255,183,77,0.28)",
  purple: "#7C4DFF",
  purpleDim: "rgba(124,77,255,0.12)",
  purpleBorder: "rgba(124,77,255,0.28)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

const AddScreenScreen = () => {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { user, subscription } = useAuth();

  const screenOption = {
    id: "additional-screen",
    name: "Écran Supplémentaire",
    description: "Ajoutez des écrans supplémentaires à votre abonnement existant",
    priceId: "price_additional_screen_monthly",
    price: 5,
    currency: "€",
    period: "HT/mois",
    billedText: "Facturation mensuelle",
    maxAdditional: 10,
  };

  const handleAddScreen = async () => {
    try {
      setLoading(true);
      const response = await createSession(
        "price_1S7OvoAQxGgWdn2vEKo3nksD",
        "prod_T3VxhrYWMoBxlt",
        {
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          quantity,
        }
      );
      console.log("🚀 ~ handleAddScreen ~ response:", response);
      return response;
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const incrementQuantity = () => {
    const additionalScreens = subscription[0].additionalScreens || 0;
    const maxPossible = screenOption.maxAdditional - additionalScreens;
    if (quantity < maxPossible) setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleQuantityChange = (text: string) => {
    const numValue = parseInt(text) || 0;
    const additionalScreens = subscription[0].additionalScreens || 0;
    const maxPossible = screenOption.maxAdditional - additionalScreens;
    if (numValue >= 1 && numValue <= maxPossible) setQuantity(numValue);
  };

  const currentScreens = subscription[0].currentMaxScreens
    ? subscription[0].currentMaxScreens
    : 5;
  const additionalScreens = subscription[0].additionalScreens || 0;
  const totalScreens = currentScreens + additionalScreens;
  const maxPossible = screenOption.maxAdditional - additionalScreens;
  const canAddMore = quantity <= maxPossible && maxPossible > 0;

  const totalPrice = quantity * screenOption.price;
  const newAdditionalTotal = additionalScreens + quantity;
  const newTotalScreens = totalScreens + quantity;
  const newMonthlyCost = newAdditionalTotal * screenOption.price;

  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" color={C.white80} size={18} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <LinearGradient
                colors={[C.cyanDim, C.white05]}
                style={styles.headerIconContainer}
              >
                <Ionicons name="tv-outline" size={36} color={C.cyan} />
              </LinearGradient>
              <Text style={styles.title}>Ajouter des Écrans</Text>
              <Text style={styles.subtitle}>
                Étendez votre expérience avec des écrans supplémentaires
              </Text>
            </View>
          </View>

          {/* ── Current Status ── */}
          <View style={styles.section}>
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[styles.card, { borderColor: C.accentBorder }]}
            >
              <Text style={styles.cardTitle}>Votre Abonnement Actuel</Text>
              <View style={styles.statusGrid}>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusNumber, { color: C.accent }]}>
                    {currentScreens}
                  </Text>
                  <Text style={styles.statusLabel}>Écrans inclus</Text>
                </View>
              </View>

              {additionalScreens > 0 && (
                <View
                  style={[
                    styles.infoRow,
                    { backgroundColor: C.purpleDim, borderColor: C.purpleBorder },
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={14} color={C.purple} />
                  <Text style={[styles.infoRowText, { color: C.purple }]}>
                    {additionalScreens} × 5€ = {additionalScreens * 5}€/mois en options
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* ── Quantity Selector ── */}
          <View style={styles.section}>
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[styles.card, { borderColor: C.border }]}
            >
              <Text style={styles.cardTitle}>Nombre d'écrans à ajouter</Text>
              <Text style={styles.cardSubtitle}>
                Maximum possible : {maxPossible} écran{maxPossible > 1 ? "s" : ""}
              </Text>

              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    quantity <= 1 && styles.quantityButtonDisabled,
                  ]}
                  onPress={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Text
                    style={[
                      styles.quantityButtonText,
                      quantity <= 1 && styles.quantityButtonTextDisabled,
                    ]}
                  >
                    −
                  </Text>
                </TouchableOpacity>

                <View style={styles.quantityInputContainer}>
                  <TextInput
                    style={styles.quantityInput}
                    value={quantity.toString()}
                    onChangeText={handleQuantityChange}
                    keyboardType="numeric"
                    textAlign="center"
                    maxLength={2}
                    placeholderTextColor={C.white40}
                  />
                  <Text style={styles.quantityUnit}>
                    écran{quantity > 1 ? "s" : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    quantity >= maxPossible && styles.quantityButtonDisabled,
                  ]}
                  onPress={incrementQuantity}
                  disabled={quantity >= maxPossible}
                >
                  <Text
                    style={[
                      styles.quantityButtonText,
                      quantity >= maxPossible && styles.quantityButtonTextDisabled,
                    ]}
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* ── Option Card ── */}
          <View style={styles.section}>
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[styles.card, { borderColor: C.purpleBorder }]}
            >
              {/* Header */}
              <View style={styles.optionHeader}>
                <LinearGradient
                  colors={[C.purpleDim, "rgba(0,0,0,0)"]}
                  style={[styles.optionIconContainer, { borderColor: C.purpleBorder }]}
                >
                  <Ionicons name="add-circle-outline" size={26} color={C.purple} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{screenOption.name}</Text>
                  <Text style={styles.optionDescription}>
                    {screenOption.description}
                  </Text>
                </View>
              </View>

              {/* Prix */}
              <View
                style={[
                  styles.priceContainer,
                  { backgroundColor: C.purpleDim, borderColor: C.purpleBorder },
                ]}
              >
                <View style={styles.priceRow}>
                  <Text style={[styles.currency, { color: C.purple }]}>
                    {screenOption.currency}
                  </Text>
                  <Text style={[styles.price, { color: C.purple }]}>{totalPrice}</Text>
                  <View style={styles.periodContainer}>
                    <Text style={styles.period}>{screenOption.period}</Text>
                    <Text style={styles.billedText}>{screenOption.billedText}</Text>
                  </View>
                </View>
                <Text style={styles.priceNote}>
                  {quantity} écran{quantity > 1 ? "s" : ""} × {screenOption.price}€ ={" "}
                  {totalPrice}€/mois
                </Text>
              </View>

              {/* Calcul */}
              <View
                style={[
                  styles.calculationContainer,
                  { backgroundColor: C.warningDim, borderColor: C.warningBorder },
                ]}
              >
                <Text style={[styles.calculationTitle, { color: C.warning }]}>
                  Après ajout de {quantity} écran{quantity > 1 ? "s" : ""} :
                </Text>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Écrans totaux :</Text>
                  <Text style={[styles.calculationValue, { color: C.warning }]}>
                    {newTotalScreens}
                  </Text>
                </View>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Coût mensuel supplémentaire :</Text>
                  <Text style={[styles.calculationValue, { color: C.accent }]}>
                    +{totalPrice}€/mois
                  </Text>
                </View>
                <View
                  style={[
                    styles.calculationRow,
                    {
                      marginBottom: 0,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: C.warningBorder,
                    },
                  ]}
                >
                  <Text style={[styles.calculationLabel, { fontWeight: "700" }]}>
                    Nouveau coût total des options :
                  </Text>
                  <Text style={[styles.calculationValue, { color: C.purple, fontSize: 16 }]}>
                    {newMonthlyCost}€/mois
                  </Text>
                </View>
              </View>

              {/* Warning limite */}
              {maxPossible <= 0 && (
                <View
                  style={[
                    styles.warningContainer,
                    { backgroundColor: C.errorDim, borderColor: C.errorBorder },
                  ]}
                >
                  <Ionicons name="warning-outline" size={20} color={C.error} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.warningTitle, { color: C.error }]}>
                      Limite atteinte
                    </Text>
                    <Text style={[styles.warningText, { color: C.white60 }]}>
                      Vous avez atteint le maximum de {screenOption.maxAdditional}{" "}
                      écrans supplémentaires. Contactez notre support pour des
                      besoins spécifiques.
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* ── CTA Button ── */}
          <View style={styles.section}>
            <TouchableOpacity
              onPress={handleAddScreen}
              disabled={!canAddMore || loading}
              activeOpacity={0.85}
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={
                  !canAddMore || loading
                    ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)"]
                    : [C.cyan, C.accent]
                }
                style={styles.addButton}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color={C.white} size="small" />
                    <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                      Ajout en cours…
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={!canAddMore ? C.white40 : C.white}
                    />
                    <View style={{ marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.buttonText,
                          { color: !canAddMore ? C.white40 : C.white },
                        ]}
                      >
                        Ajouter {quantity} écran{quantity > 1 ? "s" : ""} — {totalPrice}€/mois
                      </Text>
                      <Text
                        style={[
                          styles.buttonSubtext,
                          { color: !canAddMore ? C.white20 : C.white60 },
                        ]}
                      >
                        Paiement sécurisé · Activation instantanée
                      </Text>
                    </View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingTop: 8, paddingBottom: 50 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.white80,
  },
  headerContent: {
    alignItems: "center",
    gap: 10,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.cyanBorder,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.white,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: C.white40,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  // Generic card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 13,
    color: C.white40,
    textAlign: "center",
    marginTop: -8,
  },

  // Info row (pill inside card)
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoRowText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Status
  statusGrid: {
    flexDirection: "row",
    justifyContent: "center",
  },
  statusItem: {
    alignItems: "center",
  },
  statusNumber: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  statusLabel: {
    fontSize: 11,
    color: C.white40,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },

  // Quantity
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  quantityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: C.border,
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: "600",
    color: C.accent,
  },
  quantityButtonTextDisabled: {
    color: C.white20,
  },
  quantityInputContainer: {
    alignItems: "center",
    minWidth: 80,
  },
  quantityInput: {
    fontSize: 36,
    fontWeight: "800",
    color: C.white,
    textAlign: "center",
    minWidth: 60,
    paddingVertical: 4,
  },
  quantityUnit: {
    fontSize: 13,
    color: C.white40,
    fontWeight: "500",
    marginTop: 2,
  },

  // Option Card internals
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  optionIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionName: {
    fontSize: 17,
    fontWeight: "700",
    color: C.white,
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 13,
    color: C.white40,
    lineHeight: 17,
  },

  // Price
  priceContainer: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  currency: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 5,
    marginRight: 2,
  },
  price: {
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
    letterSpacing: -1,
  },
  periodContainer: {
    marginLeft: 8,
    marginTop: 8,
  },
  period: {
    fontSize: 15,
    fontWeight: "600",
    color: C.white60,
  },
  billedText: {
    fontSize: 11,
    color: C.white40,
    marginTop: 2,
  },
  priceNote: {
    fontSize: 12,
    color: C.white40,
    fontStyle: "italic",
  },

  // Calculation
  calculationContainer: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calculationLabel: {
    fontSize: 13,
    color: C.white60,
    flex: 1,
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: "600",
    color: C.white80,
  },

  // Warning
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white,
  },
  buttonSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default AddScreenScreen;
