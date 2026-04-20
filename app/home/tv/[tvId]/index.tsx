import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import api from "@/scripts/fetch.api";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import EditTvModal from "./EditModal";
import { dissociatedUser } from "@/requests/tv.requests";
import { socket } from "@/scripts/socket.io";

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

// ─── TimePickerField ─────────────────────────────────────────────────────────
interface TimePickerFieldProps {
  label: string;
  icon: string;
  iconColor: string;
  value: { h: number; m: number };
  onChange: (v: { h: number; m: number }) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const TimePickerField: React.FC<TimePickerFieldProps> = ({ label, icon, iconColor, value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<TextInput>(null);

  const openEdit = () => {
    setRaw("");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleDigits = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    setRaw(digits);
    if (digits.length === 4) {
      const h = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2, 4), 10);
      if (h < 24 && m < 60) {
        onChange({ h, m });
      }
      setEditing(false);
    }
  };

  const commit = () => {
    if (raw.length >= 2) {
      const h = parseInt(raw.slice(0, 2), 10);
      const m = raw.length >= 4 ? parseInt(raw.slice(2, 4), 10) : 0;
      if (h < 24 && m < 60) onChange({ h, m });
    }
    setEditing(false);
  };

  const shift = (field: "h" | "m", delta: number) => {
    onChange(
      field === "h"
        ? { ...value, h: (value.h + delta + 24) % 24 }
        : { ...value, m: (value.m + delta + 60) % 60 }
    );
  };

  // Preview while typing
  const previewH = raw.length >= 2 ? raw.slice(0, 2) : raw.padEnd(2, "_");
  const previewM = raw.length >= 4 ? raw.slice(2, 4) : raw.length >= 2 ? raw.slice(2).padEnd(2, "_") : "__";

  return (
    <View style={tp.root}>
      {/* Label */}
      <View style={tp.labelRow}>
        <Ionicons name={icon as any} size={13} color={iconColor} />
        <Text style={[tp.label, { color: iconColor }]}>{label}</Text>
      </View>

      {/* +1h */}
      <TouchableOpacity style={tp.quickBtn} onPress={() => shift("h", 1)} activeOpacity={0.7}>
        <Ionicons name="chevron-up" size={18} color={C.white60} />
      </TouchableOpacity>

      {/* Time display / input */}
      <TouchableOpacity style={tp.timeDisplay} onPress={openEdit} activeOpacity={0.8}>
        {editing ? (
          <TextInput
            ref={inputRef}
            value={raw}
            onChangeText={handleDigits}
            onBlur={commit}
            keyboardType="numeric"
            maxLength={4}
            style={tp.hiddenInput}
            caretHidden
          />
        ) : null}
        <Text style={tp.digits}>
          {editing ? previewH : pad2(value.h)}
        </Text>
        <Text style={tp.colon}>:</Text>
        <Text style={tp.digits}>
          {editing ? previewM : pad2(value.m)}
        </Text>
        {!editing && (
          <Ionicons name="pencil-outline" size={12} color={C.white40} style={{ marginLeft: 6, marginTop: 4 }} />
        )}
      </TouchableOpacity>

      {/* -1h */}
      <TouchableOpacity style={tp.quickBtn} onPress={() => shift("h", -1)} activeOpacity={0.7}>
        <Ionicons name="chevron-down" size={18} color={C.white60} />
      </TouchableOpacity>

      {/* ±15 min row */}
      <View style={tp.minRow}>
        <TouchableOpacity style={tp.minBtn} onPress={() => shift("m", -15)} activeOpacity={0.7}>
          <Text style={tp.minBtnText}>−15'</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tp.minBtn} onPress={() => shift("m", 15)} activeOpacity={0.7}>
          <Text style={tp.minBtnText}>+15'</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const tp = StyleSheet.create({
  root: { alignItems: "center", gap: 6, flex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  label: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  quickBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "relative",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  digits: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    minWidth: 40,
    textAlign: "center",
  },
  colon: {
    fontSize: 26,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    marginHorizontal: 2,
    marginBottom: 2,
  },
  minRow: { flexDirection: "row", gap: 6, width: "100%" },
  minBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  minBtnText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
});

