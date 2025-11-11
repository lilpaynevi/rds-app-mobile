import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { getAuthToken, myPlaylists } from "@/requests/playlists.requests";
import api from "@/scripts/fetch.api";

export default function PlaylistDetailScreen() {
  const [playlistsByTv, setPlaylistsByTv] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTvs, setExpandedTvs] = useState({});

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const fetch = await myPlaylists();
      const formattedPlaylists = fetch.map((it) => {
    console.log("🚀 ~ loadPlaylists ~ it:", it.televisions?.[0])
    return ({
        id: it.id,
        title: it.name,
        description: it.description,
        mediaCount: it.items.length,
        duration: "",
        televisionId: it.televisions?.[0]?.televisionId || "Non assignée",
        televisionName: it.televisions?.[0]?.television.name || "Non assignée",
        status: it.isActive ? "active" : "inactive", // Adapter selon votre logique
        lastModified: it.updatedAt,
    });
});

      // Grouper par télévision
      const groupedByTv = formattedPlaylists.reduce((acc, playlist) => {
        const tvKey = playlist.televisionId;
        if (!acc[tvKey]) {
          acc[tvKey] = {
            tvId: playlist.televisionId,
            tvName: playlist.televisionName,
            playlists: [],
            activePlaylist: null,
          };
        }
        acc[tvKey].playlists.push(playlist);
        
        // Définir la playlist active (vous pouvez adapter cette logique)
        if (playlist.status === "active") {
          acc[tvKey].activePlaylist = playlist;
        }
        
        return acc;
      }, {});

      // Trier les playlists dans chaque groupe par statut puis par date
      Object.keys(groupedByTv).forEach(tvKey => {
        groupedByTv[tvKey].playlists.sort((a, b) => {
          if (a.status === "active" && b.status !== "active") return -1;
          if (b.status === "active" && a.status !== "active") return 1;
          return new Date(b.lastModified) - new Date(a.lastModified);
        });
      });

      setPlaylistsByTv(groupedByTv);
    } catch (error) {
      console.error("Erreur lors du chargement des playlists:", error);
      Alert.alert("Erreur", "Impossible de charger les playlists");
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlaylists();
    setRefreshing(false);
  };

  const toggleTvExpansion = (tvId) => {
    setExpandedTvs(prev => ({
      ...prev,
      [tvId]: !prev[tvId]
    }));
  };

  const handlePlaylistPress = (playlist) => {
    return router.navigate(`/home/playlists/view/${playlist.id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "inactive":
        return "#9E9E9E";
      case "scheduled":
        return "#FF9800";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Actif";
      case "inactive":
        return "Inactif";
      case "scheduled":
        return "Programmé";
      default:
        return "Inconnu";
    }
  };

  const confirmDeletePlaylist = (playlistId) => {
    Alert.alert("Supprimer la playlist", "Voulez-vous vraiment supprimer cette playlist ?", [
      {
        text: "Annuler",
        style: "cancel",
      },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => deletePlaylist(playlistId),
      },
    ]);
  };

  const deletePlaylist = async (playlistId) => {
    try {
      const response = await api.delete(`/playlists/${playlistId}`);

      if (response.status === 200) {
        // Recharger les données après suppression
        await loadPlaylists();
        Alert.alert("Succès", "Playlist supprimée avec succès");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", "Impossible de supprimer la playlist");
    }
  };

  const renderPlaylistItem = (playlist) => (
    <TouchableOpacity
      key={playlist.id}
      style={styles.playlistCard}
      onPress={() => handlePlaylistPress(playlist)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={playlist.status === "active" ? ["#e8f5e8", "#f0f8f0"] : ["#ffffff", "#f8f9fa"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <View style={styles.playlistTitleRow}>
                <Text style={styles.playlistTitle} numberOfLines={1}>
                  {playlist.title}
                </Text>
                {playlist.status === "active" && (
                  <View style={styles.activeBadge}>
                    <Ionicons name="radio-button-on" size={12} color="#4CAF50" />
                    <Text style={styles.activeBadgeText}>EN COURS</Text>
                  </View>
                )}
              </View>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(playlist.status) },
                  ]}
                />
                <Text style={styles.statusText}>
                  {getStatusText(playlist.status)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => confirmDeletePlaylist(playlist.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-bin-outline" size={20} color="#ff6b6b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.playlistDescription} numberOfLines={2}>
            {playlist.description || "Aucune description"}
          </Text>

          <View style={styles.infoContainer}>
            <View style={styles.infoGroup}>
              <View style={styles.infoItem}>
                <Ionicons name="film-outline" size={16} color="#6c757d" />
                <Text style={styles.infoText}>
                  {playlist.mediaCount} {playlist.mediaCount > 1 ? "médias" : "média"}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={16} color="#6c757d" />
                <Text style={styles.infoText}>
                  {playlist.duration || "Durée variable"}
                </Text>
              </View>
            </View>

            <Text style={styles.lastModified}>
              <Ionicons name="calendar-clear-outline" size={14} color="#adb5bd" />{" "}
              {new Date(playlist.lastModified).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderTvSection = (tvData, tvId) => {
    const isExpanded = expandedTvs[tvId];
    const playlistsToShow = isExpanded ? tvData.playlists : [tvData.activePlaylist].filter(Boolean);
    console.log("🚀 ~ renderTvSection ~ tvData.activePlaylist:", tvData.activePlaylist)
    
    return (
      <View key={tvId} style={styles.tvSection}>
        <TouchableOpacity
          style={styles.tvHeader}
          onPress={() => toggleTvExpansion(tvId)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["#1B2845", "#2c3e50"]}
            style={styles.tvHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.tvHeaderContent}>
              <View style={styles.tvTitleContainer}>
                <Ionicons name="tv-outline" size={20} color="#fff" />
                <Text style={styles.tvTitle}>{tvData.tvName}</Text>
                <View style={styles.tvBadge}>
                  <Text style={styles.tvBadgeText}>{tvData.playlists.length}</Text>
                </View>
              </View>
              
              <View style={styles.tvActions}>
                {tvData.activePlaylist && (

                  <View style={styles.activeIndicator}>
                    <Ionicons name="radio-button-on" size={16} color="#4CAF50" />
                  </View>
                )}
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#fff" 
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {tvData.activePlaylist && !isExpanded && (
          <View style={styles.activePlaylistPreview}>
            <Text style={styles.activePlaylistLabel}>📡 Playlist active :</Text>
            {renderPlaylistItem(tvData.activePlaylist)}
          </View>
        )}

        {isExpanded && (
          <View style={styles.playlistsList}>
            {playlistsToShow.map(playlist => renderPlaylistItem(playlist))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1B2845" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes Playlists</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="musical-notes" size={48} color="#1B2845" />
          <Text style={styles.loadingText}>Chargement des playlists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalTvs = Object.keys(playlistsByTv).length;
  const totalActivePlaylists = Object.values(playlistsByTv).filter(tv => tv.activePlaylist).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1B2845" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Playlists</Text>
        <TouchableOpacity
          onPress={() => router.push("/home/playlists/add")}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {totalTvs > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="tv" size={16} color="#1B2845" />
            <Text style={styles.statText}>{totalTvs} TV{totalTvs > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="radio-button-on" size={16} color="#4CAF50" />
            <Text style={styles.statText}>{totalActivePlaylists} Active{totalActivePlaylists > 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      {totalTvs === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="#dee2e6" />
          <Text style={styles.emptyTitle}>Aucune playlist trouvée</Text>
          <Text style={styles.emptySubtitle}>
            Créez votre première playlist en appuyant sur le bouton "+"
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1B2845"]}
              progressBackgroundColor="#fff"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(playlistsByTv)
            .sort(([,a], [,b]) => (b.activePlaylist ? 1 : 0) - (a.activePlaylist ? 1 : 0))
            .map(([tvId, tvData]) => renderTvSection(tvData, tvId))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/home/playlists/add")}
        activeOpacity={0.8}
      >
        <LinearGradient colors={["#1B2845", "#1B2845"]} style={styles.fabGradient}>
          <Ionicons name="add" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, y: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1B2845",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 24,
  },
  addButton: {
    backgroundColor: "#1B2845",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1B2845",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#6c757d",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  tvSection: {
    marginBottom: 20,
  },
  tvHeader: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tvHeaderGradient: {
    padding: 16,
  },
  tvHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tvTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tvTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 10,
    flex: 1,
  },
  tvBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
  },
  tvBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  tvActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeIndicator: {
    marginRight: 10,
  },
  activePlaylistPreview: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  activePlaylistLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
    marginBottom: 8,
  },
  playlistsList: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  playlistCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 16,
  },
  cardContent: {
    backgroundColor: "transparent",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
  },
  playlistTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    flex: 1,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e8",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#6c757d",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 6,
    marginLeft: 10,
  },
  playlistDescription: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 18,
    marginBottom: 12,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoGroup: {
    flexDirection: "row",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  infoText: {
    fontSize: 12,
    color: "#6c757d",
    marginLeft: 4,
  },
  lastModified: {
    fontSize: 11,
    color: "#adb5bd",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6c757d",
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#adb5bd",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 250,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#1B2845",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 28,
  },
});
