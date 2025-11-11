// components/PaymentScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import api, { baseURL } from "@/scripts/fetch.api";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createSession } from "@/requests/stripe.requests";
import { useAuth } from "@/scripts/AuthContext";

const { width } = Dimensions.get("window");

const PaymentScreen = () => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("annual"); // 'monthly' ou 'annual'
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user } = useAuth();
  // Plans configuration
  const plans = {
    monthly: {
      id: "78d0a01f-6c05-46bb-a665-bd851868f27e",
      name: "Abonnement Mensuel",
      description: "Flexibilité maximale avec engagement mensuel",
      priceId: "price_1S7OuqAQxGgWdn2vTmQFwkQs",
      price: 30,
      currency: "€",
      period: "HT/mois",
      billedText: "Facturation mensuelle",
      totalAnnual: 360,
      popular: false,
      savings: null,
    },
    annual: {
      id: "dadc97fe-4972-424d-b780-67431a77a8c8",
      name: "Abonnement Annuel",
      description:
        "Profitez d'un mois offert lors de la souscription d'un an complet",
      priceId: "price_1S7dNCAQxGgWdn2vUVFHeO6S",
      price: 330,
      currency: "€",
      period: "HT/an",
      billedText: "Facturation annuelle",
      totalAnnual: 330,
      popular: true,
      savings: "1 mois offert",
      monthlyEquivalent: 27.5,
    },
  };

  const currentPlan = plans[selectedPlan];

  // Méthode 1: Redirection vers Stripe Checkout
  const handleStripeCheckout = async () => {
    try {
      setLoading(true);

      console.log({
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
      });


      const response = await createSession(
        currentPlan.priceId,
        currentPlan.id,
        {
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
        }
      );
      
      return response;
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  const PlanFeature = ({ icon, text }: { icon: string; text: string }) => (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  const PlanSelector = () => (
    <View style={styles.planSelectorContainer}>
      <Text style={styles.planSelectorTitle}>Choisissez votre plan :</Text>

      <View style={styles.planOptions}>
        {/* Plan Mensuel */}
        <TouchableOpacity
          style={[
            styles.planOption,
            selectedPlan === "monthly" && styles.planOptionSelected,
          ]}
          onPress={() => setSelectedPlan("monthly")}
          activeOpacity={0.7}
        >
          <View style={styles.planOptionContent}>
            <View style={styles.planOptionHeader}>
              <Text
                style={[
                  styles.planOptionName,
                  selectedPlan === "monthly" && styles.planOptionNameSelected,
                ]}
              >
                Mensuel
              </Text>
            </View>
            <Text
              style={[
                styles.planOptionPrice,
                selectedPlan === "monthly" && styles.planOptionPriceSelected,
              ]}
            >
              {plans.monthly.price}€/mois
            </Text>
            <Text style={styles.planOptionTotal}>
              {plans.monthly.totalAnnual}€ par an
            </Text>
          </View>
        </TouchableOpacity>

        {/* Plan Annuel */}
        <TouchableOpacity
          style={[
            styles.planOption,
            selectedPlan === "annual" && styles.planOptionSelected,
          ]}
          onPress={() => setSelectedPlan("annual")}
          activeOpacity={0.7}
        >
          {plans.annual.popular && (
            <View style={styles.popularBadgeSmall}>
              <Text style={styles.popularTextSmall}>🔥 POPULAIRE</Text>
            </View>
          )}

          <View style={styles.planOptionContent}>
            <View style={styles.planOptionHeader}>
              <Text
                style={[
                  styles.planOptionName,
                  selectedPlan === "annual" && styles.planOptionNameSelected,
                ]}
              >
                Annuel
              </Text>
              <View style={styles.savingsBadgeSmall}>
                <Text style={styles.savingsTextSmall}>1 MOIS OFFERT</Text>
              </View>
            </View>
            <View style={styles.annualPriceContainer}>
              <Text
                style={[
                  styles.planOptionPrice,
                  selectedPlan === "annual" && styles.planOptionPriceSelected,
                ]}
              >
                {plans.annual.price}€/an
              </Text>
              <Text style={styles.monthlyEquivalent}>
                Soit {plans.annual.monthlyEquivalent}€/mois
              </Text>
            </View>
            <Text style={styles.planOptionSavings}>
              Économisez {plans.monthly.totalAnnual - plans.annual.price}€ par
              an
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header avec gradient */}

      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" color="#1E293B" size={20} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>

          {/* <Text style={styles.title}>RDS Connect Premium</Text> */}
          
        </View>
      </View>

      {/* Plan Selector */}
      <PlanSelector />

      {/* Plan Details Card */}
      <View style={styles.planContainer}>
        <View style={styles.planCard}>
          {/* Badge Popular pour plan annuel */}
          {currentPlan.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>🔥 MEILLEUR CHOIX</Text>
            </View>
          )}

          {/* Plan Header */}
          <View style={styles.planHeader}>
            <View style={styles.planIconContainer}>
              <Text style={styles.planIcon}>🚀</Text>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{currentPlan.name}</Text>
              <Text style={styles.planDescription}>
                {currentPlan.description}
              </Text>
            </View>
          </View>

          {/* Prix avec mise en valeur */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>{currentPlan.currency}</Text>
              <Text style={styles.planPrice}>{currentPlan.price}</Text>
              <View style={styles.periodContainer}>
                <Text style={styles.period}>{currentPlan.period}</Text>
                <Text style={styles.billedText}>{currentPlan.billedText}</Text>
              </View>
            </View>

            {/* Prix économisé ou équivalent mensuel */}
            {selectedPlan === "annual" && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>
                  soit {currentPlan.monthlyEquivalent}€/mois • Économisez 30€
                </Text>
              </View>
            )}
          </View>

          {/* Features avec icônes */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Ce qui est inclus :</Text>

            <PlanFeature
              icon="🖥️"
              text="Accès illimité à 5 écrans simultanés"
            />
            <PlanFeature icon="☁️" text="Synchronisation cloud en temps réel" />
            <PlanFeature icon="📞" text="Support technique dédié 24/7" />

            {selectedPlan === "annual" && (
              <PlanFeature
                icon="🎁"
                text="1 mois gratuit inclus dans l'offre annuelle"
              />
            )}
          </View>

          {/* Garantie */}
          <View style={styles.guaranteeContainer}>
            <Text style={styles.guaranteeIcon}>🛡️</Text>
            <Text style={styles.guaranteeText}>
              Garantie satisfait ou remboursé 30 jours
            </Text>
          </View>
        </View>
      </View>

      {/* Boutons d'action améliorés */}
      <View style={styles.buttonsContainer}>
        {/* Bouton Principal Stripe Checkout */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleStripeCheckout}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                  Traitement...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonIcon}>🔒</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>
                    S'abonner maintenant - {currentPlan.price}€
                    {currentPlan.period}
                  </Text>
                  <Text style={styles.buttonSubtext}>
                    Paiement sécurisé avec Stripe
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Bouton Alternatif */}
        {/* <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleNativePayment}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonIcon}>📱</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Paiement Express
              </Text>
              <Text style={[styles.buttonSubtext, styles.secondaryButtonSubtext]}>
                Interface native optimisée
              </Text>
            </View>
          </View>
        </TouchableOpacity> */}
      </View>

      {/* Footer info */}
      <View style={styles.footer}>
        {/*  <View style={styles.trustSignals}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>Paiement sécurisé SSL</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>⚡</Text>
            <Text style={styles.trustText}>Activation instantanée</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>↻</Text>
            <Text style={styles.trustText}>Annulation facile</Text>
          </View>
        </View> */}

        {/* <Text style={styles.termsText}>
          En continuant, vous acceptez nos{" "}
          <Text style={styles.linkText}>Conditions d'utilisation</Text> et notre{" "}
          <Text style={styles.linkText}>Politique de confidentialité</Text>
        </Text> */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },

  headerGradient: {
    position: "relative",
  },

  // Bouton retour
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
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
  // Plan Selector
  planSelectorContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  planSelectorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
    textAlign: "center",
  },

  planOptions: {
    flexDirection: "row",
    gap: 12,
  },

  planOption: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    position: "relative",
  },

  planOptionSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#F8FAFF",
  },

  popularBadgeSmall: {
    position: "absolute",
    top: -8,
    left: 8,
    right: 8,
    backgroundColor: "#FF6B6B",
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
  },

  popularTextSmall: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  planOptionContent: {
    alignItems: "center",
  },

  planOptionHeader: {
    alignItems: "center",
    marginBottom: 8,
  },

  planOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },

  planOptionNameSelected: {
    color: "#4F46E5",
  },

  savingsBadgeSmall: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },

  savingsTextSmall: {
    fontSize: 10,
    color: "#166534",
    fontWeight: "600",
  },

  planOptionPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },

  planOptionPriceSelected: {
    color: "#4F46E5",
  },

  annualPriceContainer: {
    alignItems: "center",
  },

  monthlyEquivalent: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  planOptionTotal: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },

  planOptionSavings: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
    marginTop: 4,
  },

  // Plan Card
  planContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },

  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },

  popularBadge: {
    position: "absolute",
    top: -8,
    left: 24,
    right: 24,
    backgroundColor: "#FF6B6B",
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  popularText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },

  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },

  planIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#FEF3C7",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  planIcon: {
    fontSize: 28,
  },

  planInfo: {
    flex: 1,
  },

  planName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },

  planDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 18,
  },

  // Prix Section
  priceContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  currency: {
    fontSize: 24,
    fontWeight: "600",
    color: "#4F46E5",
    marginTop: 8,
    marginRight: 4,
  },

  planPrice: {
    fontSize: 48,
    fontWeight: "800",
    color: "#4F46E5",
    lineHeight: 50,
  },

  periodContainer: {
    marginLeft: 8,
    marginTop: 8,
  },

  period: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
  },

  billedText: {
    fontSize: 12,
    color: "#94A3B8",
  },

  savingsBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  savingsText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600",
  },

  // Features Section
  featuresContainer: {
    marginBottom: 24,
  },

  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  featureIconText: {
    fontSize: 16,
  },

  featureText: {
    flex: 1,
    fontSize: 15,
    color: "#475569",
    lineHeight: 20,
  },

  // Garantie
  guaranteeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },

  guaranteeIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  guaranteeText: {
    flex: 1,
    fontSize: 13,
    color: "#0369A1",
    fontWeight: "500",
  },

  // Boutons
  buttonsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },

  button: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 20,
  },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    paddingVertical: 18,
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
    color: "#C7D2FE",
    marginTop: 2,
  },

  secondaryButtonText: {
    color: "#1E293B",
  },

  secondaryButtonSubtext: {
    color: "#64748B",
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  trustSignals: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  trustItem: {
    alignItems: "center",
    flex: 1,
  },

  trustIcon: {
    fontSize: 24,
    marginBottom: 4,
  },

  trustText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "500",
  },

  termsText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 20,
  },

  linkText: {
    color: "#4F46E5",
    fontWeight: "500",
  },
});

export default PaymentScreen;
