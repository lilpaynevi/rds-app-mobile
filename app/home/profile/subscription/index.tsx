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
import { getMyTVs } from "@/requests/tv.requests";
import { Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList } from "react-native-gesture-handler";
import { cancelSubscription } from "@/requests/stripe.requests";

const { width } = Dimensions.get("window");
const baseScreens = 5;
const SubscriptionScreen = () => {
  const { subscription, user } = useAuth();
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
    setSelectedTVs((prev) => {
      if (prev.includes(tvId)) {
        return prev.filter((id) => id !== tvId);
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
        `Vous devez sélectionner ${needToSelect} TV(s) supplémentaire(s) pour ramener votre total à ${maxScreens} écrans.`,
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
      ],
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
        [{ text: "OK", onPress: loadSubscriptionData }],
      );
    } catch (error) {
      console.error("❌ Erreur annulation:", error);
      Alert.alert(
        "Erreur",
        error?.response?.data?.message || "Impossible d'annuler l'abonnement",
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

      const currentTVCount = subscription.find(
        (it) => it.plan.planType === "MAIN",
      )?.usedScreens;

      const optionTVCount =
        Number(
          subscription.find((it) => it.plan.planType === "MAIN")
            ?.currentMaxScreens,
        ) - baseScreens;

      const stripeSubscriptionId = subscription.find(
        (it) => it.plan.planType === "MAIN",
      )?.stripeSubscriptionId;

      const maxScreensAfterCancel =
        subscriptionData.currentMaxScreens - currentTVCount;

      console.log(`📊 TVs actuelles: ${currentTVCount}`);
      console.log(`📊 Max après annulation: ${maxScreensAfterCancel}`);

      console.log(
        "🚀 ~ handleCancelSubscription ~ currentTVCount:",
        currentTVCount,
      );

      if (optionTVCount > 0) {
        return Alert.alert(
          "Vous avez un abonnement option",
          `Vous avez un abonnement option en cours ! Vous devez réduire vos écrans supplémentaire avant d'annuler votre abonnement principal.`,
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Allez vers Modifier ma capacité d'écran",
              onPress: () => router.navigate("/updateOptionSubscription"),
            },
          ],
        );
      }

      // Si le nombre de TVs dépasse la limite après annulation
      if (typeof currentTVCount === "number") {
        if (currentTVCount > 0) {
          const excessCount = currentTVCount - maxScreensAfterCancel;

          Alert.alert(
            "Ecrans connectés",
            `Vous avez ${currentTVCount} TV(s) connectés ! Vous devez supprimer ${currentTVCount} TV(s) avant d'annuler votre abonnement.`,
            [
              { text: "Annuler", style: "cancel" },
              {
                text: "Supprimer des TVs",
                onPress: () => router.navigate("/home/tv/MyTVScreen"),
              },
            ],
          );
        } else {
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
                    if (stripeSubscriptionId) {
                      await cancelSubscription(stripeSubscriptionId);

                      Alert.alert(
                        "Annulation prise en compte",
                        `L'annulation de votre abonnement a été pris en compte ! Vous allez recevoir un mail de confirmation`,
                        [{ text: "OK", onPress: () => router.back() }],
                      );
                    } else {
                      Alert.alert(
                        "Erreur lors de la requete",
                        `Une erreur vient de survenir, veuillez réessayez !`,
                        [{ text: "OK" }],
                      );
                    }
                  } catch (error) {
                    Alert.alert("Erreur", "Impossible d'annuler l'abonnement");
                  }
                },
              },
            ],
          );
        }
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
        style={[styles.tvItem, isSelected && styles.tvItemSelected]}
        onPress={() => toggleTVSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.tvItemLeft}>
          {/* Checkbox */}
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>

          {/* Icône TV */}
          <View
            style={[
              styles.tvIcon,
              isOnline ? styles.tvIconOnline : styles.tvIconOffline,
            ]}
          >
            <Text style={styles.tvIconText}>📺</Text>
          </View>

          {/* Infos TV */}
          <View style={styles.tvInfo}>
            <Text style={styles.tvName} numberOfLines={1}>
              {item.name || `TV ${item.code}`}
            </Text>
            <View style={styles.tvMeta}>
              <View
                style={[
                  styles.tvStatusDot,
                  { backgroundColor: isOnline ? "#10B981" : "#6B7280" },
                ]}
              />
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
        (sub) => sub.status === "ACTIVE" && sub.plan.planType === "MAIN",
      );

      if (!activeSubscription) {
        Alert.alert("Aucun abonnement", "Vous n'avez pas d'abonnement actif", [
          { text: "Souscrire", onPress: () => router.push("/PaymentScreen") },
        ]);
        setLoading(false);
        return;
      }

      // ✅ Calculer les écrans supplémentaires (addons)
      const screenAbo = subscription?.find(
        (sub) => sub.status === "ACTIVE" && sub.plan.planType === "MAIN",
      );

      const totalExtraScreens =
        Number(activeSubscription.currentMaxScreens) -
        Number(activeSubscription.plan.maxScreens);

      // ✅ Calculer le total d'écrans disponibles
      const totalMaxScreens =
        activeSubscription.currentMaxScreens + totalExtraScreens;

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

  const getStatusText = (status: string) => {
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
    const hasOpionPlan = subscription.find(
      (it) => it.plan.planType == "OPTION",
    );

    if (hasOpionPlan) {
      router.push({
        pathname: "/updateOptionSubscription",
        params: {
          currentScreens: subscriptionData.currentMaxScreens,
          usedScreens: subscriptionData.usedScreens,
        },
      });
    } else {
      router.push({
        pathname: "/OptionPaymentScreen",
        params: {
          currentScreens: subscriptionData.currentMaxScreens,
          usedScreens: subscriptionData.usedScreens,
        },
      });
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0A0E27", "#0F1642", "#0D1B4B"]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E5FF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </LinearGradient>
    );
  }

  if (!subscriptionData) {
    return (
      <LinearGradient colors={["#0A0E27", "#0F1642", "#0D1B4B"]} style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Aucun abonnement</Text>
        <Text style={styles.errorText}>
          Vous n'avez pas encore d'abonnement actif
        </Text>
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={() => router.push("/PaymentScreen")}
        >
          <Text style={styles.subscribeButtonText}>Voir les offres</Text>
        </TouchableOpacity>
      </LinearGradient>
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
    <LinearGradient colors={["#0A0E27", "#0F1642", "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E5FF" colors={["#00E5FF"]} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.02)"]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.80)" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerSubtitle}>Mon Abonnement</Text>
              <Text style={styles.headerTitle}>
                {subscriptionData.plan.name}
              </Text>
            </View>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerSubtitle}>
              {subscriptionData.plan.description}
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(subscriptionData.status) + "22", borderColor: getStatusColor(subscriptionData.status) + "55" },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(subscriptionData.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(subscriptionData.status) }]}>
                {getStatusText(subscriptionData.status)}
              </Text>
            </View>
          </View>
        </LinearGradient>

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
                      ({subscriptionData.baseScreens} +{" "}
                      {subscriptionData.extraScreens} écrans supplémentaires)
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
                <Text style={styles.billingPrice}>{totalPrice}€</Text>
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

            {/* <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
            >
              <Text style={styles.manageButtonText}>Gérer l'abonnement</Text>
            </TouchableOpacity> */}
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
                <Text style={styles.modalTitle}>
                  Sélectionner les TVs à supprimer
                </Text>
                <Text style={styles.modalSubtitle}>
                  {myTVS.length} TV(s) connectée(s) • Max après annulation:{" "}
                  {subscriptionData?.baseScreens}
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
                  Sélectionnez {myTVS.length - subscriptionData?.baseScreens}{" "}
                  TV(s) minimum
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
                    (!canProceedWithCancellation() || cancelling) &&
                      styles.confirmButtonDisabled,
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
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Remplace uniquement les styles ───────────────────────────────────────────

