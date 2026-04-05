import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import EditTvModal from "./EditModal";
import { dissociatedUser } from "@/requests/tv.requests";

// ─── Palette (same as HomeScreen) ────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  accent: "#4F8EF7",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.28)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.10)",
  cyanBorder: "rgba(0,229,255,0.25)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.12)",
  successBorder: "rgba(0,230,118,0.28)",
  error: "#FF5252",
  errorDim: "rgba(255,82,82,0.12)",
  errorBorder: "rgba(255,82,82,0.28)",
  warning: "#FFB74D",
  warningDim: "rgba(255,183,77,0.12)",
  warningBorder: "rgba(255,183,77,0.28)",
  purple: "#7C4DFF",
  purpleDim: "rgba(124,77,255,0.12)",
  purpleBorder: "rgba(124,77,255,0.28)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dim: string; border: string }> = {
  ONLINE: { label: "En ligne", color: C.success, dim: C.successDim, border: C.successBorder },
  PLAYING: { label: "En lecture", color: C.warning, dim: C.warningDim, border: C.warningBorder },
  OFFLINE: { label: "Hors ligne", color: C.error, dim: C.errorDim, border: C.errorBorder },
};

interface TvDetailsProps {
  data: any;
}

const TvDetailsScreen: React.FC<TvDetailsProps> = () => {
  const { item } = useLocalSearchParams();
  const data = item ? JSON.parse(item as string) : null;

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentData, setCurrentData] = useState(data);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getResolutionIcon = (resolution: string) => {
    switch (resolution) {
      case "HD_1080P": return "high-definition";
      case "4K": return "video-4k";
      default: return "television";
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return C.error;
    if (priority >= 6) return C.warning;
    if (priority >= 4) return C.accent;
    return C.white40;
  };

  const handleEditSave = (updatedData: any) => {
    setCurrentData(updatedData);
    console.log("Données mises à jour:", updatedData);
  };

  const cfg = STATUS_CONFIG[data?.status] ?? STATUS_CONFIG["OFFLINE"];

  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <LinearGradient
          colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.02)"]}
          style={s.header}
        >
          <View style={s.headerRow}>
            <TouchableOpacity
              style={s.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={C.white80} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={s.headerTitle}>{data.name}</Text>
              <View style={s.statusRow}>
                <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
                <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={s.codeConnection}>#{data.codeConnection}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.editButton}
              onPress={() => setIsEditModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={C.accent} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* ── Informations générales ── */}
          <View style={s.section}>
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[s.card, { borderColor: C.accentBorder }]}
            >
              <View style={s.cardHeader}>
                <View style={[s.cardIconWrap, { backgroundColor: C.accentDim, borderColor: C.accentBorder }]}>
                  <Ionicons name="tv-outline" size={18} color={C.accent} />
                </View>
                <Text style={s.cardTitle}>Informations générales</Text>
              </View>

              <View style={s.infoGrid}>
                {data.deviceId ? (
                  <View style={s.infoItem}>
                    <Ionicons name="finger-print-outline" size={18} color={C.white40} />
                    <View style={s.infoContent}>
                      <Text style={s.infoLabel}>Device ID</Text>
                      <Text style={s.infoValue}>{data.deviceId}</Text>
                    </View>
                  </View>
                ) : null}

                {data.location ? (
                  <View style={s.infoItem}>
                    <Ionicons name="location-outline" size={18} color={C.white40} />
                    <View style={s.infoContent}>
                      <Text style={s.infoLabel}>Localisation</Text>
                      <Text style={s.infoValue}>{data.location}</Text>
                    </View>
                  </View>
                ) : null}

                {data.ipAddress ? (
                  <View style={s.infoItem}>
                    <Ionicons name="wifi-outline" size={18} color={C.white40} />
                    <View style={s.infoContent}>
                      <Text style={s.infoLabel}>Adresse IP</Text>
                      <Text style={s.infoValue}>{data.ipAddress}</Text>
                    </View>
                  </View>
                ) : null}

                {data.resolution ? (
                  <View style={s.infoItem}>
                    <MaterialCommunityIcons
                      name={getResolutionIcon(data.resolution) as any}
                      size={18}
                      color={C.white40}
                    />
                    <View style={s.infoContent}>
                      <Text style={s.infoLabel}>Résolution</Text>
                      <Text style={s.infoValue}>{data.resolution.replace("_", " ")}</Text>
                    </View>
                  </View>
                ) : null}

                {data.orientation ? (
                  <View style={s.infoItem}>
                    <MaterialCommunityIcons
                      name={data.orientation === "LANDSCAPE" ? "tablet" : ("tablet-ipad" as any)}
                      size={18}
                      color={C.white40}
                    />
                    <View style={s.infoContent}>
                      <Text style={s.infoLabel}>Orientation</Text>
                      <Text style={s.infoValue}>{data.orientation}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </LinearGradient>
          </View>

          {/* ── Playlists assignées ── */}
          {data.playlists && data.playlists.length > 0 && (
            <View style={s.section}>
              <LinearGradient
                colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
                style={[s.card, { borderColor: C.purpleBorder }]}
              >
                <View style={s.cardHeader}>
                  <View style={[s.cardIconWrap, { backgroundColor: C.purpleDim, borderColor: C.purpleBorder }]}>
                    <Ionicons name="list-outline" size={18} color={C.purple} />
                  </View>
                  <Text style={s.cardTitle}>
                    Playlists assignées ({data.playlists.length})
                  </Text>
                </View>

                <View style={{ gap: 10 }}>
                  {data.playlists.map((pl: any) => (
                    <TouchableOpacity
                      key={pl.id}
                      onPress={() =>
                        router.navigate(`/home/playlists/view/${pl.playlist.id}`)
                      }
                      activeOpacity={0.75}
                    >
                      <LinearGradient
                        colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
                        style={[s.playlistItem, { borderColor: C.border }]}
                      >
                        {/* Top bar coloured by active state */}
                        <View
                          style={[
                            s.playlistTopBar,
                            {
                              backgroundColor: pl.playlist.isActive
                                ? C.success
                                : C.error,
                            },
                          ]}
                        />

                        <View style={s.playlistBody}>
                          {/* Name + priority + chevron */}
                          <View style={s.playlistHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.playlistName}>{pl.playlist.name}</Text>
                              {pl.playlist.description ? (
                                <Text style={s.playlistDesc} numberOfLines={1}>
                                  {pl.playlist.description}
                                </Text>
                              ) : null}
                            </View>
                            <View style={s.playlistRight}>
                              <View
                                style={[
                                  s.priorityBadge,
                                  {
                                    backgroundColor: getPriorityColor(pl.priority) + "22",
                                    borderColor: getPriorityColor(pl.priority) + "55",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    s.priorityText,
                                    { color: getPriorityColor(pl.priority) },
                                  ]}
                                >
                                  P{pl.priority}
                                </Text>
                              </View>
                              <Ionicons name="chevron-forward-outline" size={14} color={C.white20} />
                            </View>
                          </View>

                          {/* Footer */}
                          <View style={s.playlistFooter}>
                            <View
                              style={[
                                s.statusPill,
                                {
                                  backgroundColor: pl.playlist.isActive
                                    ? C.successDim
                                    : C.errorDim,
                                  borderColor: pl.playlist.isActive
                                    ? C.successBorder
                                    : C.errorBorder,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  s.statusDot,
                                  {
                                    backgroundColor: pl.playlist.isActive
                                      ? C.success
                                      : C.error,
                                  },
                                ]}
                              />
                              <Text
                                style={[
                                  s.statusPillText,
                                  {
                                    color: pl.playlist.isActive
                                      ? C.success
                                      : C.error,
                                  },
                                ]}
                              >
                                {pl.playlist.isActive ? "Active" : "Inactive"}
                              </Text>
                            </View>

                            {pl.playlist.shuffleMode && (
                              <View style={[s.modeBadge, { borderColor: C.border }]}>
                                <Ionicons name="shuffle-outline" size={11} color={C.white40} />
                                <Text style={s.modeText}>Aléatoire</Text>
                              </View>
                            )}

                            <View style={[s.modeBadge, { borderColor: C.border }]}>
                              <Ionicons
                                name={
                                  pl.playlist.repeatMode === "LOOP"
                                    ? "repeat-outline"
                                    : "repeat-outline"
                                }
                                size={11}
                                color={C.white40}
                              />
                              <Text style={s.modeText}>{pl.playlist.repeatMode}</Text>
                            </View>

                            <Text style={s.assignedDate}>
                              {formatDate(pl.assignedAt)}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── Métadonnées ── */}
          <View style={s.section}>
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[s.card, { borderColor: C.border }]}
            >
              <View style={s.cardHeader}>
                <View style={[s.cardIconWrap, { backgroundColor: C.cyanDim, borderColor: C.cyanBorder }]}>
                  <Ionicons name="information-circle-outline" size={18} color={C.cyan} />
                </View>
                <Text style={s.cardTitle}>Métadonnées</Text>
              </View>

              <View style={s.metaGrid}>
                <View style={s.metaRow}>
                  <Text style={s.metaLabel}>Créée le</Text>
                  <Text style={s.metaValue}>{formatDate(data.createdAt)}</Text>
                </View>
                <View style={s.metaDivider} />
                <View style={s.metaRow}>
                  <Text style={s.metaLabel}>Dernière modification</Text>
                  <Text style={s.metaValue}>{formatDate(data.updatedAt)}</Text>
                </View>
                {data.lastSeen && (
                  <>
                    <View style={s.metaDivider} />
                    <View style={s.metaRow}>
                      <Text style={s.metaLabel}>Dernière activité</Text>
                      <Text style={s.metaValue}>{formatDate(data.lastSeen)}</Text>
                    </View>
                  </>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* ── Actions ── */}
          <View style={[s.section, { flexDirection: "row", gap: 12 }]}>
            {/* Supprimer */}
            <TouchableOpacity
              style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
              activeOpacity={0.8}
              onPress={() => {
                Alert.alert(
                  "Supprimer la télévision",
                  `Êtes-vous sûr de vouloir supprimer "${data.name}" ?`,
                  [
                    { text: "Annuler", style: "cancel" },
                    {
                      text: "Supprimer",
                      style: "destructive",
                      onPress: async () => {
                        await dissociatedUser(data.id);
                        router.back();
                      },
                    },
                  ],
                );
              }}
            >
              <LinearGradient
                colors={[C.errorDim, "rgba(255,82,82,0.06)"]}
                style={[s.actionBtn, { borderColor: C.errorBorder }]}
              >
                <Ionicons name="trash-outline" size={18} color={C.error} />
                <Text style={[s.actionBtnText, { color: C.error }]}>Supprimer</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Modifier */}
            <TouchableOpacity
              style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
              activeOpacity={0.8}
              onPress={() => setIsEditModalVisible(true)}
            >
              <LinearGradient
                colors={[C.accentDim, "rgba(79,142,247,0.06)"]}
                style={[s.actionBtn, { borderColor: C.accentBorder }]}
              >
                <Ionicons name="create-outline" size={18} color={C.accent} />
                <Text style={[s.actionBtnText, { color: C.accent }]}>Modifier</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <EditTvModal
            visible={isEditModalVisible}
            data={currentData}
            onClose={() => setIsEditModalVisible(false)}
            onSave={handleEditSave}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const s = StyleSheet.create({
  // Header
  header: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(79,142,247,0.12)",
    borderWidth: 1,
    borderColor: "rgba(79,142,247,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  codeConnection: {
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
    marginLeft: 4,
  },

  // Scroll
  scroll: { paddingBottom: 50, paddingTop: 4 },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 14 },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Info items
  infoGrid: { gap: 14 },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.40)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
    marginTop: 2,
  },

  // Playlist item
  playlistItem: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  playlistTopBar: {
    height: 3,
    width: "100%",
    opacity: 0.8,
  },
  playlistBody: {
    padding: 14,
    gap: 10,
  },
  playlistHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  playlistDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.40)",
    marginTop: 2,
  },
  playlistRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  playlistFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  modeText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.40)",
  },
  assignedDate: {
    fontSize: 11,
    color: "rgba(255,255,255,0.30)",
    fontStyle: "italic",
    marginLeft: "auto",
  },

  // Metadata
  metaGrid: { gap: 0 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  metaDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  metaLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.40)",
  },
  metaValue: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },

  // Actions
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

export default TvDetailsScreen;
