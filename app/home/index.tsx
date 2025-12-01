// screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  RefreshControl,
  Button,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useAuth } from "@/scripts/AuthContext";
import api from "@/scripts/fetch.api";
import { socket } from "@/scripts/socket.io";

interface Television {
  id: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "PLAYING";
  lastSeen: string;
  playlists?: any[];
  ipAddress: string;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  action: () => void;
}

const HomeScreen = () => {
  const { user, subscription, getSubscription } = useAuth();
  const [televisions, setTelevisions] = useState<Television[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("Utilisateur");

  const [reName, setRename] = useState(null);

  const abonnmentRender = () => {
    if (subscription.find((it) => it.plan.planType === "OPTION")) {
      return router.navigate("/updateOptionSubscription");
    }

    if (subscription.length > 0) {
      return router.navigate("/OptionPaymentScreen");
    }

    return router.navigate("/PaymentScreen");
  };

  // Actions rapides
  const quickActions: QuickAction[] = [
    {
      id: "1",
      title:
        subscription?.length > 0
          ? "Augmentez ma capacité d'écrans"
          : "M'abonner",
      icon: "card",
      color: "#5941A9",
      action: abonnmentRender,
    },
    {
      id: "2",
      title: "Mes playlists",
      icon: "list",
      color: "#2196F3",
      action: () => router.navigate("/home/playlists"),
    },

    {
      id: "4",
      title: "Gérer mes télévisions",
      icon: "settings",
      color: "#6b983dff",
      action: () => router.navigate("/home/tv/MyTVScreen"),
    },
  ];

  // Charger les données
  const loadData = async () => {
    try {
      setLoading(true);

      // Récupérer le nom d'utilisateur
      const storedName = await AsyncStorage.getItem("userName");
      if (storedName) setUserName(storedName);

      // Récupérer les télévisions (simulé)
      // TODO: Remplacer par un vrai appel API
      // const mockTVs: Television[] = [
      //   {
      //     id: "tv-001",
      //     name: "TV Restaurant Hall",
      //     status: "ONLINE",
      //     lastSeen: new Date().toISOString(),
      //     ipAddress: "192.168.1.45",
      //   },
      //   {
      //     id: "tv-002",
      //     name: "TV Cuisine",
      //     status: "PLAYING",
      //     lastSeen: new Date().toISOString(),
      //     currentContent: "Playlist Musique Ambiance",
      //     ipAddress: "192.168.1.67",
      //   },
      //   {
      //     id: "tv-003",
      //     name: "TV Terrasse",
      //     status: "OFFLINE",
      //     lastSeen: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      //     ipAddress: "192.168.1.89",
      //   },
      // ];

      const mockTVs = await api.get("/televisions/me");

      setTelevisions(mockTVs.data);
    } catch (error) {
      console.error("Erreur chargement données:", error);
      Alert.alert("Erreur", "Impossible de charger les données");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Actualiser les données
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    getSubscription();
  };

  // Charger au focus de l'écran
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // Gérer le clic sur une TV
  const handleTVPress = (tv: Television) => {
    if (tv.status === "OFFLINE") {
      Alert.alert(
        "TV hors ligne",
        `${tv.name} n'est pas connectée. Vérifiez qu'elle est allumée et connectée au réseau.`,
        [{ text: "OK" }]
      );
      return;
    }

    router.push(
      `/home/tv/${tv.id}?item=${encodeURIComponent(JSON.stringify(tv))}`
    );
  };

  // Actions rapides sur une TV
  const handleTVLongPress = (tv: Television) => {
    const actions = [
      // { text: "Contrôler", onPress: () => handleTVPress(tv) },
      // { text: "Renommer", onPress: () => setRename(tv.id) },
      // {
      //   text: "Voir détails",
      //   onPress: () => router.navigate("TVDetails", { tv }),
      // },
      {
        text: "Supprimer",
        onPress: () => confirmDeleteTV(tv),
        style: "destructive",
      },
      { text: "Annuler", style: "cancel" },
    ];

    Alert.alert(`${tv.name}`, "Que voulez-vous faire ?", actions);
  };

  // Confirmer suppression TV
  const confirmDeleteTV = (tv: Television) => {
    Alert.alert(
      "Supprimer la télévision",
      `Êtes-vous sûr de vouloir supprimer "${tv.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteTV(tv.id),
        },
      ]
    );
  };

  // Supprimer une TV
  const deleteTV = async (tvId: string) => {
    try {
      const deleteTVrq = await api.get(
        "/televisions/" + tvId + "/user/dissociated"
      );
      if (deleteTVrq) {
        setTelevisions((prev) => prev.filter((tv) => tv.id !== tvId));

        socket.emit("leave-room", { roomName: "tv:" + tvId, tvId });

        Alert.alert("✅", "Télévision supprimée");
      }
    } catch (error) {
      Alert.alert("Erreur", error.message);
    }
  };

  // Rendu d'une télévision
  const renderTelevision = (tv: Television) => {
    const statusColor = {
      ONLINE: "#4CAF50",
      OFFLINE: "#F44336",
      PLAYING: "#FF9800",
    }[tv.status];

    const statusText = {
      ONLINE: "En ligne",
      OFFLINE: "Hors ligne",
      PLAYING: "En lecture",
    }[tv.status];

    return (
      <TouchableOpacity
        key={tv.id}
        style={[styles.tvCard, { borderLeftColor: statusColor }]}
        onPress={() => handleTVPress(tv)}
        onLongPress={() => handleTVLongPress(tv)}
        activeOpacity={0.7}
      >
        <View style={styles.tvCardContent}>
          <View style={styles.tvHeader}>
            <View style={styles.tvInfo}>
              <Text style={styles.tvName}>{tv.name}</Text>
              <Text style={styles.tvIP}>{tv.ipAddress}</Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>

          {tv.playlists?.length > 0 && (
            <View style={styles.currentContent}>
              <Ionicons name="play-circle" size={16} color="#666" />
              <Text style={styles.currentContentText}>
                {tv.playlists[0].playlist.name}
              </Text>
            </View>
          )}

          <View style={styles.tvFooter}>
            <Text style={styles.lastSeen}>
              Dernière activité:{" "}
              {new Date(tv.updatedAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Ionicons
              name={tv.status === "OFFLINE" ? "tv-outline" : "tv"}
              size={24}
              color={statusColor}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Rendu d'une action rapide
  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.quickActionCard, { backgroundColor: action.color + "15" }]}
      onPress={action.action}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
        <Ionicons name={action.icon as any} size={24} color="white" />
      </View>
      <Text style={styles.quickActionTitle}>{action.title}</Text>
    </TouchableOpacity>
  );

  const addTV = async () => {
    if (subscription && subscription.length === 0) {
      return Alert.alert(
        "Besoin d'un abonnement? ",
        "Vous ne disposez pas d'abonnement pour pouvoir ajouter une TV actuellement ! ",
        [
          {
            text: "Voir les abonnements",
            onPress: () => router.navigate("/PaymentScreen"),
          },
        ]
      );
    }
    router.navigate("/home/tv/addTV");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header avec gradient */}
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>
              {user?.firstName + " " + user?.lastName} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.navigate("/home/profile")}
          >
            <Ionicons name="person-circle" size={40} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats rapides */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{televisions.length}</Text>
            <Text style={styles.statLabel}>Télévisions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {televisions.filter((tv) => tv.status !== "OFFLINE").length}
            </Text>
            <Text style={styles.statLabel}>En ligne</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {televisions.filter((tv) => tv.status === "PLAYING").length}
            </Text>
            <Text style={styles.statLabel}>En lecture</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
            {subscription &&
              subscription.length > 0 &&
              renderQuickAction({
                id: "3",
                title: "Voir mon abonnement",
                icon: "tv",
                color: "#363E49",
                action: () => router.navigate("/home/profile/subscription"),
              })}
          </View>
        </View>

        {/* Mes télévisions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {subscription && subscription.length > 0 && (
              <Text style={styles.sectionTitle}>
                Mes télévisions (
                {
                  subscription.find((it) => it.plan.planType == "MAIN")
                    ?.usedScreens
                }
                /
                {
                  subscription.find((it) => it.plan.planType === "MAIN")
                    ?.currentMaxScreens
                }
                )
              </Text>
            )}

            {subscription && subscription.length === 0 && (
              <Text style={styles.sectionTitle}>Mes télévisions</Text>
            )}

            <TouchableOpacity onPress={addTV} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color="#4CAF50" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : televisions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="tv-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Aucune télévision</Text>
              <Text style={styles.emptySubtitle}>
                Commencez par ajouter une télévision
              </Text>
              <TouchableOpacity style={styles.scanButton} onPress={addTV}>
                <Ionicons name="scan" size={20} color="white" />
                <Text style={styles.scanButtonText}>
                  Ajouter une télévision
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.televisionsContainer}>
              {televisions.map(renderTelevision)}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    height: "100%",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: "#ccc",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
  scrollView: {
    height: "140%",
  },
  section: {
    marginTop: 50,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50" + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 4,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  televisionsContainer: {
    gap: 12,
  },
  tvCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tvCardContent: {
    padding: 16,
  },
  tvHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tvInfo: {
    flex: 1,
  },
  tvName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  tvIP: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  currentContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  currentContentText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    flex: 1,
  },
  tvFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastSeen: {
    fontSize: 12,
    color: "#999",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default HomeScreen;
