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
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "@/scripts/fetch.api";
import { router } from "expo-router";
import { socket } from "@/scripts/socket.io";
import { useAuth } from "@/scripts/AuthContext";

const { width } = Dimensions.get("window");

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  bgCard: "rgba(255,255,255,0.05)",
  bgCardHover: "rgba(255,255,255,0.08)",
  accent: "#4F8EF7",
  accentDark: "#2D6BE4",
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
  gray: "#90A4AE",
  grayDim: "rgba(144,164,174,0.12)",
  grayBorder: "rgba(144,164,174,0.25)",
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
  powerOnTime: string | null;
  powerOffTime: string | null;
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

const parseTime = (t: string): [number, number] => {
  const [h, m] = t.split(":").map(Number);
  return [h || 0, m || 0];
};

const toTime = (h: number, m: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ONLINE: {
    icon: "checkmark-circle",
    color: C.success,
    dimColor: C.successDim,
    borderColor: C.successBorder,
    label: "En ligne",
  },
  OFFLINE: {
    icon: "close-circle",
    color: C.gray,
    dimColor: C.grayDim,
    borderColor: C.grayBorder,
    label: "Hors ligne",
  },
  PLAYING: {
    icon: "play-circle",
    color: C.accent,
    dimColor: C.accentDim,
    borderColor: C.accentBorder,
    label: "En lecture",
  },
  PAUSED: {
    icon: "pause-circle",
    color: C.warning,
    dimColor: C.warningDim,
    borderColor: C.warningBorder,
    label: "En pause",
  },
  ERROR: {
    icon: "alert-circle",
    color: C.error,
    dimColor: C.errorDim,
    borderColor: C.errorBorder,
    label: "Erreur",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatLastSeen = (date: string) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return new Date(date).toLocaleDateString("fr-FR");
};

// ─── SwipeableCard ────────────────────────────────────────────────────────────
const SwipeableCard: React.FC<{
  children: React.ReactNode;
  onDelete: () => void;
}> = ({ children, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(Math.max(g.dx, -110));
          deleteOpacity.setValue(Math.min(Math.abs(g.dx) / 110, 1));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: -110,
              useNativeDriver: true,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -width,
      duration: 280,
      useNativeDriver: true,
    }).start(onDelete);
  };

  return (
    <View style={sw.wrap}>
      {/* Delete reveal */}
      <Animated.View style={[sw.revealWrap, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          style={sw.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[C.error, "#C62828"]}
            style={sw.deleteBtnGradient}
          >
            <Ionicons name="trash-outline" size={20} color={C.white} />
            <Text style={sw.deleteBtnText}>Supprimer</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Card */}
      <Animated.View
        style={[sw.content, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const sw = StyleSheet.create({
  wrap: { position: "relative", marginBottom: 14 },
  revealWrap: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 110,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    width: 100,
    height: "90%",
    borderRadius: 18,
    overflow: "hidden",
  },
  deleteBtnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  deleteBtnText: { color: C.white, fontSize: 11, fontWeight: "700" },
  content: { borderRadius: 20 },
});

// ─── TVCard ───────────────────────────────────────────────────────────────────
const TVCard: React.FC<{ item: Television; onDelete: () => void }> = ({
  item,
  onDelete,
}) => {
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.OFFLINE;
  const activePlaylist = item.playlists.find((p) => p.isActive);

  const handlePress = () => {
    router.push({
      pathname: "/home/tv/[tvId]",
      params: { tvId: item.id, item: JSON.stringify(item) },
    });
  };
  const entranceY = useRef(new Animated.Value(16)).current;
  const entranceOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOp, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(entranceY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SwipeableCard onDelete={onDelete}>
      <Animated.View
        style={{ opacity: entranceOp, transform: [{ translateY: entranceY }] }}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
          <LinearGradient
            colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.03)"]}
            style={card.wrap}
          >
            {/* Status bar top */}
            <View style={[card.topBar, { backgroundColor: status.color }]} />

            {/* Header */}
            <View style={card.header}>
              <View
                style={[
                  card.iconWrap,
                  {
                    backgroundColor: status.dimColor,
                    borderColor: status.borderColor,
                  },
                ]}
              >
                <Ionicons name="tv-outline" size={22} color={status.color} />
              </View>

              <View style={card.headerText}>
                <Text style={card.tvName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.location ? (
                  <View style={card.locationRow}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={C.white40}
                    />
                    <Text style={card.locationText}>{item.location}</Text>
                  </View>
                ) : null}
              </View>

              {/* Status badge */}
              <View
                style={[
                  card.statusBadge,
                  {
                    backgroundColor: status.dimColor,
                    borderColor: status.borderColor,
                  },
                ]}
              >
                <Ionicons
                  name={status.icon as any}
                  size={13}
                  color={status.color}
                />
                <Text style={[card.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={card.divider} />

            {/* Info row */}
            <View style={card.infoRow}>
              <View style={card.infoChip}>
                <Ionicons name="resize-outline" size={13} color={C.white40} />
                <Text style={card.infoChipText}>{item.resolution}</Text>
              </View>
              <View style={card.infoChip}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={13}
                  color={C.white40}
                />
                <Text style={card.infoChipText}>{item.orientation}</Text>
              </View>
              {item.lastSeen && (
                <View style={card.infoChip}>
                  <Ionicons name="time-outline" size={13} color={C.white40} />
                  <Text style={card.infoChipText}>
                    {formatLastSeen(item.lastSeen)}
                  </Text>
                </View>
              )}
            </View>

            {/* Playlist */}
            {activePlaylist ? (
              <View style={card.playlistBox}>
                <View style={card.playlistBoxHeader}>
                  <View style={card.playlistDot} />
                  <Text style={card.playlistLabel}>PLAYLIST ACTIVE</Text>
                </View>
                <Text style={card.playlistName} numberOfLines={1}>
                  {activePlaylist.playlist.name}
                </Text>
                {activePlaylist.playlist.description ? (
                  <Text style={card.playlistDesc} numberOfLines={1}>
                    {activePlaylist.playlist.description}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={card.noPlaylist}>
                <Ionicons
                  name="musical-notes-outline"
                  size={14}
                  color={C.white40}
                />
                <Text style={card.noPlaylistText}>Aucune playlist active</Text>
              </View>
            )}

            {/* Footer */}
            {item.playlists.length > 0 && (
              <View style={card.footer}>
                <Ionicons name="layers-outline" size={13} color={C.white40} />
                <Text style={card.footerText}>
                  {item.playlists.length} playlist
                  {item.playlists.length > 1 ? "s" : ""} associée
                  {item.playlists.length > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SwipeableCard>
  );
};

const card = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    padding: 16,
    paddingTop: 20,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerText: { flex: 1 },
  tvName: { fontSize: 16, fontWeight: "700", color: C.white, marginBottom: 3 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12, color: C.white40 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  divider: { height: 1, backgroundColor: C.border, marginBottom: 12 },

  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.white05,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoChipText: { fontSize: 12, color: C.white60 },

  playlistBox: {
    backgroundColor: C.accentDim,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.accentBorder,
    marginBottom: 12,
    gap: 4,
  },
  playlistBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  playlistDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  playlistLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.accent,
    letterSpacing: 0.8,
  },
  playlistName: { fontSize: 14, fontWeight: "700", color: C.white80 },
  playlistDesc: { fontSize: 12, color: C.white40 },

  noPlaylist: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.white05,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  noPlaylistText: { fontSize: 13, color: C.white40, fontStyle: "italic" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: { fontSize: 12, color: C.white40 },
});

// ─── SchedulePanel ───────────────────────────────────────────────────────────
// Applique powerOnTime/powerOffTime (allumage/extinction quotidiens, gérés par
// l'app TV) à toutes les télévisions de l'utilisateur en une seule action.
// Pas de sélection de jours ici : ces champs s'appliquent tous les jours, il
// n'existe pas de granularité par jour côté serveur/TV pour l'alimentation.
const SchedulePanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  televisions: Television[];
  onSaved: () => void;
}> = ({ visible, onClose, televisions, onSaved }) => {
  const slideY = useRef(new Animated.Value(800)).current;
  const bgOp = useRef(new Animated.Value(0)).current;

  const [startH, setStartH] = useState(8);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(22);
  const [endM, setEndM] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      // Pré-remplit avec les horaires de la première TV qui en a déjà —
      // sinon des valeurs par défaut raisonnables.
      const withPower = televisions.find(
        (t) => t.powerOnTime || t.powerOffTime,
      );
      if (withPower) {
        const [sh, sm] = parseTime(withPower.powerOnTime ?? "08:00");
        const [eh, em] = parseTime(withPower.powerOffTime ?? "22:00");
        setStartH(sh);
        setStartM(sm);
        setEndH(eh);
        setEndM(em);
        setIsActive(true);
      } else {
        setStartH(8);
        setStartM(0);
        setEndH(22);
        setEndM(0);
        setIsActive(true);
      }
      Animated.parallel([
        Animated.timing(bgOp, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOp, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 800,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSave = async () => {
    if (televisions.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const payload = isActive
        ? {
            powerOnTime: toTime(startH, startM),
            powerOffTime: toTime(endH, endM),
          }
        : { powerOnTime: null, powerOffTime: null };

      await Promise.all(
        televisions.map((tv) => api.patch(`/televisions/${tv.id}`, payload)),
      );

      onSaved();
      onClose();
      Alert.alert(
        "Sauvegardé",
        "Programmation générale sauvegardée avec succès ! De " +
          toTime(startH, startM) +
          " à " +
          toTime(endH, endM),
      );
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e.response?.data?.message ?? "Impossible de sauvegarder",
      );
    } finally {
      setSaving(false);
    }
  };

  const TimeUnit = ({
    value,
    onUp,
    onDown,
  }: {
    value: number;
    onUp: () => void;
    onDown: () => void;
  }) => (
    <View style={sp.timeUnit}>
      <TouchableOpacity onPress={onUp} style={sp.timeArrow}>
        <Ionicons name="chevron-up" size={22} color={C.white60} />
      </TouchableOpacity>
      <Text style={sp.timeValue}>{String(value).padStart(2, "0")}</Text>
      <TouchableOpacity onPress={onDown} style={sp.timeArrow}>
        <Ionicons name="chevron-down" size={22} color={C.white60} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[sp.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[sp.panel, { transform: [{ translateY: slideY }] }]}
      >
        <LinearGradient colors={["#141A3D", "#0F1332"]} style={sp.panelInner}>
          <View style={sp.handle} />

          {/* Header */}
          <View style={sp.header}>
            <View style={sp.headerLeft}>
              <Text style={sp.title}>Programmation générale</Text>
              <Text style={sp.subtitle}>Toutes les TVs</Text>
            </View>
          </View>

          <ScrollView
            style={sp.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50 }}
          >
            {/* Activer/désactiver */}
            <View style={sp.toggleRow}>
              <View style={sp.toggleRowLeft}>
                <Ionicons
                  name="power"
                  size={18}
                  color={isActive ? C.success : C.white40}
                />
                <Text style={[sp.toggleLabel, isActive && { color: C.white }]}>
                  {isActive
                    ? "Programmation activée"
                    : "Programmation désactivée"}
                </Text>
              </View>
              <TouchableOpacity
                style={[sp.toggleBtn, isActive && sp.toggleBtnOn]}
                onPress={() => setIsActive((v) => !v)}
                activeOpacity={0.8}
              >
                <View style={[sp.toggleKnob, isActive && sp.toggleKnobOn]} />
              </TouchableOpacity>
            </View>

            {/* Heure allumage */}
            <View style={sp.formSection}>
              <View style={sp.formLabelRow}>
                <View style={[sp.labelDot, { backgroundColor: C.success }]} />
                <Text style={sp.formLabel}>Allumer à</Text>
              </View>
              <View style={sp.timePicker}>
                <TimeUnit
                  value={startH}
                  onUp={() => setStartH((h) => (h + 1) % 24)}
                  onDown={() => setStartH((h) => (h - 1 + 24) % 24)}
                />
                <Text style={sp.timeSep}>:</Text>
                <TimeUnit
                  value={startM}
                  onUp={() => setStartM((m) => (m >= 55 ? 0 : m + 5))}
                  onDown={() => setStartM((m) => (m <= 0 ? 55 : m - 5))}
                />
              </View>
            </View>

            {/* Heure extinction */}
            <View style={sp.formSection}>
              <View style={sp.formLabelRow}>
                <View style={[sp.labelDot, { backgroundColor: C.error }]} />
                <Text style={sp.formLabel}>Éteindre à</Text>
              </View>
              <View style={sp.timePicker}>
                <TimeUnit
                  value={endH}
                  onUp={() => setEndH((h) => (h + 1) % 24)}
                  onDown={() => setEndH((h) => (h - 1 + 24) % 24)}
                />
                <Text style={sp.timeSep}>:</Text>
                <TimeUnit
                  value={endM}
                  onUp={() => setEndM((m) => (m >= 55 ? 0 : m + 5))}
                  onDown={() => setEndM((m) => (m <= 0 ? 55 : m - 5))}
                />
              </View>
            </View>

            {/* Résumé visuel */}
            <View style={sp.summaryBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={C.accent}
              />
              <Text style={sp.summaryText}>
                {isActive ? (
                  <>
                    Toutes les TVs seront allumées à{" "}
                    <Text style={{ color: C.success, fontWeight: "700" }}>
                      {toTime(startH, startM)}
                    </Text>{" "}
                    et éteintes à{" "}
                    <Text style={{ color: C.error, fontWeight: "700" }}>
                      {toTime(endH, endM)}
                    </Text>{" "}
                    chaque jour.
                  </>
                ) : (
                  "La programmation d'alimentation sera désactivée pour toutes les TVs."
                )}
              </Text>
            </View>

            {/* Sauvegarder */}
            <TouchableOpacity
              style={sp.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[C.accent, C.accentDark]}
                style={sp.saveBtnGrad}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={C.white}
                    />
                    <Text style={sp.saveBtnText}>
                      Appliquer à toutes les TVs
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
};

const sp = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "87%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  panelInner: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.white20,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: C.white },
  subtitle: { fontSize: 12, color: C.white40, marginTop: 2 },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 50 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.white05,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 24,
  },
  toggleRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: C.white60 },
  toggleBtn: {
    width: 48,
    height: 27,
    borderRadius: 14,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 3,
    justifyContent: "center",
  },
  toggleBtnOn: { backgroundColor: C.accentDim, borderColor: C.accentBorder },
  toggleKnob: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: C.white40,
  },
  toggleKnobOn: { backgroundColor: C.accent, alignSelf: "flex-end" },

  formSection: { marginBottom: 22 },
  formLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  formLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.white60,
    letterSpacing: 0.4,
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.white05,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
  },
  timeUnit: { alignItems: "center", width: 76 },
  timeArrow: { padding: 8 },
  timeValue: {
    fontSize: 40,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.5,
  },
  timeSep: {
    fontSize: 36,
    fontWeight: "800",
    color: C.white40,
    marginBottom: 4,
  },

  summaryBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.accentDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accentBorder,
    padding: 14,
    marginBottom: 22,
  },
  summaryText: { flex: 1, fontSize: 13, color: C.white60, lineHeight: 20 },

  saveBtn: { borderRadius: 16, overflow: "hidden" },
  saveBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: C.white },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyTelevisionsScreen() {
  const [televisions, setTelevisions] = useState<Television[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const { user, subscription } = useAuth();

  const fetchTelevisions = useCallback(async () => {
    try {
      const response = await api.get("/televisions/me");
      setTelevisions(response.data);
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message ||
          "Impossible de charger les télévisions",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelevisions();
  }, [fetchTelevisions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTelevisions();
  }, [fetchTelevisions]);

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
            } catch (error: any) {
              Alert.alert(
                "Erreur",
                error.response?.data?.message || "Impossible de supprimer",
              );
            }
          },
        },
      ],
    );
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <LinearGradient colors={[C.bgDeep, C.bgMid]} style={s.fullCenter}>
        <StatusBar barStyle="light-content" />
        <View style={s.loadingOrb} />
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>Chargement des télévisions...</Text>
      </LinearGradient>
    );
  }

  // ── Empty ──
  if (televisions.length === 0) {
    return (
      <LinearGradient colors={[C.bgDeep, C.bgMid]} style={s.fullCenter}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity
          style={s.backBtnAbs}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back-outline" size={18} color={C.white60} />
          <Text style={s.backBtnText}>Retour</Text>
        </TouchableOpacity>
        <View style={s.emptyIconWrap}>
          <LinearGradient
            colors={[C.accentDim, C.white05]}
            style={s.emptyIconGrad}
          >
            <Ionicons name="tv-outline" size={44} color={C.accent} />
          </LinearGradient>
        </View>
        <Text style={s.emptyTitle}>Aucune télévision</Text>
        <Text style={s.emptySubtitle}>
          Ajoutez votre première télévision{"\n"}pour commencer la diffusion
        </Text>
        <TouchableOpacity
          style={s.emptyBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[C.accent, C.accentDark]}
            style={s.emptyBtnGrad}
          >
            <Ionicons name="add-outline" size={20} color={C.white} />
            <Text style={s.emptyBtnText}>Ajouter une TV</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // ── List ──
  const onlineCount = televisions.filter(
    (t) => t.status === "ONLINE" || t.status === "PLAYING",
  ).length;

  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={18} color={C.white60} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Mes Télévisions</Text>
            <View style={s.headerBadgeRow}>
              <View style={s.headerBadge}>
                <Text style={s.headerBadgeText}>
                  {televisions.length} appareil
                  {televisions.length > 1 ? "s" : ""}
                </Text>
              </View>
              {onlineCount > 0 && (
                <View style={[s.headerBadge, s.headerBadgeGreen]}>
                  <View style={s.pulseDot} />
                  <Text style={[s.headerBadgeText, { color: C.success }]}>
                    {onlineCount} en ligne
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={s.scheduleBtn}
            onPress={() => setShowSchedules(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color={C.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.powerAllBtn, onlineCount === 0 && s.powerAllBtnOn]}
            activeOpacity={0.8}
            onPress={() => {
              const allOff = onlineCount === 0;
              const targets = televisions.filter((t) =>
                allOff
                  ? t.status === "OFFLINE"
                  : t.status === "ONLINE" || t.status === "PLAYING",
              );
              const action = allOff ? "ON" : "OFF";
              const label = allOff ? "allumer" : "éteindre";
              const labelBtn = allOff ? "Allumer tout" : "Éteindre tout";
              Alert.alert(
                allOff ? "Allumer toutes les TVs" : "Éteindre toutes les TVs",
                `Voulez-vous ${label} les ${targets.length} télévision${targets.length > 1 ? "s" : ""} ?`,
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: labelBtn,
                    style: allOff ? "default" : "destructive",
                    onPress: () => {
                      targets.forEach((tv) =>
                        socket.emit("tv-power", { tvId: tv.id, action }),
                      );
                      setTelevisions((prev) =>
                        prev.map((tv) =>
                          targets.find((t) => t.id === tv.id)
                            ? { ...tv, status: allOff ? "ONLINE" : "OFFLINE" }
                            : tv,
                        ),
                      );
                    },
                  },
                ],
              );
            }}
          >
            <Ionicons
              name="power"
              size={18}
              color={onlineCount === 0 ? C.success : C.error}
            />
          </TouchableOpacity>
        </View>

        {/* ── Hint swipe ── */}
        <View style={s.swipeHint}>
          <Ionicons name="return-up-back-outline" size={13} color={C.white40} />
          <Text style={s.swipeHintText}>
            Glissez vers la gauche pour supprimer
          </Text>
        </View>

        {/* ── Schedule Panel ── */}
        <SchedulePanel
          visible={showSchedules}
          onClose={() => setShowSchedules(false)}
          televisions={televisions}
          onSaved={fetchTelevisions}
        />

        {/* ── FlatList ── */}
        <FlatList
          data={televisions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TVCard item={item} onDelete={() => handleDelete(item)} />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Full screen states ──
  fullCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingOrb: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(79,142,247,0.06)",
  },
  loadingText: { fontSize: 14, color: C.white40, marginTop: 8 },

  // ── Empty ──
  backBtnAbs: {
    position: "absolute",
    top: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.white05,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  backBtnText: { fontSize: 14, color: C.white60, fontWeight: "500" },
  emptyIconWrap: { marginBottom: 8 },
  emptyIconGrad: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: C.white },
  emptySubtitle: {
    fontSize: 14,
    color: C.white40,
    textAlign: "center",
    lineHeight: 21,
  },
  emptyBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  emptyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: C.white },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.3,
  },
  headerBadgeRow: { flexDirection: "row", gap: 8, marginTop: 5 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.white05,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerBadgeGreen: {
    backgroundColor: C.successDim,
    borderColor: C.successBorder,
  },
  headerBadgeText: { fontSize: 12, color: C.white60, fontWeight: "600" },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.success,
  },

  // ── Swipe hint ──
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  swipeHintText: { fontSize: 12, color: C.white40 },

  // ── Schedule ──
  scheduleBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Power all ──
  powerAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.errorDim,
    borderWidth: 1,
    borderColor: C.errorBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  powerAllBtnOff: {
    backgroundColor: C.white05,
    borderColor: C.border,
  },
  powerAllBtnOn: {
    backgroundColor: C.successDim,
    borderColor: C.successBorder,
  },

  // ── List ──
  listContent: { paddingHorizontal: 18, paddingBottom: 40 },
});