// ─────────────────────────────────────────────────────────────────────────────

interface TvDetailsProps {
  data: any;
}

const TvDetailsScreen: React.FC<TvDetailsProps> = () => {
  const { item } = useLocalSearchParams();
  const data = item ? JSON.parse(item as string) : null;

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentData, setCurrentData] = useState(data);
  const [tvStatus, setTvStatus] = useState<string>(data?.status ?? "OFFLINE");
  const [assignedPlaylists, setAssignedPlaylists] = useState<any[]>(data?.playlists ?? []);
  const [allPlaylists, setAllPlaylists] = useState<any[]>([]);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);

  const [powerScheduleEnabled, setPowerScheduleEnabled] = useState(
    !!(data?.powerOnTime || data?.powerOffTime)
  );
  const [powerOnTime, setPowerOnTime] = useState<{ h: number; m: number }>(() => {
    if (data?.powerOnTime) {
      const [h, m] = data.powerOnTime.split(":").map(Number);
      return { h, m };
    }
    return { h: 8, m: 0 };
  });
  const [powerOffTime, setPowerOffTime] = useState<{ h: number; m: number }>(() => {
    if (data?.powerOffTime) {
      const [h, m] = data.powerOffTime.split(":").map(Number);
      return { h, m };
    }
    return { h: 22, m: 0 };
  });
  const [savingPower, setSavingPower] = useState(false);

  const savePowerSchedule = async () => {
    setSavingPower(true);
    try {
      const payload = powerScheduleEnabled
        ? {
            powerOnTime: `${pad2(powerOnTime.h)}:${pad2(powerOnTime.m)}`,
            powerOffTime: `${pad2(powerOffTime.h)}:${pad2(powerOffTime.m)}`,
          }
        : { powerOnTime: null, powerOffTime: null };
      await api.patch(`/televisions/${data.id}`, payload);
      Alert.alert("✅", "Programmation enregistrée");
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer la programmation");
    } finally {
      setSavingPower(false);
    }
  };

  const handlePowerToggle = () => {
    const isOffline = tvStatus === "OFFLINE";
    const action = isOffline ? "ON" : "OFF";
    Alert.alert(
      isOffline ? "Allumer la TV" : "Éteindre la TV",
      `Voulez-vous ${isOffline ? "allumer" : "éteindre"} "${currentData?.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: isOffline ? "Allumer" : "Éteindre",
          onPress: () => {
            socket.emit("tv-power", { tvId: currentData?.id, action });
            setTvStatus(isOffline ? "ONLINE" : "OFFLINE");
          },
        },
      ],
    );
  };

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

  const openPlaylistModal = async () => {
    try {
      const res = await api.get("/playlists/me");
      setAllPlaylists(res.data ?? []);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les playlists");
      return;
    }
    setPlaylistModalVisible(true);
  };

  const handleAssignPlaylist = async (playlist: any) => {
    try {
      await api.patch(`/playlists/${playlist.id}/assign-tv`, {
        televisionId: data.id,
        playlistId: playlist.id,
      });
      setAssignedPlaylists((prev) => [...prev, { playlist, priority: 5, assignedAt: new Date().toISOString() }]);
      setPlaylistModalVisible(false);
    } catch {
      Alert.alert("Erreur", "Impossible d'assigner la playlist");
    }
  };

  const handleUnassignPlaylist = (pl: any) => {
    Alert.alert("Désassigner", `Retirer "${pl.playlist.name}" de cette TV ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/playlists/${pl.playlist.id}/unassign-tv/${data.id}`);
            setAssignedPlaylists((prev) => prev.filter((p) => p.playlist.id !== pl.playlist.id));
          } catch {
            Alert.alert("Erreur", "Impossible de désassigner la playlist");
          }
        },
      },
    ]);
  };

  const cfg = STATUS_CONFIG[tvStatus] ?? STATUS_CONFIG["OFFLINE"];

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

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={[
                  s.editButton,
                  {
                    backgroundColor: tvStatus === "OFFLINE" ? C.successDim : C.errorDim,
                    borderColor: tvStatus === "OFFLINE" ? C.successBorder : C.errorBorder,
                  },
                ]}
                onPress={handlePowerToggle}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="power"
                  size={18}
                  color={tvStatus === "OFFLINE" ? C.success : C.error}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.editButton}
                onPress={() => setIsEditModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={C.accent} />
              </TouchableOpacity>
            </View>
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
          <View style={s.section}>
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[s.card, { borderColor: C.purpleBorder }]}
            >
              <View style={[s.cardHeader, { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[s.cardIconWrap, { backgroundColor: C.purpleDim, borderColor: C.purpleBorder }]}>
                    <Ionicons name="list-outline" size={18} color={C.purple} />
                  </View>
                  <Text style={s.cardTitle}>
                    Playlists assignées ({assignedPlaylists.length})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.cardIconWrap, { backgroundColor: C.purpleDim, borderColor: C.purpleBorder }]}
                  onPress={openPlaylistModal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color={C.purple} />
                </TouchableOpacity>
              </View>

              {assignedPlaylists.length === 0 ? (
                <TouchableOpacity onPress={openPlaylistModal} activeOpacity={0.7}>
                  <Text style={{ color: C.white40, fontSize: 13, textAlign: "center", paddingVertical: 8 }}>
                    Aucune playlist — Appuyer pour assigner
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10 }}>
                  {assignedPlaylists.map((pl: any) => (
                    <TouchableOpacity
                      key={pl.id ?? pl.playlist.id}
                      onPress={() => router.navigate(`/home/playlists/view/${pl.playlist.id}`)}
                      activeOpacity={0.75}
                    >
                      <LinearGradient
                        colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
                        style={[s.playlistItem, { borderColor: C.border }]}
                      >
                        <View style={[s.playlistTopBar, { backgroundColor: pl.playlist.isActive ? C.success : C.error }]} />
                        <View style={s.playlistBody}>
                          <View style={s.playlistHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.playlistName}>{pl.playlist.name}</Text>
                              {pl.playlist.description ? (
                                <Text style={s.playlistDesc} numberOfLines={1}>{pl.playlist.description}</Text>
                              ) : null}
                            </View>
                            <View style={s.playlistRight}>
                              <View style={[s.priorityBadge, { backgroundColor: getPriorityColor(pl.priority) + "22", borderColor: getPriorityColor(pl.priority) + "55" }]}>
                                <Text style={[s.priorityText, { color: getPriorityColor(pl.priority) }]}>P{pl.priority}</Text>
                              </View>
                              <TouchableOpacity
                                onPress={(e) => { e.stopPropagation(); handleUnassignPlaylist(pl); }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="close-circle-outline" size={18} color={C.error} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={s.playlistFooter}>
                            <View style={[s.statusPill, { backgroundColor: pl.playlist.isActive ? C.successDim : C.errorDim, borderColor: pl.playlist.isActive ? C.successBorder : C.errorBorder }]}>
                              <View style={[s.statusDot, { backgroundColor: pl.playlist.isActive ? C.success : C.error }]} />
                              <Text style={[s.statusPillText, { color: pl.playlist.isActive ? C.success : C.error }]}>
                                {pl.playlist.isActive ? "Active" : "Inactive"}
                              </Text>
                            </View>
                            <Text style={s.assignedDate}>{formatDate(pl.assignedAt)}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </LinearGradient>
          </View>

          {/* ── Modal assignation playlist ── */}
          <Modal visible={playlistModalVisible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
              <View style={{ backgroundColor: "#0F1642", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", padding: 20, gap: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: C.white }}>Assigner une playlist</Text>
                  <TouchableOpacity onPress={() => setPlaylistModalVisible(false)}>
                    <Ionicons name="close" size={22} color={C.white60} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={allPlaylists.filter((pl) => !assignedPlaylists.find((a) => a.playlist?.id === pl.id))}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleAssignPlaylist(item)}
                      activeOpacity={0.75}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.purpleDim, borderWidth: 1, borderColor: C.purpleBorder, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="list-outline" size={16} color={C.purple} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: C.white }}>{item.name}</Text>
                        {item.description ? <Text style={{ fontSize: 12, color: C.white40 }} numberOfLines={1}>{item.description}</Text> : null}
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color={C.purple} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{ color: C.white40, textAlign: "center", paddingVertical: 20 }}>Toutes les playlists sont déjà assignées</Text>}
                />
              </View>
            </View>
          </Modal>

          {/* ── Programmation alimentation ── */}
          <View style={s.section}>
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
              style={[s.card, { borderColor: C.warningBorder }]}
            >
              {/* Header + toggle */}
              <View style={[s.cardHeader, { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[s.cardIconWrap, { backgroundColor: C.warningDim, borderColor: C.warningBorder }]}>
                    <Ionicons name="time-outline" size={18} color={C.warning} />
                  </View>
                  <View>
                    <Text style={s.cardTitle}>Alimentation programmée</Text>
                    {powerScheduleEnabled && (
                      <Text style={{ fontSize: 11, color: C.white40, marginTop: 2 }}>
                        {`${pad2(powerOnTime.h)}:${pad2(powerOnTime.m)} → ${pad2(powerOffTime.h)}:${pad2(powerOffTime.m)}`}
                      </Text>
                    )}
                  </View>
                </View>
                <Switch
                  value={powerScheduleEnabled}
                  onValueChange={setPowerScheduleEnabled}
                  trackColor={{ false: C.border, true: C.warningBorder }}
                  thumbColor={powerScheduleEnabled ? C.warning : C.white40}
                />
              </View>

              {powerScheduleEnabled && (
                <View style={{ gap: 16 }}>
                  {/* Two pickers side by side */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TimePickerField
                      label="Allumage"
                      icon="sunny-outline"
                      iconColor={C.success}
                      value={powerOnTime}
                      onChange={setPowerOnTime}
                    />
                    <View style={{ width: 1, backgroundColor: C.border }} />
                    <TimePickerField
                      label="Extinction"
                      icon="moon-outline"
                      iconColor={C.error}
                      value={powerOffTime}
                      onChange={setPowerOffTime}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={savePowerSchedule}
                    disabled={savingPower}
                    activeOpacity={0.8}
                    style={[s.saveBtn, { borderColor: C.warningBorder, opacity: savingPower ? 0.5 : 1 }]}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={C.warning} />
                    <Text style={[s.saveBtnText, { color: C.warning }]}>
                      {savingPower ? "Enregistrement…" : "Enregistrer"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </View>

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
            {/* ON / OFF */}
            <TouchableOpacity
              style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
              activeOpacity={0.8}
              onPress={handlePowerToggle}
            >
              <LinearGradient
                colors={tvStatus === "OFFLINE"
                  ? [C.successDim, "rgba(0,230,118,0.06)"]
                  : [C.errorDim, "rgba(255,82,82,0.06)"]}
                style={[s.actionBtn, { borderColor: tvStatus === "OFFLINE" ? C.successBorder : C.errorBorder }]}
              >
                <Ionicons
                  name="power"
                  size={18}
                  color={tvStatus === "OFFLINE" ? C.success : C.error}
                />
                <Text style={[s.actionBtnText, { color: tvStatus === "OFFLINE" ? C.success : C.error }]}>
                  {tvStatus === "OFFLINE" ? "Allumer" : "Éteindre"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

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

  // Power schedule
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,183,77,0.08)",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
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
