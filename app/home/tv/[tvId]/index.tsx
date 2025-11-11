import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
} from "react-native";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import EditTvModal from "./EditModal";

interface TvDetailsProps {
  data: any; // Remplacez par votre interface TV
}

const TvDetailsScreen: React.FC<TvDetailsProps> = () => {
  const { tvId, item } = useLocalSearchParams();

  // Désérialiser les données
  const data = item ? JSON.parse(item as string) : null;

  // Formatage des données
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "#10B981";
      case "OFFLINE":
        return "#EF4444";
      default:
        return "#F59E0B";
    }
  };

  const getResolutionIcon = (resolution: string) => {
    switch (resolution) {
      case "HD_1080P":
        return "high-definition";
      case "4K":
        return "video-4k";
      default:
        return "television";
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "#EF4444"; // Rouge - Très haute
    if (priority >= 6) return "#F59E0B"; // Orange - Haute
    if (priority >= 4) return "#3B82F6"; // Bleu - Moyenne
    return "#6B7280"; // Gris - Basse
  };

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentData, setCurrentData] = useState(data);

  const handleEditSave = (updatedData: any) => {
    setCurrentData(updatedData);
    // Ici vous pouvez faire un appel API pour sauvegarder
    console.log("Données mises à jour:", updatedData);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Header avec gradient */}
      <LinearGradient colors={["#1F2937", "#374151"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{data.name}</Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(data.status) },
                ]}
              />
              <Text style={styles.statusText}>{data.status}</Text>
              <Text style={styles.codeConnection}>#{data.codeConnection}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => setIsEditModalVisible(true)} style={styles.settingsButton}>
            <MaterialIcons name="edit" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Informations principales */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="television"
              size={24}
              color="#3B82F6"
            />
            <Text style={styles.cardTitle}>Informations générales</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="identifier"
                size={20}
                color="#6B7280"
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Device ID</Text>
                <Text style={styles.infoValue}>{data.deviceId}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="location-on" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Localisation</Text>
                <Text style={styles.infoValue}>{data.location}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name={getResolutionIcon(data.resolution)}
                size={20}
                color="#6B7280"
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Résolution</Text>
                <Text style={styles.infoValue}>
                  {data.resolution.replace("_", " ")}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name={
                  data.orientation === "LANDSCAPE" ? "tablet" : "tablet-ipad"
                }
                size={20}
                color="#6B7280"
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Orientation</Text>
                <Text style={styles.infoValue}>{data.orientation}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Paramètres de lecture 
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="play-arrow" size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Paramètres de lecture</Text>
          </View>

          <View style={styles.settingsContainer}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="volume-up" size={20} color="#6B7280" />
                <Text style={styles.settingLabel}>Volume: {data.volume}%</Text>
              </View>
              <View style={styles.volumeBar}>
                <View
                  style={[styles.volumeProgress, { width: `${data.volume}%` }]}
                />
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="autorenew" size={20} color="#6B7280" />
                <Text style={styles.settingLabel}>Lecture automatique</Text>
              </View>
              <Switch
                value={data.autoPlay}
                trackColor={{ false: "#E5E7EB", true: "#DBEAFE" }}
                thumbColor={data.autoPlay ? "#3B82F6" : "#9CA3AF"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="loop" size={20} color="#6B7280" />
                <Text style={styles.settingLabel}>Boucle</Text>
              </View>
              <Switch
                value={data.loop}
                trackColor={{ false: "#E5E7EB", true: "#DBEAFE" }}
                thumbColor={data.loop ? "#3B82F6" : "#9CA3AF"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons
                  name="transition"
                  size={20}
                  color="#6B7280"
                />
                <Text style={styles.settingLabel}>Transition</Text>
              </View>
              <View style={styles.transitionBadge}>
                <Text style={styles.transitionText}>{data.transition}</Text>
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="refresh" size={20} color="#6B7280" />
                <Text style={styles.settingLabel}>
                  Taux de rafraîchissement
                </Text>
              </View>
              <Text style={styles.settingValue}>{data.refreshRate} Hz</Text>
            </View>
          </View>
        </View>*/}

        {/* Playlists assignées */}
        {data.playlists && data.playlists.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="playlist-play"
                size={24}
                color="#8B5CF6"
              />
              <Text style={styles.cardTitle}>
                Playlists assignées ({data.playlists.length})
              </Text>
            </View>

            {data.playlists.map((item: any, index: number) => (
              <TouchableOpacity
                key={item.id}
                style={styles.playlistItem}
                onPress={() =>
                  router.navigate(`/home/playlists/view/${item.playlist.id}`)
                }
              >
                <View style={styles.playlistHeader}>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>
                      {item.playlist.name}
                    </Text>
                    <Text style={styles.playlistDescription}>
                      {item.playlist.description}
                    </Text>
                  </View>

                  <View style={styles.playlistMeta}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(item.priority) },
                      ]}
                    >
                      <Text style={styles.priorityText}>P{item.priority}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.playlistFooter}>
                  <View style={styles.playlistStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: item.playlist.isActive
                            ? "#10B981"
                            : "#EF4444",
                          width: 8,
                          height: 8,
                        },
                      ]}
                    />
                    <Text style={styles.playlistStatusText}>
                      {item.playlist.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>

                  <View style={styles.playlistModes}>
                    {item.playlist.shuffleMode && (
                      <View style={styles.modeBadge}>
                        <MaterialIcons
                          name="shuffle"
                          size={12}
                          color="#6B7280"
                        />
                        <Text style={styles.modeText}>Aléatoire</Text>
                      </View>
                    )}
                    <View style={styles.modeBadge}>
                      <MaterialIcons
                        name={
                          item.playlist.repeatMode === "LOOP"
                            ? "repeat"
                            : "repeat-one"
                        }
                        size={12}
                        color="#6B7280"
                      />
                      <Text style={styles.modeText}>
                        {item.playlist.repeatMode}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.assignedDate}>
                    Assignée le {formatDate(item.assignedAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Métadonnées */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info-outline" size={24} color="#6B7280" />
            <Text style={styles.cardTitle}>Métadonnées</Text>
          </View>

          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Créée le</Text>
              <Text style={styles.metadataValue}>
                {formatDate(data.createdAt)}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Dernière modification</Text>
              <Text style={styles.metadataValue}>
                {formatDate(data.updatedAt)}
              </Text>
            </View>

            {data.lastSeen && (
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Dernière activité</Text>
                <Text style={styles.metadataValue}>
                  {formatDate(data.lastSeen)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.actionsContainer}>
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() =>
              Alert.alert("Contrôler", "Ouvrir le panneau de contrôle")
            }
          >
            <MaterialIcons name="control-camera" size={20} color="white" />
            <Text style={styles.actionButtonText}>Contrôler</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => setIsEditModalVisible(true)}
          >
            <MaterialIcons name="edit" size={20} color="#3B82F6" />
            <Text style={[styles.actionButtonText, { color: "#3B82F6" }]}>
              Modifier
            </Text>
          </TouchableOpacity>

          <EditTvModal
            visible={isEditModalVisible}
            data={currentData}
            onClose={() => setIsEditModalVisible(false)}
            onSave={handleEditSave}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  codeConnection: {
    color: "#D1D5DB",
    fontSize: 12,
    marginLeft: 8,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 8,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    marginTop: 2,
  },
  settingsContainer: {
    gap: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  volumeBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginLeft: 12,
  },
  volumeProgress: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  transitionBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  transitionText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  playlistItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  playlistHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  playlistDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  playlistMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  priorityText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  playlistFooter: {
    gap: 8,
  },
  playlistStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  playlistStatusText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 6,
  },
  playlistModes: {
    flexDirection: "row",
    gap: 8,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeText: {
    fontSize: 10,
    color: "#6B7280",
    marginLeft: 2,
  },
  assignedDate: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  metadataContainer: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metadataLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  metadataValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryAction: {
    backgroundColor: "#3B82F6",
  },
  secondaryAction: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
});

export default TvDetailsScreen;
