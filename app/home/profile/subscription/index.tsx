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
  Alert,
} from "react-native";
import api$ from "@/scripts/fetch.api";
import api from "@/scripts/fetch.api";
import { getMyTVs} from "@/requests/tv.requests";
import { Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlatList } from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

const SubscriptionScreen = () => {
  const { subscription, user } = useAuth();
  console.log("🚀 ~ SubscriptionScreen ~ subscription:", subscription)
  console.log("🚀 ~ SubscriptionScreen ~ subscription:", subscription)
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myTVS, setTVS] = useState([]);
  const [displayTVSelection, setDisplayTVSelection] = useState(false);

  const [selectedTVs, setSelectedTVs] = useState<string[]>([]);
  const [cancelling, setCancelling] = useState(false);



  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const toggleTVSelection = (tvId: string) => {
    setSelectedTVs(prev => {
      if (prev.includes(tvId)) {
        return prev.filter(id => id !== tvId);
      } else {
        return [...prev, tvId];
      }
    });
  };

  const selectExcessTVs = () => {
    const maxScreens = subscriptionData.baseScreens; // Écrans de base après annulation
    const excessCount = myTVS.length - maxScreens;

    if (excessCount > 0) {
      // Sélectionner les dernières TVs ajoutées
      const excessTVs = myTVS.slice(-excessCount).map((tv: any) => tv.id);
      setSelectedTVs(excessTVs);
    }
  };

  /**
   * Vérifier si on peut procéder à l'annulation
   */
  const canProceedWithCancellation = () => {
    const maxScreens = subscriptionData.baseScreens;
    const remainingTVs = myTVS.length - selectedTVs.length;
    return remainingTVs <= maxScreens;
  };

  /**
   * Confirmer l'annulation avec suppression des TVs
   */
  const confirmCancellation = async () => {
    if (!canProceedWithCancellation()) {
      const maxScreens = subscriptionData.baseScreens;
      const remainingTVs = myTVS.length - selectedTVs.length;
      const needToSelect = remainingTVs - maxScreens;

      Alert.alert(
        "Sélection insuffisante",
        `Vous devez sélectionner ${needToSelect} TV(s) supplémentaire(s) pour ramener votre total à ${maxScreens} écrans.`
      );
      return;
    }

    Alert.alert(
      "Confirmer l'annulation",
      `${selectedTVs.length} TV(s) seront supprimées et votre abonnement sera annulé à la fin de la période. Continuer ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "destructive",
          onPress: processCancellation,
        },
      ]
    );
  };

  /**
   * Traiter l'annulation
   */
  const processCancellation = async () => {
    try {
      setCancelling(true);

      // 1️⃣ Supprimer les TVs sélectionnées
      console.log("🗑️ Suppression des TVs:", selectedTVs);

      for (const tvId of selectedTVs) {
        await api.delete(`/tvs/${tvId}`);
        console.log(`✅ TV ${tvId} supprimée`);
      }

      // 2️⃣ Annuler l'abonnement
      const response = await api.delete("/stripe/subscription/cancel", {
        data: {
          subscriptionId: subscriptionData.id,
          immediate: false, // Annulation en fin de période
          reason: "user_requested",
        },
      });

      console.log("✅ Abonnement annulé:", response.data);

      // 3️⃣ Fermer le modal et rafraîchir
      setDisplayTVSelection(false);
      setSelectedTVs([]);

      Alert.alert(
        "Annulation programmée",
        `${selectedTVs.length} TV(s) ont été supprimées. Votre abonnement sera annulé le ${formatDate(subscriptionData.currentPeriodEnd)}.`,
        [{ text: "OK", onPress: loadSubscriptionData }]
      );

    } catch (error) {
      console.error("❌ Erreur annulation:", error);
      Alert.alert(
        "Erreur",
        error?.response?.data?.message || "Impossible d'annuler l'abonnement"
      );
    } finally {
      setCancelling(false);
    }
  };

  /**
   * Gérer le clic sur "Annuler l'abonnement"
   */
  const handleCancelSubscription = async () => {
    try {
      // Récupérer les TVs de l'utilisateur
      const getUserTVs = await getMyTVs();
      setTVS(getUserTVs);

      const currentTVCount = getUserTVs.length;
      const maxScreensAfterCancel = subscriptionData.currentMaxScreens - currentTVCount;


      console.log(`📊 TVs actuelles: ${currentTVCount}`);
      console.log(`📊 Max après annulation: ${maxScreensAfterCancel}`);

      // Si le nombre de TVs dépasse la limite après annulation
      if (currentTVCount != maxScreensAfterCancel) {
        const excessCount = currentTVCount - maxScreensAfterCancel;

        Alert.alert(
          "Trop d'écrans connectés",
          `Vous avez ${currentTVCount} TV(s) mais votre plan de base permet ${maxScreensAfterCancel} écran(s). Vous devez supprimer ${excessCount} TV(s) avant d'annuler votre abonnement.`,
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Sélectionner les TVs",
              onPress: () => setDisplayTVSelection(true),
            },
          ]
        );
      } else {
        // Pas de TVs excédentaires, annulation directe
        Alert.alert(
          "Annuler l'abonnement",
          "Êtes-vous sûr de vouloir annuler votre abonnement à la fin de la période ?",
          [
            { text: "Non", style: "cancel" },
            {
              text: "Oui, annuler",
              style: "destructive",
              onPress: async () => {
                try {
                  await api.delete("/stripe/subscription/cancel", {
                    data: {
                      subscriptionId: subscriptionData.id,
                      immediate: false,
                      reason: "user_requested",
                    },
                  });

                  Alert.alert(
                    "Annulation programmée",
                    `Votre abonnement sera annulé le ${formatDate(subscriptionData.currentPeriodEnd)}.`,
                    [{ text: "OK", onPress: loadSubscriptionData }]
                  );
                } catch (error) {
                  Alert.alert("Erreur", "Impossible d'annuler l'abonnement");
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("❌ Erreur récupération TVs:", error);
      Alert.alert("Erreur", "Impossible de récupérer vos TVs");
    }
  };


  /**
   * Rendu d'une TV dans la liste
   */
  const renderTVItem = ({ item }: { item: any }) => {
    const isSelected = selectedTVs.includes(item.id);
    const isOnline = item.status === "ONLINE";

    return (
      <TouchableOpacity
        style={[
          styles.tvItem,
          isSelected && styles.tvItemSelected,
        ]}
        onPress={() => toggleTVSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.tvItemLeft}>
          {/* Checkbox */}
          <View style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>

          {/* Icône TV */}
          <View style={[
            styles.tvIcon,
            isOnline ? styles.tvIconOnline : styles.tvIconOffline,
          ]}>
            <Text style={styles.tvIconText}>📺</Text>
          </View>

          {/* Infos TV */}
          <View style={styles.tvInfo}>
            <Text style={styles.tvName} numberOfLines={1}>
              {item.name || `TV ${item.code}`}
            </Text>
            <View style={styles.tvMeta}>
              <View style={[
                styles.tvStatusDot,
                { backgroundColor: isOnline ? "#10B981" : "#6B7280" },
              ]} />
              <Text style={styles.tvStatus}>
                {isOnline ? "En ligne" : "Hors ligne"}
              </Text>
              <Text style={styles.tvCode}>• {item.code}</Text>
            </View>
            {item.lastConnection && (
              <Text style={styles.tvLastSeen}>
                Dernière connexion: {formatDate(item.lastConnection)}
              </Text>
            )}
          </View>
        </View>

        {/* Indicateur de sélection */}
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>À supprimer</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };


  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      // ✅ Récupérer l'abonnement actif (pas les addons)
      const activeSubscription = subscription?.find(
        (sub) => sub.status === "ACTIVE" && sub.plan.planType === "MAIN"
      );

      if (!activeSubscription) {
        Alert.alert(
          "Aucun abonnement",
          "Vous n'avez pas d'abonnement actif",
          [{ text: "Souscrire", onPress: () => router.push("/PaymentScreen") }]
        );
        setLoading(false);
        return;
      }

      // ✅ Calculer les écrans supplémentaires (addons)
      const screenAbo = subscription?.find(
        (sub) =>
          sub.status === "ACTIVE" &&
          sub.plan.planType === "MAIN"
      );

      const totalExtraScreens = Number(activeSubscription.currentMaxScreens) - Number(activeSubscription.plan.maxScreens)

      // ✅ Calculer le total d'écrans disponibles
      const totalMaxScreens = activeSubscription.currentMaxScreens + totalExtraScreens;

      setSubscriptionData({
        ...activeSubscription,
        currentMaxScreens: screenAbo?.currentMaxScreens,
        extraScreens: totalExtraScreens,
        baseScreens: activeSubscription.plan.maxScreens,
      });

      setLoading(false);
    } catch (error) {
      console.error("❌ Erreur chargement abonnement:", error);
      Alert.alert("Erreur", "Impossible de charger votre abonnement");
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptionData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "#10B981";
      case "PAST_DUE": return "#F59E0B";
      case "CANCELED": return "#EF4444";
      case "INACTIVE": return "#6B7280";
      default: return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ACTIVE": return "Actif";
      case "PAST_DUE": return "Paiement en retard";
      case "CANCELED": return "Annulé";
      case "INACTIVE": return "Inactif";
      case "UNPAID": return "Impayé";
      default: return status;
    }
  };

  const calculateDaysUntilRenewal = () => {
    if (!subscriptionData?.currentPeriodEnd) return 0;
    const endDate = new Date(subscriptionData.currentPeriodEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleManageSubscription = async () => {
    try {
      // Créer un portail Stripe pour gérer l'abonnement
      const response = await api.post("/stripe/create-portal-session", {
        userId: user.id,
        returnUrl: "myapp://subscription",
      });

      if (response.data.url) {
        // Ouvrir le portail Stripe
        // Linking.openURL(response.data.url);
        Alert.alert("Info", "Ouverture du portail de gestion...");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ouvrir le portail de gestion");
    }
  };

  const handleUpgradeScreens = () => {
    router.push({
      pathname: "/OptionPaymentScreen",
      params: {
        currentScreens: subscriptionData.currentMaxScreens,
        usedScreens: subscriptionData.usedScreens,
      },
    });
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!subscriptionData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Aucun abonnement</Text>
        <Text style={styles.errorText}>
          Vous n'avez pas encore d'abonnement actif
        </Text>
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={() => router.push("/pricing")}
        >
          <Text style={styles.subscribeButtonText}>Voir les offres</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const screenUsagePercentage =
    (subscriptionData.usedScreens / subscriptionData.currentMaxScreens) * 100;
  const daysUntilRenewal = calculateDaysUntilRenewal();

  // ✅ Calcul du prix avec addons
  const basePrice = parseFloat(subscriptionData.plan.price);
  const addonPrice = subscriptionData.extraScreens * 5; // 5€ par écran supplémentaire
  const totalPrice = basePrice + addonPrice;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#363E49" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
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
                  {subscriptionData.extraScreens > 0 && (
                    <Text style={styles.metricExtra}>
                      ({subscriptionData.baseScreens} + {subscriptionData.extraScreens} écrans supplémentaires)
                    </Text>
                  )}
                </View>
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>📺</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${screenUsagePercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.metricSubtext}>
                {subscriptionData.currentMaxScreens -
                  subscriptionData.usedScreens}{" "}
                disponibles
              </Text>
            </View>
          </View>

          {/* Période de facturation */}
          <View style={styles.fullWidthCard}>
            <View style={styles.billingHeader}>
              <Text style={styles.billingTitle}>Période actuelle</Text>
              <View>
                <Text style={styles.billingPrice}>
                  {totalPrice}€
                </Text>
                <Text style={styles.billingInterval}>
                  /{subscriptionData.plan.interval === "year" ? "an" : "mois"}
                </Text>
                {/* {subscriptionData.extraScreens > 0 && (
                  <Text style={styles.billingBreakdown}>
                    {basePrice}€ + {addonPrice}€ d'option suppl.
                  </Text>
                )} */}
              </View>
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

            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
            >
              <Text style={styles.manageButtonText}>Gérer l'abonnement</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alertes */}
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
              <TouchableOpacity
                style={styles.alertButton}
                onPress={handleManageSubscription}
              >
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
                onPress={handleUpgradeScreens}
              >
                <Text style={styles.alertButtonText}>
                  Ajouter des écrans (+5€/écran)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleCancelSubscription}
          >
            <Text style={styles.dangerButtonText}>Annuler l'abonnement</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 🆕 MODAL DE SÉLECTION DES TVs */}
      <Modal
        visible={displayTVSelection}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDisplayTVSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header du modal */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sélectionner les TVs à supprimer</Text>
                <Text style={styles.modalSubtitle}>
                  {myTVS.length} TV(s) connectée(s) • Max après annulation: {subscriptionData?.baseScreens}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setDisplayTVSelection(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Barre d'info */}
            <View style={styles.infoBar}>
              <View style={styles.infoBarLeft}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoBarText}>
                  Sélectionnez {myTVS.length - subscriptionData?.baseScreens} TV(s) minimum
                </Text>
              </View>
              {selectedTVs.length > 0 && (
                <View style={styles.selectionBadge}>
                  <Text style={styles.selectionBadgeText}>
                    {selectedTVs.length} sélectionnée(s)
                  </Text>
                </View>
              )}
            </View>

            {/* Bouton de sélection rapide */}
            {myTVS.length > subscriptionData?.baseScreens && (
              <TouchableOpacity
                style={styles.quickSelectButton}
                onPress={selectExcessTVs}
              >
                <Ionicons name="flash" size={16} color="#667eea" />
                <Text style={styles.quickSelectText}>
                  Sélectionner automatiquement les TVs excédentaires
                </Text>
              </TouchableOpacity>
            )}

            {/* Liste des TVs */}
            <FlatList
              data={myTVS}
              renderItem={renderTVItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.tvList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Aucune TV trouvée</Text>
                </View>
              }
            />

            {/* Footer avec actions */}
            <View style={styles.modalFooter}>
              <View style={styles.footerInfo}>
                <Text style={styles.footerInfoText}>
                  TVs restantes après suppression:{" "}
                  <Text style={styles.footerInfoValue}>
                    {myTVS.length - selectedTVs.length}
                  </Text>
                </Text>
                {!canProceedWithCancellation() && (
                  <Text style={styles.footerWarning}>
                    ⚠️ Vous devez supprimer plus de TVs
                  </Text>
                )}
              </View>

              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setDisplayTVSelection(false);
                    setSelectedTVs([]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!canProceedWithCancellation() || cancelling) && styles.confirmButtonDisabled,
                  ]}
                  onPress={confirmCancellation}
                  disabled={!canProceedWithCancellation() || cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.confirmButtonText}>
                        Supprimer et annuler
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  // ... (gardez tous vos styles existants)

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
  },

  infoBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },

  infoBarText: {
    fontSize: 13,
    color: "#1E40AF",
    flex: 1,
  },

  selectionBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  selectionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  quickSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },

  quickSelectText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
  },

  tvList: {
    padding: 20,
    paddingTop: 12,
  },

  tvItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },

  tvItemSelected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },

  tvItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  tvIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  tvIconOnline: {
    backgroundColor: "#D1FAE5",
  },

  tvIconOffline: {
    backgroundColor: "#E5E7EB",
  },

  tvIconText: {
    fontSize: 24,
  },

  tvInfo: {
    flex: 1,
  },

  tvName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },

  tvMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },

  tvStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  tvStatus: {
    fontSize: 13,
    color: "#6B7280",
  },

  tvCode: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  tvLastSeen: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },

  selectedBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },

  emptyList: {
    padding: 40,
    alignItems: "center",
  },

  emptyListText: {
    fontSize: 16,
    color: "#9CA3AF",
  },

  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 20,
    gap: 16,
  },

  footerInfo: {
    gap: 4,
  },

  footerInfoText: {
    fontSize: 14,
    color: "#6B7280",
  },

  footerInfoValue: {
    fontWeight: "600",
    color: "#1F2937",
  },

  footerWarning: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },

  footerButtons: {
    flexDirection: "row",
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },

  confirmButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  confirmButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },

  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // ✅ Ajoutez ces nouveaux styles :
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginVertical: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 4,
  },
  metricExtra: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  billingInterval: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "right",
  },
  billingBreakdown: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "right",
    marginTop: 4,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dangerButton: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  dangerButtonText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 16,
  },
  subscribeButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  subscribeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },

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
