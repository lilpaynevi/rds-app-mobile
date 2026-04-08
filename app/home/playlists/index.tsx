import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { myPlaylists } from "@/requests/playlists.requests";
import api from "@/scripts/fetch.api";

const { width } = Dimensions.get("window");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  bgCard: "rgba(255,255,255,0.05)",
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
  warningBorder: "rgba(255,183,77,0.25)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlaylistItem {
  id: string;
  title: string;
  description: string;
  mediaCount: number;
  duration: string;
  televisionId: string;
  televisionName: string;
  status: "active" | "inactive" | "scheduled";
  lastModified: string;
}

interface TvGroup {
  tvId: string;
  tvName: string;
  playlists: PlaylistItem[];
  activePlaylist: PlaylistItem | null;
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS: Record<
  string,
  { label: string; color: string; dim: string; border: string }
> = {
  active: {
    label: "Actif",
    color: C.success,
    dim: C.successDim,
    border: C.successBorder,
  },
  inactive: {
    label: "Inactif",
    color: C.white40,
    dim: C.white05,
    border: C.border,
  },
  scheduled: {
    label: "Programmé",
    color: C.warning,
    dim: C.warningDim,
    border: C.warningBorder,
  },
};

// ─── STAT PILL ────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <View
      style={[
        s.statPill,
        { borderColor: color + "33", backgroundColor: color + "10" },
      ]}
    >
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── PLAYLIST CARD ────────────────────────────────────────────────────────────
function PlaylistCard({
  playlist,
  onPress,
  onDelete,
}: {
  playlist: PlaylistItem;
  onPress: () => void;
  onDelete: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const st = STATUS[playlist.status] ?? STATUS.inactive;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View
          style={[
            s.playlistCard,
            playlist.status === "active" && { borderColor: C.accentBorder },
          ]}
        >
          {/* Top accent bar */}
          <View
            style={[
              s.cardTopBar,
              {
                backgroundColor:
                  playlist.status === "active" ? C.accent : "transparent",
              },
            ]}
          />

          <View style={s.cardInner}>
            {/* Row 1 : Title + Delete */}
            <View style={s.cardHead}>
              <View style={s.cardTitleWrap}>
                {/* Icon */}
                <View
                  style={[
                    s.cardIcon,
                    { backgroundColor: st.dim, borderColor: st.border },
                  ]}
                >
                  <Ionicons
                    name={playlist.status === "active" ? "play-circle" : "list"}
                    size={16}
                    color={st.color}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {playlist.title}
                  </Text>

                  {/* Status badge */}
                  <View style={s.statusRow}>
                    <View
                      style={[s.statusDot, { backgroundColor: st.color }]}
                    />
                    <Text style={[s.statusLabel, { color: st.color }]}>
                      {st.label}
                    </Text>
                    {playlist.status === "active" && (
                      <View
                        style={[
                          s.activePill,
                          {
                            backgroundColor: C.successDim,
                            borderColor: C.successBorder,
                          },
                        ]}
                      >
                        <Text style={[s.activePillText, { color: C.success }]}>
                          EN COURS
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={onDelete}
                style={s.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={s.deleteBtnInner}>
                  <Ionicons name="trash-outline" size={15} color={C.error} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Description */}
            {playlist.description ? (
              <Text style={s.cardDesc} numberOfLines={2}>
                {playlist.description}
              </Text>
            ) : null}

            {/* Footer chips */}
            <View style={s.cardFooter}>
              <View style={s.chipRow}>
                <Chip
                  icon="film-outline"
                  label={`${playlist.mediaCount} média${playlist.mediaCount > 1 ? "s" : ""}`}
                />
                <Chip
                  icon="time-outline"
                  label={playlist.duration || "Variable"}
                />
              </View>
              <View style={s.dateChip}>
                <Ionicons name="calendar-outline" size={11} color={C.white40} />
                <Text style={s.dateText}>
                  {new Date(playlist.lastModified).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── CHIP ─────────────────────────────────────────────────────────────────────
function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.chip}>
      <Ionicons name={icon as any} size={12} color={C.white40} />
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

// ─── TV SECTION ───────────────────────────────────────────────────────────────
function TvSection({
  tvData,
  tvId,
  onPlaylistPress,
  onPlaylistDelete,
}: {
  tvData: TvGroup;
  tvId: string;
  onPlaylistPress: (p: PlaylistItem) => void;
  onPlaylistDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    setExpanded((v) => !v);
    Animated.spring(anim, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

  const chevronRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const toShow = expanded
    ? tvData.playlists
    : tvData.playlists.filter((p) => p.status === "active").slice(0, 1);

  return (
    <View style={s.tvSection}>
      {/* Header */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.85}>
        <LinearGradient
          colors={["rgba(79,142,247,0.18)", "rgba(0,229,255,0.08)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.tvHeader}
        >
          {/* Left accent */}
          <View style={s.tvHeaderAccent} />

          <View style={s.tvHeaderLeft}>
            <View style={s.tvIconWrap}>
              <Ionicons name="tv-outline" size={18} color={C.cyan} />
            </View>
            <Text style={s.tvName} numberOfLines={1}>
              {tvData.tvName}
            </Text>
          </View>

          <View style={s.tvHeaderRight}>
            {/* Count badge */}
            <View style={s.countBadge}>
              <Text style={s.countText}>{tvData.playlists.length}</Text>
            </View>

            {/* Active dot */}
            {tvData.activePlaylist && (
              <View style={s.activeDotWrap}>
                <View style={s.activeDot} />
              </View>
            )}

            {/* Chevron */}
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <Ionicons name="chevron-down" size={18} color={C.white60} />
            </Animated.View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Playlists */}
      {toShow.length > 0 ? (
        <View style={s.playlistsWrap}>
          {!expanded && tvData.activePlaylist && (
            <View style={s.activeLabel}>
              <View style={s.activeLabelDot} />
              <Text style={s.activeLabelText}>Playlist en cours</Text>
            </View>
          )}
          {toShow.map((p) => (
            <PlaylistCard
              key={p.id}
              playlist={p}
              onPress={() => onPlaylistPress(p)}
              onDelete={() => onPlaylistDelete(p.id)}
            />
          ))}
          {!expanded && tvData.playlists.length > toShow.length && (
            <TouchableOpacity onPress={toggle} style={s.showMoreBtn}>
              <Text style={s.showMoreText}>
                +{tvData.playlists.length - toShow.length} autre
                {tvData.playlists.length - toShow.length > 1 ? "s" : ""}{" "}
                playlist{tvData.playlists.length - toShow.length > 1 ? "s" : ""}
              </Text>
              <Ionicons name="chevron-down" size={13} color={C.accent} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={s.tvEmptyRow}>
          <Ionicons name="musical-notes-outline" size={14} color={C.white40} />
          <Text style={s.tvEmptyText}>Aucune playlist active</Text>
        </View>
      )}
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function PlaylistDetailScreen() {
  const [playlistsByTv, setPlaylistsByTv] = useState<Record<string, TvGroup>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");

  const headerY = useRef(new Animated.Value(-20)).current;
  const headerO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPlaylists();
    Animated.parallel([
      Animated.spring(headerY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(headerO, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const fetch = await myPlaylists();
      const formatted: PlaylistItem[] = fetch.map((it: any) => ({
        id: it.id,
        title: it.name,
        description: it.description,
        mediaCount: it.items.length,
        duration: "",
        televisionId: it.televisions?.[0]?.televisionId || "Non assignée",
        televisionName: it.televisions?.[0]?.television?.name || "Non assignée",
        status: it.isActive ? "active" : "inactive",
        lastModified: it.updatedAt,
      }));

      const grouped = formatted.reduce<Record<string, TvGroup>>((acc, p) => {
        const k = p.televisionId;
        if (!acc[k])
          acc[k] = {
            tvId: k,
            tvName: p.televisionName,
            playlists: [],
            activePlaylist: null,
          };
        acc[k].playlists.push(p);
        if (p.status === "active") acc[k].activePlaylist = p;
        return acc;
      }, {});

      Object.keys(grouped).forEach((k) => {
        grouped[k].playlists.sort((a, b) => {
          if (a.status === "active") return -1;
          if (b.status === "active") return 1;
          return (
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime()
          );
        });
      });

      setPlaylistsByTv(grouped);
    } catch (e) {
      console.error(e);
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

  const handleDelete = (id: string) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer cette playlist ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/playlists/${id}`);
            await loadPlaylists();
          } catch {
            Alert.alert("Erreur", "Impossible de supprimer");
          }
        },
      },
    ]);
  };

  const allPlaylists = Object.values(playlistsByTv).flatMap((g) => g.playlists);
  const totalTvs = Object.keys(playlistsByTv).length;
  const totalActive = Object.values(playlistsByTv).filter(
    (tv) => tv.activePlaylist,
  ).length;
  const totalPlaylists = Object.values(playlistsByTv).reduce(
    (s, tv) => s + tv.playlists.length,
    0,
  );

  // ── LOADING ──
  if (isLoading) {
    return (
      <SafeAreaView style={s.root}>
        <LinearGradient
          colors={[C.bgDeep, C.bgMid, "#0D1B4B"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.loadingWrap}>
          <View style={s.loadingOrb}>
            <Ionicons name="musical-notes" size={32} color={C.cyan} />
          </View>
          <Text style={s.loadingText}>Chargement des playlists…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <LinearGradient
        colors={[C.bgDeep, C.bgMid, "#0D1B4B"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── HEADER ── */}
      <Animated.View
        style={[
          s.header,
          // { opacity: headerO, transform: [{ translateY: headerY }] },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.white80} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Mes Playlists</Text>
          {totalPlaylists > 0 && (
            <Text style={s.headerSub}>
              {totalPlaylists} playlist{totalPlaylists > 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Toggle vue */}
          <View style={s.viewToggle}>
            <TouchableOpacity
              style={[s.viewToggleBtn, viewMode === "grouped" && s.viewToggleActive]}
              onPress={() => setViewMode("grouped")}
            >
              <Ionicons name="layers-outline" size={16} color={viewMode === "grouped" ? C.accent : C.white40} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.viewToggleBtn, viewMode === "list" && s.viewToggleActive]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === "list" ? C.accent : C.white40} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/home/playlists/add")}
            style={s.addBtn}
          >
            <LinearGradient
              colors={[C.accent, C.cyan]}
              style={s.addBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={20} color={C.bgDeep} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── STATS BAR ── */}
      {totalTvs > 0 && (
        <View style={s.statsBar}>
          <StatPill
            icon="tv-outline"
            label="Écran"
            value={totalTvs}
            color={C.cyan}
          />
          <View style={s.statsDivider} />
          <StatPill
            icon="radio-button-on"
            label="Active"
            value={totalActive}
            color={C.success}
          />
          <View style={s.statsDivider} />
          <StatPill
            icon="list-outline"
            label="Total"
            value={totalPlaylists}
            color={C.accent}
          />
        </View>
      )}

      {/* ── CONTENT ── */}
      {totalTvs === 0 ? (
        <View style={s.emptyWrap}>
          <LinearGradient colors={[C.cyanDim, C.accentDim]} style={s.emptyOrb}>
            <Ionicons name="musical-notes-outline" size={40} color={C.cyan} />
          </LinearGradient>
          <Text style={s.emptyTitle}>Aucune playlist trouvée</Text>
          <Text style={s.emptySub}>
            Créez votre première playlist en appuyant sur le bouton +
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.push("/home/playlists/add")}
          >
            <LinearGradient
              colors={[C.accent, C.cyan]}
              style={s.emptyBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={18} color={C.bgDeep} />
              <Text style={s.emptyBtnText}>Nouvelle playlist</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.cyan}
              colors={[C.cyan]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {viewMode === "grouped"
            ? Object.entries(playlistsByTv)
                .sort(
                  ([, a], [, b]) =>
                    (b.activePlaylist ? 1 : 0) - (a.activePlaylist ? 1 : 0),
                )
                .map(([tvId, tvData]) => (
                  <TvSection
                    key={tvId}
                    tvId={tvId}
                    tvData={tvData}
                    onPlaylistPress={(p) =>
                      router.navigate(`/home/playlists/view/${p.id}`)
                    }
                    onPlaylistDelete={handleDelete}
                  />
                ))
            : allPlaylists.map((p) => {
                const st = STATUS[p.status] ?? STATUS.inactive;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => router.navigate(`/home/playlists/view/${p.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={s.listRow}>
                      {/* Accent gauche */}
                      <View style={[s.listAccent, { backgroundColor: st.color }]} />

                      {/* Icône statut */}
                      <View style={[s.listIcon, { backgroundColor: st.dim, borderColor: st.border }]}>
                        <Ionicons
                          name={p.status === "active" ? "play-circle" : "list"}
                          size={16}
                          color={st.color}
                        />
                      </View>

                      {/* Infos */}
                      <View style={{ flex: 1 }}>
                        <Text style={s.listTitle} numberOfLines={1}>{p.title}</Text>
                        <View style={s.listMeta}>
                          <Ionicons name="tv-outline" size={11} color={C.white40} />
                          <Text style={s.listMetaText}>{p.televisionName}</Text>
                          <View style={[s.listDot, { backgroundColor: C.border }]} />
                          <Ionicons name="film-outline" size={11} color={C.white40} />
                          <Text style={s.listMetaText}>{p.mediaCount} média{p.mediaCount > 1 ? "s" : ""}</Text>
                        </View>
                      </View>

                      {/* Badge statut */}
                      <View style={[s.listBadge, { backgroundColor: st.dim, borderColor: st.border }]}>
                        <Text style={[s.listBadgeText, { color: st.color }]}>{st.label}</Text>
                      </View>

                      {/* Supprimer */}
                      <TouchableOpacity
                        onPress={() => handleDelete(p.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={s.listDeleteBtn}
                      >
                        <Ionicons name="trash-outline" size={15} color={C.error} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push("/home/playlists/add")}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[C.accent, C.cyan]}
          style={s.fabGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={26} color={C.bgDeep} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 12, color: C.white40, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 12, overflow: "hidden" },
  addBtnGrad: { flex: 1, justifyContent: "center", alignItems: "center" },

  // View toggle
  viewToggle: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    backgroundColor: C.white05,
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  viewToggleActive: {
    backgroundColor: C.accentDim,
  },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statValue: { fontSize: 14, fontWeight: "800" },
  statLabel: { fontSize: 12, color: C.white40 },
  statsDivider: { width: 1, height: 16, backgroundColor: C.border },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 120 },

  // TV Section
  tvSection: { marginBottom: 20 },
  tvHeader: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  tvHeaderAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  tvHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  tvHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  tvIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  tvName: { fontSize: 16, fontWeight: "700", color: C.white, flex: 1 },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  countText: { fontSize: 12, fontWeight: "700", color: C.white60 },
  activeDotWrap: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.successDim,
    justifyContent: "center",
    alignItems: "center",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.success,
  },

  // Playlists wrap
  playlistsWrap: { marginTop: 10, gap: 10 },
  activeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  activeLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.success,
  },
  activeLabelText: { fontSize: 12, fontWeight: "600", color: C.success },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
  },
  showMoreText: { fontSize: 13, fontWeight: "600", color: C.accent },
  tvEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  tvEmptyText: { fontSize: 13, color: C.white40 },

  // Playlist Card
  playlistCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTopBar: { height: 2 },
  cardInner: { padding: 14, gap: 8 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white80,
    marginBottom: 3,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusLabel: { fontSize: 11, fontWeight: "600" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
  },
  activePillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  deleteBtn: { padding: 2 },
  deleteBtnInner: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.errorDim,
    borderWidth: 1,
    borderColor: C.errorBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDesc: { fontSize: 13, color: C.white40, lineHeight: 18 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipText: { fontSize: 11, color: C.white40 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11, color: C.white40 },

  // Loading
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingOrb: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { fontSize: 15, color: C.white40 },

  // Empty
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 14,
  },
  emptyOrb: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cyanBorder,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.white80,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: C.white40,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyBtn: { borderRadius: 16, overflow: "hidden", marginTop: 6 },
  emptyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: C.bgDeep },

  // FAB
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  fabGrad: { flex: 1, justifyContent: "center", alignItems: "center" },

  // List view
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    overflow: "hidden",
    gap: 10,
    paddingVertical: 10,
    paddingRight: 12,
  },
  listAccent: {
    width: 3,
    alignSelf: "stretch",
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.white80,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  listMetaText: { fontSize: 11, color: C.white40 },
  listDot: { width: 3, height: 3, borderRadius: 2 },
  listBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  listBadgeText: { fontSize: 10, fontWeight: "700" },
  listDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.errorDim,
    borderWidth: 1,
    borderColor: C.errorBorder,
    justifyContent: "center",
    alignItems: "center",
  },
});
