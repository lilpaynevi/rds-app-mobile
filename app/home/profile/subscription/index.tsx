import { useAuth } from "@/scripts/AuthContext";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";

const { width } = Dimensions.get("window");

const SubscriptionScreen = ({ navigation }) => {
  const { subscription } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  // Simulation des données du modèle Subscription
  const mockSubscriptionData = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    stripeSubscriptionId: "sub_1234567890",
    status: "ACTIVE", // ACTIVE, INACTIVE, PAST_DUE, CANCELED, UNPAID
    currentPeriodStart: "2024-01-01T00:00:00.000Z",
    currentPeriodEnd: "2024-02-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    quantity: 1,
    currentMaxScreens: 15,
    usedScreens: 8,
    createdAt: "2023-12-01T00:00:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z",
    plan: {
      id: "plan_pro",
      name: "Digital Signage Pro",
      description: "Plan professionnel avec fonctionnalités avancées",
      price: 89.99,
      currency: "EUR",
      interval: "MONTHLY", // MONTHLY, YEARLY
      features: [
        "15 écrans maximum",
        "100 GB de stockage",
        "Support prioritaire",
        "Analytics avancées",
      ],
    },
  };

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      // Ici vous feriez l'appel API réel
      // const response = await fetch('/api/subscription');
      // const data = await response.json();

      // Simulation
      setTimeout(() => {
        // setSubscriptionData(mockSubscriptionData);
        setSubscriptionData(subscription[0]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptionData();
    setRefreshing(false);
  };

  const ProgressCircle = ({ percentage, size = 60, color = "#4F46E5" }) => {
    return (
      <View style={[styles.progressCircle, { width: size, height: size }]}>
        <View
          style={[styles.progressBackground, { borderColor: `${color}20` }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: color,
                transform: [{ rotate: `${(percentage / 100) * 360}deg` }],
              },
            ]}
          />
        </View>
        <View style={styles.progressTextContainer}>
          <Text style={[styles.progressPercentage, { color }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "#10B981";
      case "PAST_DUE":
        return "#F59E0B";
      case "CANCELED":
        return "#EF4444";
      case "INACTIVE":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "ACTIVE":
        return "Actif";
      case "PAST_DUE":
        return "Paiement en retard";
      case "CANCELED":
        return "Annulé";
      case "INACTIVE":
        return "Inactif";
      case "UNPAID":
        return "Impayé";
      default:
        return status;
    }
  };

  const calculateDaysUntilRenewal = () => {
    if (!subscriptionData?.currentPeriodEnd) return 0;
    const endDate = new Date(subscriptionData.currentPeriodEnd);
    const today = new Date();
    const diffTime = endDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={"large"} color={"blue"} />
      </View>
    );
  }

  if (!subscriptionData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erreur lors du chargement</Text>
      </View>
    );
  }

  const screenUsagePercentage =
    (subscriptionData.usedScreens / subscriptionData.currentMaxScreens) * 100;
  const daysUntilRenewal = calculateDaysUntilRenewal();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerSubtitle}>Mon Abonnement</Text>
              <Text style={styles.headerTitle}>
                {subscriptionData.plan.name}
              </Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(subscriptionData.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(subscriptionData.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cartes d'utilisation */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsGrid}>
            {/* Utilisation des écrans */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View>
                  <Text style={styles.metricTitle}>Écrans</Text>
                  <Text style={styles.metricValue}>
                    {subscriptionData.usedScreens} /{" "}
                    {subscriptionData.currentMaxScreens}
                  </Text>
                </View>
                {/* <ProgressCircle
                  percentage={screenUsagePercentage}
                  color="#4F46E5"
                  size={5}
                /> */}
              </View>
              <Text style={styles.metricSubtext}>
                {subscriptionData.currentMaxScreens -
                  subscriptionData.usedScreens}{" "}
                disponibles
              </Text>
            </View>

            {/* Quantité */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View>
                  <Text style={styles.metricTitle}>Quantité</Text>
                  <Text style={styles.metricValue}>
                    {subscriptionData.quantity}
                  </Text>
                </View>
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>📊</Text>
                </View>
              </View>
              <Text style={styles.metricSubtext}>
                Licence{subscriptionData.quantity > 1 ? "s" : ""} active
                {subscriptionData.quantity > 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Période de facturation */}
          <View style={styles.fullWidthCard}>
            <View style={styles.billingHeader}>
              <Text style={styles.billingTitle}>Période actuelle</Text>
              <Text style={styles.billingPrice}>
                {subscriptionData.plan.interval === "year" && (
                  <>
                    {subscriptionData.plan.price / 100}€ /
                    {subscriptionData.plan.interval === "year" ? "an" : "mois"}
                  </>
                )}

                {subscriptionData.plan.interval === "mouth" && (
                  <>
                    {subscriptionData.plan.price}€ /
                    {subscriptionData.plan.interval === "year" ? "an" : "mois"}
                  </>
                )}
              </Text>
            </View>
            <View style={styles.billingDivider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Début de période</Text>
              <Text style={styles.billingValue}>
                {formatDate(subscriptionData.currentPeriodStart)}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Fin de période</Text>
              <Text style={styles.billingValue}>
                {formatDate(subscriptionData.currentPeriodEnd)}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Renouvellement</Text>
              <Text style={styles.billingValue}>
                {daysUntilRenewal > 0
                  ? `Dans ${daysUntilRenewal} jours`
                  : "Expiré"}
              </Text>
            </View>

            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Gérer l'abonnement</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alertes conditionnelles */}
        {subscriptionData.cancelAtPeriodEnd && (
          <View style={styles.alertContainer}>
            <View style={[styles.alertCard, { backgroundColor: "#FEF3C7" }]}>
              <View style={styles.alertHeader}>
                <View
                  style={[
                    styles.alertIconContainer,
                    { backgroundColor: "#F59E0B" },
                  ]}
                >
                  <Text style={styles.alertIcon}>⚠️</Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>Annulation programmée</Text>
                  <Text style={styles.alertText}>
                    Votre abonnement sera annulé le{" "}
                    {formatDate(subscriptionData.currentPeriodEnd)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.alertButton}>
                <Text style={styles.alertButtonText}>Réactiver</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {screenUsagePercentage > 80 && (
          <View style={styles.alertContainer}>
            <View style={[styles.alertCard, { backgroundColor: "#FEF3C7" }]}>
              <View style={styles.alertHeader}>
                <View
                  style={[
                    styles.alertIconContainer,
                    { backgroundColor: "#F59E0B" },
                  ]}
                >
                  <Text style={styles.alertIcon}>📺</Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>
                    Limite d'écrans approchée
                  </Text>
                  <Text style={styles.alertText}>
                    Vous utilisez {subscriptionData.usedScreens} écrans sur{" "}
                    {subscriptionData.currentMaxScreens} disponibles
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => router.navigate("/OptionPaymentScreen")}
              >
                <Text style={styles.alertButtonText}>Augmenter la limite</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Fonctionnalités du plan */}
        {/* <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Fonctionnalités incluses</Text>
          {subscriptionData.plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View> */}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  header: {
    backgroundColor: "#363E49",
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  backIcon: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  upgradeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  statusContainer: {
    alignItems: "flex-start",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  statusSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  metricsContainer: {
    padding: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  metricSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 20,
  },
  progressCircle: {
    justifyContent: "center",
    alignItems: "center",
  },
  progressBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 50,
    borderWidth: 6,
    borderColor: "#E5E7EB",
  },
  progressFill: {
    position: "absolute",
    width: "50%",
    height: "50%",
    backgroundColor: "#4F46E5",
    borderRadius: 50,
    transformOrigin: "100% 100%",
  },
  progressTextContainer: {
    position: "absolute",
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "bold",
  },
  fullWidthCard: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  billingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  billingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  billingPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  billingDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 16,
  },
  billingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billingLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  billingValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  manageButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  manageButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  alertContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  alertCard: {
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  alertHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  alertIcon: {
    fontSize: 20,
    color: "#fff",
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400E",
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: "#B45309",
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  alertButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 16,
    color: "#10B981",
    marginRight: 12,
    fontWeight: "bold",
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  bottomPadding: {
    height: 30,
  },
});

export default SubscriptionScreen;
