// screens/MyTelevisionsScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "@/scripts/fetch.api";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { socket } from "@/scripts/socket.io";
import { useAuth } from "@/scripts/AuthContext";

// Types basés sur votre schéma Prisma
interface Television {
  id: string;
  name: string;
  deviceId: string | null;
  location: string | null;
  description: string | null;
  resolution: string;
  orientation: string;
  status: "ONLINE" | "OFFLINE" | "PLAYING" | "PAUSED" | "ERROR";
  lastSeen: string | null;
  playlists: PlaylistTelevision[];
}

interface PlaylistTelevision {
  id: string;
  isActive: boolean;
  priority: number;
  playlist: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
}

// Composant SwipeableCard personnalisé
const SwipeableCard: React.FC<{
  children: React.ReactNode;
  onDelete: () => void;
}> = ({ children, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          Animated.timing(translateX, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const reset = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -500,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDelete();
    });
  };

  return (
    <View style={styles.swipeableContainer}>
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.swipeableContent,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export default function MyTelevisionsScreen() {
  const [televisions, setTelevisions] = useState<Television[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user , subscription } = useAuth()

  // Charger les télévisions
  const fetchTelevisions = useCallback(async () => {
    try {
      const response = await api.get("/televisions/me");
      setTelevisions(response.data);
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message || "Impossible de charger les télévisions"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelevisions();
  }, [fetchTelevisions]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTelevisions();
  }, [fetchTelevisions]);

  // Supprimer une télévision
  const handleDelete = useCallback((tv: Television) => {
    Alert.alert(
      "Supprimer la télévision",
      `Voulez-vous vraiment supprimer "${tv.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await api.get(`/televisions/${tv.id}/user/dissociated`);
              setTelevisions((prev) => prev.filter((t) => t.id !== tv.id));

              socket.emit("leave-room", {
                roomName: "tv:" + tv.id,
                tvId: tv.id,
              });



              Alert.alert("Succès", "Télévision supprimée");
            } catch (error: any) {
              Alert.alert(
                "Erreur",
                error.response?.data?.message || "Impossible de supprimer"
              );
            }
          },
        },
      ]
    );
  }, []);

  // Obtenir l'icône de statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ONLINE":
        return { name: "checkmark-circle", color: "#10B981" };
      case "OFFLINE":
        return { name: "close-circle", color: "#6B7280" };
      case "PLAYING":
        return { name: "play-circle", color: "#3B82F6" };
      case "PAUSED":
        return { name: "pause-circle", color: "#F59E0B" };
      case "ERROR":
        return { name: "alert-circle", color: "#EF4444" };
      default:
        return { name: "help-circle", color: "#9CA3AF" };
    }
  };

  // Obtenir le texte de statut
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      ONLINE: "En ligne",
      OFFLINE: "Hors ligne",
      PLAYING: "En lecture",
      PAUSED: "En pause",
      ERROR: "Erreur",
    };
    return statusMap[status] || status;
  };

  // Format de la dernière connexion
  const formatLastSeen = (date: string) => {
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    return lastSeen.toLocaleDateString("fr-FR");
  };

  // Rendu d'une carte de télévision
  const renderTelevisionItem = ({ item }: { item: Television }) => {
    const statusIcon = getStatusIcon(item.status);
    const activePlaylist = item.playlists.find((p) => p.isActive);

    return (
      <SwipeableCard onDelete={() => handleDelete(item)}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="tv-outline" size={24} color="#1F2937" />
              <Text style={styles.tvName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons
                name={statusIcon.name as any}
                size={16}
                color={statusIcon.color}
              />
              <Text style={[styles.statusText, { color: statusIcon.color }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>

          {/* Informations */}
          <View style={styles.infoContainer}>
            {item.location && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.infoText}>{item.location}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="resize-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {item.resolution} • {item.orientation}
              </Text>
            </View>

            {item.lastSeen && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.infoText}>
                  Vu {formatLastSeen(item.lastSeen)}
                </Text>
              </View>
            )}
          </View>

          {/* Playlist en cours */}
          {activePlaylist ? (
            <View style={styles.playlistContainer}>
              <View style={styles.playlistHeader}>
                <Ionicons name="list-outline" size={16} color="#3B82F6" />
                <Text style={styles.playlistLabel}>Playlist en cours</Text>
              </View>
              <Text style={styles.playlistName} numberOfLines={1}>
                {activePlaylist.playlist.name}
              </Text>
              {activePlaylist.playlist.description && (
                <Text style={styles.playlistDescription} numberOfLines={2}>
                  {activePlaylist.playlist.description}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.noPlaylistContainer}>
              <Ionicons
                name="musical-notes-outline"
                size={16}
                color="#9CA3AF"
              />
              <Text style={styles.noPlaylistText}>Aucune playlist active</Text>
            </View>
          )}

          {/* Nombre de playlists */}
          {item.playlists.length > 0 && (
            <View style={styles.playlistCount}>
              <Text style={styles.playlistCountText}>
                {item.playlists.length} playlist
                {item.playlists.length > 1 ? "s" : ""} associée
                {item.playlists.length > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </SwipeableCard>
    );
  };

  // État de chargement
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Liste vide
  if (televisions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{...styles.backButton, width: 100}}
          activeOpacity={0.7}

        >
          <Text>Retour</Text>
        </TouchableOpacity>

        <Ionicons name="tv-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucune télévision</Text>
        <Text style={styles.emptySubtitle}>
          Ajoutez votre première télévision pour commencer
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Mes Télévisions</Text>
          <Text style={styles.headerSubtitle}>
            {televisions.length} appareil{televisions.length > 1 ? "s" : ""}
          </Text>
        </View>

        {/* Espace pour équilibrer le layout (optionnel) */}
        <View style={styles.headerRight} />
      </View>

      {/* Liste */}
      <FlatList
        data={televisions}
        renderItem={renderTelevisionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  headerRight: {
    width: 40,
  },

  listContent: {
    padding: 16,
  },
  swipeableContainer: {
    position: "relative",
    marginBottom: 12,
  },
  swipeableContent: {
    backgroundColor: "#fff",
  },
  deleteButtonContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  tvName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  infoContainer: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  playlistContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  playlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  playlistLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  playlistName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  noPlaylistContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  noPlaylistText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginLeft: 8,
    fontStyle: "italic",
  },
  playlistCount: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  playlistCountText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  separator: {
    height: 12,
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    height: "100%",
    borderRadius: 12,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