const C = {
  bgDeep: "#07091A",
  bgMid: "#0D1130",
  bgCard: "#111827",
  bgCardAlt: "#0F172A",
  accent: "#4F8EF7",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.25)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.10)",
  cyanBorder: "rgba(0,229,255,0.22)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.10)",
  warning: "#FFB300",
  warningDim: "rgba(255,179,0,0.12)",
  warningBorder: "rgba(255,179,0,0.28)",
  danger: "#FF5252",
  dangerDim: "rgba(255,82,82,0.10)",
  dangerBorder: "rgba(255,82,82,0.28)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

const styles = StyleSheet.create({
  // ── Base ────────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: C.bgDeep,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bgDeep,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: C.white60,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bgDeep,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.white,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 15,
    color: C.white40,
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.bgMid,
    paddingTop: 55,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  backIcon: {
    fontSize: 18,
    color: C.white,
    fontWeight: "700",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerSubtitle: {
    fontSize: 13,
    color: C.white40,
    marginBottom: 5,
    fontWeight: "500",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.5,
  },
  upgradeButton: {
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: C.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  statusContainer: {
    alignItems: "flex-start",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 4,
  },
  statusText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  statusSubtext: {
    fontSize: 12,
    color: C.white40,
  },

  // ── Metrics ─────────────────────────────────────────────────────────────────
  metricsContainer: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  metricTitle: {
    fontSize: 13,
    color: C.white40,
    marginBottom: 5,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: C.white,
  },
  metricExtra: {
    fontSize: 11,
    color: C.white40,
    marginTop: 3,
  },
  metricSubtext: {
    fontSize: 12,
    color: C.white40,
    marginTop: 4,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 20,
  },

  // Progress bar
  progressBar: {
    height: 7,
    backgroundColor: C.white10,
    borderRadius: 6,
    marginVertical: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.accent,
    borderRadius: 6,
  },

  // ── Billing card ────────────────────────────────────────────────────────────
  fullWidthCard: {
    backgroundColor: C.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  billingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  billingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
  },
  billingPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: C.white,
    textAlign: "right",
  },
  billingInterval: {
    fontSize: 13,
    color: C.white40,
    textAlign: "right",
    marginTop: 2,
  },
  billingBreakdown: {
    fontSize: 11,
    color: C.white40,
    textAlign: "right",
    marginTop: 3,
  },
  billingDivider: {
    height: 1,
    backgroundColor: C.border,
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
    color: C.white60,
  },
  billingValue: {
    fontSize: 14,
    fontWeight: "600",
    color: C.white,
  },
  manageButton: {
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 16,
  },
  manageButtonText: {
    color: C.accent,
    fontWeight: "700",
    fontSize: 15,
  },

  // ── Alerts ──────────────────────────────────────────────────────────────────
  alertContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  alertCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: C.warningBorder,
    borderLeftColor: C.warning,
    backgroundColor: C.warningDim,
  },
  alertHeader: {
    flexDirection: "row",
    marginBottom: 14,
  },
  alertIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "rgba(255,179,0,0.15)",
  },
  alertIcon: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.warning,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: C.white60,
    lineHeight: 19,
  },
  alertButton: {
    backgroundColor: "rgba(255,179,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,179,0,0.35)",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 11,
    alignSelf: "flex-start",
  },
  alertButtonText: {
    color: C.warning,
    fontWeight: "700",
    fontSize: 13,
  },

  // ── Actions ─────────────────────────────────────────────────────────────────
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 6,
  },
  dangerButton: {
    backgroundColor: C.dangerDim,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.dangerBorder,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dangerButtonText: {
    color: C.danger,
    fontWeight: "700",
    fontSize: 15,
  },
  subscribeButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 13,
    marginTop: 20,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 16,
  },

  // ── Features ────────────────────────────────────────────────────────────────
  featuresContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: C.bgCard,
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  featureIcon: {
    fontSize: 15,
    color: C.success,
    marginRight: 12,
    fontWeight: "700",
  },
  featureText: {
    fontSize: 14,
    color: C.white80,
    flex: 1,
  },

  // ── Bottom padding ───────────────────────────────────────────────────────────
  bottomPadding: {
    height: 40,
  },

  // ── Modal overlay ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: C.border,
  },

  // ── Modal header ─────────────────────────────────────────────────────────────
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.white,
    marginBottom: 4,
    maxWidth: width * 0.65,
  },
  modalSubtitle: {
    fontSize: 13,
    color: C.white40,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Info bar ─────────────────────────────────────────────────────────────────
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 13,
  },
  infoBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  infoBarText: {
    fontSize: 13,
    color: C.accent,
    flex: 1,
  },
  selectionBadge: {
    backgroundColor: C.accent,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 10,
  },
  selectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.white,
  },

  // ── Quick select ─────────────────────────────────────────────────────────────
  quickSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 13,
    gap: 7,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.cyan,
  },

  // ── TV list ──────────────────────────────────────────────────────────────────
  tvList: {
    padding: 16,
    paddingTop: 10,
  },
  tvItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.white05,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  tvItemSelected: {
    backgroundColor: C.dangerDim,
    borderColor: C.dangerBorder,
  },
  tvItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.white20,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: C.danger,
    borderColor: C.danger,
  },
  tvIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  tvIconOnline: {
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.22)",
  },
  tvIconOffline: {
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
  },
  tvIconText: {
    fontSize: 22,
  },
  tvInfo: {
    flex: 1,
  },
  tvName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.white,
    marginBottom: 4,
  },
  tvMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tvStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tvStatus: {
    fontSize: 12,
    color: C.white40,
  },
  tvCode: {
    fontSize: 12,
    color: C.white40,
  },
  tvLastSeen: {
    fontSize: 11,
    color: C.white20,
    marginTop: 2,
  },
  selectedBadge: {
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.danger,
  },
  emptyList: {
    padding: 40,
    alignItems: "center",
  },
  emptyListText: {
    fontSize: 15,
    color: C.white40,
  },

  // ── Modal footer ─────────────────────────────────────────────────────────────
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  footerInfo: {
    gap: 5,
  },
  footerInfoText: {
    fontSize: 13,
    color: C.white40,
  },
  footerInfoValue: {
    fontWeight: "700",
    color: C.white,
  },
  footerWarning: {
    fontSize: 12,
    color: C.danger,
    fontWeight: "600",
  },
  footerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.white60,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: C.danger,
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white,
  },

  // ── Misc ─────────────────────────────────────────────────────────────────────
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
    borderColor: C.white10,
  },
  progressTextContainer: {
    position: "absolute",
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "700",
    color: C.white,
  },
});

export default SubscriptionScreen;
