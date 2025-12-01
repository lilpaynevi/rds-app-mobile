// components/UpdateScreenCapacityScreen.tsx
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
import api from "@/scripts/fetch.api";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/scripts/AuthContext";
import { createUpdateSession } from "@/requests/stripe.requests";
import { getMyTVs } from "@/requests/tv.requests";

const { width } = Dimensions.get("window");

const UpdateScreenCapacityScreen = () => {
  const [loading, setLoading] = useState(false);
  const [newQuantity, setNewQuantity] = useState(0);
  const [myTVs, setTVS] = useState([]);
  const { user, subscription } = useAuth();

  // Configuration de l'option écran supplémentaire
  const screenOption = {
    id: "additional-screen",
    name: "Écran Supplémentaire",
    description: "Modifiez le nombre d'écrans supplémentaires",
    priceId: "price_1S7OvoAQxGgWdn2vEKo3nksD",
    productId: "prod_T3VxhrYWMoBxlt",
    price: 5,
    currency: "€",
    period: "HT/mois",
    billedText: "Facturation mensuelle",
  };

  // Récupérer l'abonnement option actif
  const optionSubscription = subscription.find(
    (sub) => sub.plan.planType === "OPTION" && sub.status === "ACTIVE"
  );

  const currentQuantity = optionSubscription?.quantity || 0;
  const currentScreens = subscription?.[0]?.currentMaxScreens || 5;
  const baseScreens = 5; // Écrans inclus dans l'abonnement de base
  const fetchInit = async () => {
    const p = await getMyTVs();
    setTVS(p);
  };

  const numberUsedScreen = subscription.find(
    (it) => it.plan.planType === "MAIN"
  )?.usedScreens;

  useEffect(() => {
    if (currentQuantity > myTVs.length) {
      setNewQuantity(currentQuantity);
    }

    fetchInit();
  }, [currentQuantity]);

  const handleUpdateCapacity = async () => {
    try {
      if (newQuantity === currentQuantity) {
        Alert.alert(
          "Aucun changement",
          "La quantité sélectionnée est identique à votre abonnement actuel."
        );
        return;
      }

      if (newQuantity < 0) {
        Alert.alert(
          "Quantité invalide",
          "Vous devez avoir au moins 1 écran supplémentaire. Pour supprimer complètement l'option, utilisez l'option d'annulation."
        );
        return;
      }

      setLoading(true);

      const action =
        newQuantity > currentQuantity ? "augmentation" : "réduction";
      const difference = Math.abs(newQuantity - currentQuantity);

      Alert.alert(
        `Confirmer la ${action}`,
        `Vous êtes sur le point de ${action === "augmentation" ? "augmenter" : "réduire"} votre capacité de ${difference} écran${difference > 1 ? "s" : ""}.\n\nNouveau total : ${newQuantity} écran${newQuantity > 1 ? "s" : ""} supplémentaire${newQuantity > 1 ? "s" : ""}\nNouveau coût : ${newQuantity * screenOption.price}€/mois`,
        [
          {
            text: "Annuler",
            style: "cancel",
            onPress: () => setLoading(false),
          },
          {
            text: "Confirmer",
            onPress: async () => {
              try {

                const response = await createUpdateSession(
                  optionSubscription
                    ? optionSubscription.stripeSubscriptionId
                    : "rien",
                  newQuantity
                );

                console.log("🚀 ~ handleUpdateCapacity ~ response:", response);

                Alert.alert(
                  "Succès",
                  `Votre capacité a été mise à jour avec succès. Vous disposez maintenant de ${newQuantity} écran${newQuantity > 1 ? "s" : ""} supplémentaire${newQuantity > 1 ? "s" : ""}.`,
                  [
                    {
                      text: "OK",
                      onPress: () => router.back(),
                    },
                  ]
                );
              } catch (error) {
                console.error("Erreur lors de la mise à jour:", error);
                Alert.alert(
                  "Erreur",
                  "Une erreur est survenue lors de la mise à jour. Veuillez réessayer."
                );
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Erreur:", error);
      setLoading(false);
    }
  };

  const incrementQuantity = () => {
    setNewQuantity(newQuantity + 1);
  };

  const decrementQuantity = () => {
    if (newQuantity > 0) {
      setNewQuantity(newQuantity - 1);
    }
  };

  const handleQuantityChange = (text) => {
    const numValue = parseInt(text) || 0;
    if (numValue >= 1 && numValue <= 0) {
      setNewQuantity(numValue);
    }
  };

  // Calculs
  const currentTotalScreens = baseScreens + currentQuantity;
  const newTotalScreens = baseScreens + newQuantity;
  const currentMonthlyCost = currentQuantity * screenOption.price;
  const newMonthlyCost = newQuantity * screenOption.price;
  const costDifference = newMonthlyCost - currentMonthlyCost;
  const screenDifference = newQuantity - currentQuantity;
  const isIncrease = newQuantity > currentQuantity;
  const hasChanges = newQuantity !== currentQuantity;

  const ComparisonCard = ({
    title,
    current,
    newValue,
    unit,
    highlight = false,
  }) => (
    <View style={styles.comparisonCard}>
      <Text style={styles.comparisonTitle}>{title}</Text>
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Actuel</Text>
          <Text style={styles.comparisonValue}>
            {current}
            {unit}
          </Text>
        </View>

        <View style={styles.comparisonArrow}>
          <Ionicons
            name={isIncrease ? "arrow-forward" : "arrow-back"}
            size={24}
            color={highlight ? (isIncrease ? "#059669" : "#DC2626") : "#64748B"}
          />
        </View>

        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Nouveau</Text>
          <Text
            style={[
              styles.comparisonValue,
              highlight &&
                (isIncrease
                  ? styles.comparisonValueIncrease
                  : styles.comparisonValueDecrease),
            ]}
          >
            {newValue}
            {unit}
          </Text>
        </View>
      </View>
    </View>
  );

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
            <Text style={styles.headerIcon}>🔄</Text>
          </View>
          <Text style={styles.title}>Modifier la Capacité</Text>
          <Text style={styles.subtitle}>
            Ajustez le nombre d'écrans supplémentaires selon vos besoins
          </Text>
        </View>
      </View>

      {/* Current Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusCard}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>📊 Abonnement Actuel</Text>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <View style={styles.statusIconContainer}>
                <Text style={styles.statusItemIcon}>📺</Text>
              </View>
              <Text style={styles.statusNumber}>{baseScreens}</Text>
              <Text style={styles.statusLabel}>Écrans de base</Text>
            </View>

            <View style={styles.statusDivider}>
              <Text style={styles.statusDividerText}>+</Text>
            </View>

            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusIconContainer,
                  { backgroundColor: "#DCFCE7" },
                ]}
              >
                <Text style={styles.statusItemIcon}>➕</Text>
              </View>
              <Text style={[styles.statusNumber, { color: "#059669" }]}>
                {currentQuantity}
              </Text>
              <Text style={styles.statusLabel}>Supplémentaires</Text>
            </View>

            <View style={styles.statusDivider}>
              <Text style={styles.statusDividerText}>=</Text>
            </View>

            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusIconContainer,
                  { backgroundColor: "#EEF2FF" },
                ]}
              >
                <Text style={styles.statusItemIcon}>📊</Text>
              </View>
              <Text style={[styles.statusNumber, { color: "#4F46E5" }]}>
                {currentTotalScreens}
              </Text>
              <Text style={styles.statusLabel}>Total actuel</Text>
            </View>
          </View>

          {/* <View style={styles.currentCostContainer}>
            <View style={styles.currentCostRow}>
              <Text style={styles.currentCostLabel}>Coût mensuel actuel :</Text>
              <Text style={styles.currentCost}>
                {currentQuantity} × {screenOption.price}€ = {currentMonthlyCost}€/mois
              </Text>
            </View>
          </View> */}
        </View>
      </View>

      {/* Quantity Selector */}
      <View style={styles.quantityContainer}>
        <View style={styles.quantityCard}>
          <View style={styles.quantityHeader}>
            <Text style={styles.quantityTitle}>Nouvelle Quantité</Text>
            {/* <View style={styles.quantityBadge}>
              <Text style={styles.quantityBadgeText}>
                Max: {currentQuantity} écrans
              </Text>
            </View> */}
          </View>

          {baseScreens + newQuantity === numberUsedScreen && (
            <>
              <View
                style={[
                  styles.quantityChangeIndicator,
                  isIncrease
                    ? styles.quantityChangeIncrease
                    : styles.quantityChangeDecrease,
                ]}
              >
                <Text style={styles.quantityChangeIcon}>🔒</Text>
                <Text style={{ ...styles.quantityChangeText, fontSize: 10 , color: "red", textAlign: "center" }}>
                  Vous avec {numberUsedScreen} télévisions connectés, 
                  Merci d'en supprimer {newQuantity} télévisions de votre choix avant de
                  modifier votre abonnement
                </Text>
              </View>

              <View>
                <Text></Text>
              </View>
            </>
          )}

          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                newQuantity <= 0 && styles.quantityButtonDisabled,
              ]}
              onPress={decrementQuantity}
              disabled={baseScreens + newQuantity === numberUsedScreen}
            >
              <Text
                style={[
                  styles.quantityButtonText,
                  newQuantity <= 0 && styles.quantityButtonTextDisabled,
                ]}
              >
                −
              </Text>
            </TouchableOpacity>

            <View style={styles.quantityInputContainer}>
              <TextInput
                style={styles.quantityInput}
                value={newQuantity.toString()}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                textAlign="center"
                maxLength={2}
              />
              <Text style={styles.quantityUnit}>
                écran{newQuantity > 1 ? "s" : ""}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.quantityButton]}
              onPress={incrementQuantity}
            >
              <Text style={[styles.quantityButtonText]}>+</Text>
            </TouchableOpacity>
          </View>

          {hasChanges && (
            <View
              style={[
                styles.quantityChangeIndicator,
                isIncrease
                  ? styles.quantityChangeIncrease
                  : styles.quantityChangeDecrease,
              ]}
            >
              <Text style={styles.quantityChangeIcon}>
                {isIncrease ? "📈" : "📉"}
              </Text>
              <Text style={styles.quantityChangeText}>
                {isIncrease ? "Augmentation" : "Réduction"} de{" "}
                {Math.abs(screenDifference)} écran
                {Math.abs(screenDifference) > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Comparison Cards */}
      {hasChanges && (
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonHeaderTitle}>
              📊 Résumé des Changements
            </Text>
          </View>

          <ComparisonCard
            title="Écrans supplémentaires"
            current={currentQuantity}
            newValue={newQuantity}
            unit=""
            highlight={true}
          />

          <ComparisonCard
            title="Total d'écrans"
            current={currentTotalScreens}
            newValue={newTotalScreens}
            unit=""
          />

          <ComparisonCard
            title="Coût mensuel"
            current={currentMonthlyCost}
            newValue={newMonthlyCost}
            unit="€"
            highlight={true}
          />

          {/* Cost Difference Highlight */}
          <View
            style={[
              styles.costDifferenceCard,
              isIncrease
                ? styles.costDifferenceIncrease
                : styles.costDifferenceDecrease,
            ]}
          >
            <View style={styles.costDifferenceHeader}>
              <Text style={styles.costDifferenceIcon}>
                {isIncrease ? "💰" : "💸"}
              </Text>
              <Text style={styles.costDifferenceTitle}>
                {isIncrease ? "Coût supplémentaire" : "Économie mensuelle"}
              </Text>
            </View>
            <Text style={styles.costDifferenceAmount}>
              {isIncrease ? "+" : "-"}
              {Math.abs(costDifference)}€/mois
            </Text>
            <Text style={styles.costDifferenceDescription}>
              {isIncrease
                ? `Vous serez facturé ${Math.abs(costDifference)}€ de plus par mois`
                : `Vous économiserez ${Math.abs(costDifference)}€ par mois`}
            </Text>
          </View>
        </View>
      )}

      {/* Information Card */}
      <View style={styles.infoMainContainer}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoHeaderIcon}>ℹ️</Text>
            <Text style={styles.infoHeaderTitle}>Informations Importantes</Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoItemIcon}>⚡</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Prise d'effet immédiate</Text>
              <Text style={styles.infoItemText}>
                Les changements sont appliqués instantanément après confirmation
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoItemIcon}>💳</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Facturation au prorata</Text>
              <Text style={styles.infoItemText}>
                {isIncrease
                  ? "Le montant sera calculé au prorata pour la période restante"
                  : "Un crédit sera appliqué au prorata sur votre prochaine facture"}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoItemIcon}>🔄</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Modification flexible</Text>
              <Text style={styles.infoItemText}>
                Vous pouvez modifier votre capacité à tout moment selon vos
                besoins
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.updateButton,
            (!hasChanges || loading) && styles.updateButtonDisabled,
            isIncrease && hasChanges && styles.updateButtonIncrease,
            !isIncrease && hasChanges && styles.updateButtonDecrease,
          ]}
          onPress={handleUpdateCapacity}
          disabled={!hasChanges || loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                  Mise à jour en cours...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.buttonIcon}>
                  {hasChanges ? (isIncrease ? "📈" : "📉") : "🔒"}
                </Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>
                    {!hasChanges
                      ? "Aucun changement"
                      : isIncrease
                        ? `Augmenter à ${newQuantity} écrans`
                        : `Réduire à ${newQuantity} écran${newQuantity > 1 ? "s" : ""}`}
                  </Text>
                  {hasChanges && (
                    <Text style={styles.buttonSubtext}>
                      {isIncrease ? "+" : ""}
                      {costDifference}€/mois • Prise d'effet immédiate
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Cancel Option */}
        {currentQuantity > 0 && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Alert.alert(
                "Supprimer l'option",
                "Voulez-vous supprimer complètement cette option ? Cette action annulera votre abonnement aux écrans supplémentaires.",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => {
                      // Logique pour supprimer l'option
                      router.push("/cancel-option");
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>
              🗑️ Supprimer cette option complètement
            </Text>
          </TouchableOpacity>
        )}
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

  statusBadge: {
    alignSelf: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },

  statusBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },

  statusGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  statusItem: {
    alignItems: "center",
    flex: 1,
  },

  statusIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statusItemIcon: {
    fontSize: 20,
  },

  statusNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },

  statusLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },

  statusDivider: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },

  statusDividerText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#94A3B8",
  },

  currentCostContainer: {
    backgroundColor: "#F8FAFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },

  currentCostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  currentCostLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },

  currentCost: {
    fontSize: 15,
    fontWeight: "700",
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

  quantityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  quantityTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },

  quantityBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  quantityBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
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
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  quantityButtonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
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

  quantityChangeIndicator: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  quantityChangeIncrease: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },

  quantityChangeDecrease: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  quantityChangeIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  quantityChangeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },

  // Comparison
  comparisonContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  comparisonHeader: {
    marginBottom: 16,
  },

  comparisonHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },

  comparisonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  comparisonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 16,
    textAlign: "center",
  },

  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  comparisonItem: {
    flex: 1,
    alignItems: "center",
  },

  comparisonLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 8,
    fontWeight: "500",
  },

  comparisonValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
  },

  comparisonValueIncrease: {
    color: "#059669",
  },

  comparisonValueDecrease: {
    color: "#DC2626",
  },

  comparisonArrow: {
    paddingHorizontal: 16,
  },

  costDifferenceCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 2,
  },

  costDifferenceIncrease: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },

  costDifferenceDecrease: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },

  costDifferenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  costDifferenceIcon: {
    fontSize: 24,
    marginRight: 8,
  },

  costDifferenceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },

  costDifferenceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },

  costDifferenceDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },

  // Info Card
  infoMainContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  infoHeaderIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  infoHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  infoItemIcon: {
    fontSize: 18,
  },

  infoContent: {
    flex: 1,
  },

  infoItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },

  infoItemText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  // Buttons
  buttonContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },

  updateButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },

  updateButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },

  updateButtonIncrease: {
    backgroundColor: "#059669",
    shadowColor: "#059669",
  },

  updateButtonDecrease: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
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
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },

  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#DC2626",
  },
});

export default UpdateScreenCapacityScreen;
