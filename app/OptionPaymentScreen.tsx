// components/AddScreenScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TextInput,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import api, { baseURL } from "@/scripts/fetch.api";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/scripts/AuthContext";
import { createSession } from "@/requests/stripe.requests";

const { width } = Dimensions.get("window");

const AddScreenScreen = () => {
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [quantity, setQuantity] = useState(1); // État pour la quantité
  const { user, subscription} = useAuth();

  // Configuration de l'option écran supplémentaire
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
          quantity
        }
      );
      console.log("🚀 ~ handleAddScreen ~ response:", response)
      return response

    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const FeatureItem = ({ icon, title, description }) => (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

  // Fonctions pour gérer la quantité
  const incrementQuantity = () => {
    const currentScreens = subscription[0].currentMaxScreens || 5;
    const additionalScreens = subscription[0].additionalScreens || 0;
    const maxPossible = screenOption.maxAdditional - additionalScreens;
    
    if (quantity < maxPossible) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityChange = (text) => {
    const numValue = parseInt(text) || 0;
    const currentScreens = subscription[0].currentMaxScreens || 5;
    const additionalScreens = subscription[0].additionalScreens || 0;
    const maxPossible = screenOption.maxAdditional - additionalScreens;
    
    if (numValue >= 1 && numValue <= maxPossible) {
      setQuantity(numValue);
    }
  };

  const currentScreens = subscription[0].currentMaxScreens ? subscription[0].currentMaxScreens : 5;
  const additionalScreens = subscription[0].additionalScreens || 0;
  const totalScreens = currentScreens + additionalScreens;
  const maxPossible = screenOption.maxAdditional - additionalScreens;
  const canAddMore = quantity <= maxPossible && maxPossible > 0;

  // Calculs pour les prix
  const totalPrice = quantity * screenOption.price;
  const newAdditionalTotal = additionalScreens + quantity;
  const newTotalScreens = totalScreens + quantity;
  const newMonthlyCost = newAdditionalTotal * screenOption.price;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" color="#1E293B" size={20} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>📺</Text>
          </View>
          <Text style={styles.title}>Ajouter des Écrans</Text>
          <Text style={styles.subtitle}>
            Étendez votre expérience avec des écrans supplémentaires
          </Text>
        </View>
      </View>

      {/* Current Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Votre Abonnement Actuel</Text>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{currentScreens}</Text>
              <Text style={styles.statusLabel}>Écrans inclus</Text>
            </View>
            {/* <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNumber, { color: "#059669" }]}>
                +{additionalScreens}
              </Text>
              <Text style={styles.statusLabel}>Supplémentaires</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNumber, { color: "#4F46E5" }]}>
                {totalScreens}
              </Text>
              <Text style={styles.statusLabel}>Total</Text>
            </View> */}
          </View>

          {additionalScreens > 0 && (
            <View style={styles.currentCostContainer}>
              <Text style={styles.currentCostLabel}>
                Coût mensuel des écrans supplémentaires :
              </Text>
              <Text style={styles.currentCost}>
                {additionalScreens} × 5€ = {additionalScreens * 5}€/mois
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Quantity Selector */}
      <View style={styles.quantityContainer}>
        <View style={styles.quantityCard}>
          <Text style={styles.quantityTitle}>Nombre d'écrans à ajouter</Text>
          <Text style={styles.quantitySubtitle}>
            Maximum possible : {maxPossible} écrans
          </Text>
          
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
              onPress={decrementQuantity}
              disabled={quantity <= 1}
            >
              <Text style={[styles.quantityButtonText, quantity <= 1 && styles.quantityButtonTextDisabled]}>−</Text>
            </TouchableOpacity>
            
            <View style={styles.quantityInputContainer}>
              <TextInput
                style={styles.quantityInput}
                value={quantity.toString()}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                textAlign="center"
                maxLength={2}
              />
              <Text style={styles.quantityUnit}>écran{quantity > 1 ? 's' : ''}</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.quantityButton, quantity >= maxPossible && styles.quantityButtonDisabled]}
              onPress={incrementQuantity}
              disabled={quantity >= maxPossible}
            >
              <Text style={[styles.quantityButtonText, quantity >= maxPossible && styles.quantityButtonTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Option Card */}
      <View style={styles.optionContainer}>
        <View style={styles.optionCard}>
          {/* Header avec prix */}
          <View style={styles.optionHeader}>
            <View style={styles.optionIconContainer}>
              <Text style={styles.optionIcon}>➕</Text>
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionName}>{screenOption.name}</Text>
              <Text style={styles.optionDescription}>
                {screenOption.description}
              </Text>
            </View>
          </View>

          {/* Prix mis en valeur */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>{screenOption.currency}</Text>
              <Text style={styles.price}>{totalPrice}</Text>
              <View style={styles.periodContainer}>
                <Text style={styles.period}>{screenOption.period}</Text>
                <Text style={styles.billedText}>{screenOption.billedText}</Text>
              </View>
            </View>
            <Text style={styles.priceNote}>
              {quantity} écran{quantity > 1 ? 's' : ''} × {screenOption.price}€ = {totalPrice}€/mois
            </Text>
          </View>

          {/* Calcul du nouveau total */}
          <View style={styles.calculationContainer}>
            <Text style={styles.calculationTitle}>
              Après ajout de {quantity} écran{quantity > 1 ? 's' : ''} :
            </Text>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Écrans totaux :</Text>
              <Text style={styles.calculationValue}>{newTotalScreens}</Text>
            </View>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>
                Coût mensuel supplémentaire :
              </Text>
              <Text style={[styles.calculationValue, { color: "#4F46E5" }]}>
                +{totalPrice}€/mois
              </Text>
            </View>
            <View style={[styles.calculationRow, styles.calculationTotal]}>
              <Text style={styles.calculationTotalLabel}>
                Nouveau coût total des options :
              </Text>

              <Text style={styles.calculationTotalValue}>
                {newMonthlyCost}€/mois
              </Text>
            </View>
          </View>

          {/* Avantages */}
          {/* <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>
              Avantages des écrans supplémentaires :
            </Text>

            <FeatureItem
              icon="👥"
              title="Plus d'utilisateurs simultanés"
              description="Permettez à plus de personnes d'utiliser le service en même temps"
            />

            <FeatureItem
              icon="🏢"
              title="Flexibilité d'équipe"
              description="Idéal pour les équipes grandissantes ou les bureaux multiples"
            />

            <FeatureItem
              icon="⚡"
              title="Activation instantanée"
              description="Vos nouveaux écrans seront disponibles immédiatement"
            />

            <FeatureItem
              icon="↻"
              title="Résiliation flexible"
              description="Supprimez les écrans à tout moment depuis votre espace client"
            />
          </View> */}

          {/* Warning si limite atteinte */}
          {maxPossible <= 0 && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Limite atteinte</Text>
                <Text style={styles.warningText}>
                  Vous avez atteint le maximum de {screenOption.maxAdditional}{" "}
                  écrans supplémentaires. Contactez notre support pour des
                  besoins spécifiques.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Bouton d'action */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.addButton,
            (!canAddMore || loading) && styles.addButtonDisabled,
          ]}
          onPress={handleAddScreen}
          disabled={!canAddMore || loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                  Ajout en cours...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonIcon}>➕</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>
                    Ajouter {quantity} écran{quantity > 1 ? 's' : ''} - {totalPrice}€/mois
                  </Text>
                  <Text style={styles.buttonSubtext}>
                    Paiement sécurisé • Activation instantanée
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Informations supplémentaires */}
        {/* <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>💳</Text>
            <Text style={styles.infoText}>
              Facturé sur votre méthode de paiement actuelle
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>
              Proratisé sur votre cycle de facturation actuel
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🔧</Text>
            <Text style={styles.infoText}>
              Gérable depuis votre espace client à tout moment
            </Text>
          </View>
        </View> */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },

  headerContent: {
    alignItems: "center",
  },

  headerIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#F0F9FF",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },

  headerIcon: {
    fontSize: 36,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  // Status Card
  statusContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 20,
    textAlign: "center",
  },

  statusGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 16,
  },

  statusItem: {
    alignItems: "center",
    flex: 1,
  },

  statusNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },

  statusLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },

  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },

  currentCostContainer: {
    backgroundColor: "#F8FAFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },

  currentCostLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },

  currentCost: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },

  // Quantity Selector
  quantityContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  quantityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  quantityTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
    textAlign: "center",
  },

  quantitySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },

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
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },

  quantityButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },

  quantityButtonText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  quantityButtonTextDisabled: {
    color: "#94A3B8",
  },

  quantityInputContainer: {
    alignItems: "center",
    minWidth: 80,
  },

  quantityInput: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    minWidth: 60,
    paddingVertical: 8,
  },

  quantityUnit: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 4,
  },

  // Option Card
  optionContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  optionIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  optionIcon: {
    fontSize: 28,
  },

  optionInfo: {
    flex: 1,
  },

  optionName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },

  optionDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 18,
  },

  // Prix
  priceContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
    backgroundColor: "#F8FAFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  currency: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4F46E5",
    marginTop: 6,
    marginRight: 4,
  },

  price: {
    fontSize: 40,
    fontWeight: "800",
    color: "#4F46E5",
    lineHeight: 44,
  },

  periodContainer: {
    marginLeft: 8,
    marginTop: 6,
  },

  period: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },

  billedText: {
    fontSize: 12,
    color: "#94A3B8",
  },

  priceNote: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },

  // Calcul
  calculationContainer: {
    backgroundColor: "#FFFBEB",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },

  calculationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 12,
  },

  calculationRow: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  calculationLabel: {
    fontSize: 14,
    color: "#78350F",
  },

  calculationValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },

  calculationTotal: {
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
    marginBottom: 0,
  },

  calculationTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#78350F",
  },

  calculationTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4F46E5",
  },

  // Features
  featuresContainer: {
    marginBottom: 24,
  },

  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  featureIconText: {
    fontSize: 18,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },

  featureDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  // Warning
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  warningIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },

  warningContent: {
    flex: 1,
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 4,
  },

  warningText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
  },

  // Button
  buttonContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },

  addButton: {
    backgroundColor: "#059669",
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },

  addButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  buttonIcon: {
    fontSize: 20,
    marginRight: 12,
    color: "#FFFFFF",
  },

  buttonTextContainer: {
    alignItems: "center",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  buttonSubtext: {
    fontSize: 12,
    color: "#A7F3D0",
    marginTop: 2,
  },

  // Info
  infoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  infoIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: "center",
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
});

export default AddScreenScreen;
