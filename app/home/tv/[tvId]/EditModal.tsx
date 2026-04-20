import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import api from "@/scripts/fetch.api";
import { socket } from "@/scripts/socket.io";

const { height } = Dimensions.get("window");

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

interface EditTvModalProps {
  visible: boolean;
  data: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

const EditTvModal: React.FC<EditTvModalProps> = ({
  visible,
  data,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    id: data?.id || "",
    name: data?.name || "",
    description: data?.description || "",
    resolution: data?.resolution || "HD_1080P",
    orientation: data?.orientation || "LANDSCAPE",
    volume: data?.volume || 50,
    autoPlay: data?.autoPlay || false,
    loop: data?.loop || false,
    transition: data?.transition || "FADE",
    refreshRate: data?.refreshRate || 30,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (visible && data?.id) {
      api.get(`/schedules/tv/${data.id}`)
        .then((res) => setSchedules(res.data))
        .catch(() => setSchedules([]));
    }
  }, [visible, data?.id]);

  const toggleSchedule = async (scheduleId: string, current: boolean) => {
    try {
      await api.patch(`/schedules/${scheduleId}`, { isActive: !current });
      setSchedules((prev) =>
        prev.map((s) => s.id === scheduleId ? { ...s, isActive: !current } : s)
      );
      socket.emit("tv-schedules-updated", { tvId: data?.id });
    } catch {
      Alert.alert("Erreur", "Impossible de modifier la programmation");
    }
  };

  const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const slideAnim = useRef(new Animated.Value(height)).current;

  const resolutionOptions = [
    { label: "HD 720p", value: "HD_720P" },
    { label: "Full HD 1080p", value: "HD_1080P" },
    { label: "4K Ultra HD", value: "4K" },
    { label: "8K", value: "8K" },
  ];

  const orientationOptions = [
    { label: "Paysage", value: "LANDSCAPE" },
    { label: "Portrait", value: "PORTRAIT" },
  ];

  const transitionOptions = [
    { label: "Fondu", value: "FADE" },
    { label: "Glissement", value: "SLIDE" },
    { label: "Zoom", value: "ZOOM" },
    { label: "Aucune", value: "NONE" },
  ];

  const refreshRateOptions = [
    { label: "24 Hz", value: 24 },
    { label: "30 Hz", value: 30 },
    { label: "60 Hz", value: 60 },
    { label: "120 Hz", value: 120 },
  ];

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : height,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Resynchroniser le formulaire quand les données de la TV changent
  React.useEffect(() => {
    if (data) {
      setFormData({
        id: data.id || "",
        name: data.name || "",
        description: data.description || "",
        resolution: data.resolution || "HD_1080P",
        orientation: data.orientation || "LANDSCAPE",
        volume: data.volume ?? 50,
        autoPlay: data.autoPlay ?? false,
        loop: data.loop ?? false,
        transition: data.transition || "FADE",
        refreshRate: data.refreshRate ?? 30,
      });
    }
  }, [data]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Erreur", "Le nom de la télévision est requis");
      return;
    }
    setIsLoading(true);
    try {
      await api.patch("/televisions/" + formData.id, formData);
      const updatedData = {
        ...data,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      onSave(updatedData);
      Alert.alert("Succès", "Télévision mise à jour avec succès");
      onClose();
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour la télévision");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Volume slider ──
  const VolumeSlider = () => {
    const [localVolume, setLocalVolume] = useState(formData.volume);
    return (
      <View style={s.volumeContainer}>
        <View style={s.selectorHeader}>
          <View
            style={[
              s.selectorIconWrap,
              { backgroundColor: C.cyanDim, borderColor: C.cyanBorder },
            ]}
          >
            <Ionicons name="volume-high-outline" size={16} color={C.cyan} />
          </View>
          <Text style={s.selectorTitle}>Volume : {localVolume}%</Text>
        </View>
        <TouchableOpacity
          style={s.volumeTrack}
          onPress={(e) => {
            const { locationX } = e.nativeEvent;
            const pct = Math.round((locationX / 240) * 100);
            const v = Math.max(0, Math.min(100, pct));
            setLocalVolume(v);
            updateField("volume", v);
          }}
        >
          <View
            style={[s.volumeProgress, { width: `${localVolume}%` as any }]}
          />
          <View style={[s.volumeThumb, { left: `${localVolume}%` as any }]} />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Option chips selector ──
  const OptionSelector = ({
    title,
    options,
    value,
    onSelect,
    iconName,
    iconColor,
    iconBg,
    iconBorder,
    activeColor,
    activeDim,
    activeBorder,
  }: {
    title: string;
    options: Array<{ label: string; value: any }>;
    value: any;
    onSelect: (v: any) => void;
    iconName: string;
    iconColor: string;
    iconBg: string;
    iconBorder: string;
    activeColor: string;
    activeDim: string;
    activeBorder: string;
  }) => (
    <View style={s.selectorContainer}>
      <View style={s.selectorHeader}>
        <View
          style={[
            s.selectorIconWrap,
            { backgroundColor: iconBg, borderColor: iconBorder },
          ]}
        >
          <Ionicons name={iconName as any} size={16} color={iconColor} />
        </View>
        <Text style={s.selectorTitle}>{title}</Text>
      </View>
      <View style={s.optionsGrid}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                s.optionChip,
                active
                  ? { backgroundColor: activeDim, borderColor: activeBorder }
                  : { backgroundColor: C.white05, borderColor: C.border },
              ]}
              onPress={() => onSelect(opt.value)}
            >
              <Text
                style={[
                  s.optionChipText,
                  { color: active ? activeColor : C.white40 },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const statusColor = data?.status === "ONLINE" ? C.success : C.error;
  const statusDim = data?.status === "ONLINE" ? C.successDim : C.errorDim;
  const statusBorder =
    data?.status === "ONLINE" ? C.successBorder : C.errorBorder;

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={40} tint="dark" style={s.overlay}>
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* ── Handle bar ── */}
          <View style={s.handle} />

          {/* ── Header ── */}
          <LinearGradient
            colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.03)"]}
            style={s.modalHeader}
          >
            <TouchableOpacity
              style={s.headerBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={C.white60} />
            </TouchableOpacity>

            <Text style={s.modalTitle}>Modifier la télévision</Text>

            <TouchableOpacity
              style={[s.headerBtn, s.saveBtn, isLoading && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isLoading ? "hourglass-outline" : "checkmark"}
                size={18}
                color={C.success}
              />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
          >
            {/* ── Informations générales ── */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View
                  style={[
                    s.sectionIconWrap,
                    {
                      backgroundColor: C.accentDim,
                      borderColor: C.accentBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={C.accent}
                  />
                </View>
                <Text style={s.sectionTitle}>Informations générales</Text>
              </View>

              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Nom de la télévision *</Text>
                <TextInput
                  style={s.textInput}
                  value={formData.name}
                  onChangeText={(t) => updateField("name", t)}
                  placeholder="Ex : Samsung TV Salon"
                  placeholderTextColor={C.white20}
                  selectionColor={C.accent}
                />
              </View>

              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Description</Text>
                <TextInput
                  style={[s.textInput, s.textArea]}
                  value={formData.description}
                  onChangeText={(t) => updateField("description", t)}
                  placeholder="Description optionnelle…"
                  placeholderTextColor={C.white20}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  selectionColor={C.accent}
                />
              </View>
            </View>

            {/* ── Paramètres d'affichage ── */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View
                  style={[
                    s.sectionIconWrap,
                    {
                      backgroundColor: C.successDim,
                      borderColor: C.successBorder,
                    },
                  ]}
                >
                  <Ionicons name="tv-outline" size={18} color={C.success} />
                </View>
                <Text style={s.sectionTitle}>Paramètres d'affichage</Text>
              </View>

              <OptionSelector
                title="Résolution"
                options={resolutionOptions}
                value={formData.resolution}
                onSelect={(v) => updateField("resolution", v)}
                iconName="scan-outline"
                iconColor={C.accent}
                iconBg={C.accentDim}
                iconBorder={C.accentBorder}
                activeColor={C.accent}
                activeDim={C.accentDim}
                activeBorder={C.accentBorder}
              />

              <OptionSelector
                title="Orientation"
                options={orientationOptions}
                value={formData.orientation}
                onSelect={(v) => updateField("orientation", v)}
                iconName="phone-portrait-outline"
                iconColor={C.cyan}
                iconBg={C.cyanDim}
                iconBorder={C.cyanBorder}
                activeColor={C.cyan}
                activeDim={C.cyanDim}
                activeBorder={C.cyanBorder}
              />

              <OptionSelector
                title="Type de transition"
                options={transitionOptions}
                value={formData.transition}
                onSelect={(v) => updateField("transition", v)}
                iconName="swap-horizontal-outline"
                iconColor={C.purple}
                iconBg={C.purpleDim}
                iconBorder={C.purpleBorder}
                activeColor={C.purple}
                activeDim={C.purpleDim}
                activeBorder={C.purpleBorder}
              />

              {/* <OptionSelector
                title="Taux de rafraîchissement"
                options={refreshRateOptions}
                value={formData.refreshRate}
                onSelect={(v) => updateField("refreshRate", v)}
                iconName="speedometer-outline"
                iconColor={C.warning}
                iconBg={C.warningDim}
                iconBorder={C.warningBorder}
                activeColor={C.warning}
                activeDim={C.warningDim}
                activeBorder={C.warningBorder}
              /> */}
            </View>

            {/* ── Paramètres de lecture ── */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View
                  style={[
                    s.sectionIconWrap,
                    {
                      backgroundColor: C.purpleDim,
                      borderColor: C.purpleBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="play-circle-outline"
                    size={18}
                    color={C.purple}
                  />
                </View>
                <Text style={s.sectionTitle}>Paramètres de lecture</Text>
              </View>

              {/* <VolumeSlider /> */}

              {/* Auto play */}
              <LinearGradient
                colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
                style={s.switchRow}
              >
                <View
                  style={[
                    s.switchIcon,
                    {
                      backgroundColor: C.accentDim,
                      borderColor: C.accentBorder,
                    },
                  ]}
                >
                  <Ionicons name="play-outline" size={16} color={C.accent} />
                </View>
                <View style={s.switchLabels}>
                  <Text style={s.switchLabel}>Lecture automatique</Text>
                  <Text style={s.switchDesc}>
                    Démarre automatiquement la lecture
                  </Text>
                </View>
                <Switch
                  value={formData.autoPlay}
                  onValueChange={(v) => updateField("autoPlay", v)}
                  trackColor={{ false: C.white10, true: C.accentDim }}
                  thumbColor={formData.autoPlay ? C.accent : C.white40}
                />
              </LinearGradient>

              {/* Loop */}
              <LinearGradient
                colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
                style={s.switchRow}
              >
                <View
                  style={[
                    s.switchIcon,
                    {
                      backgroundColor: C.purpleDim,
                      borderColor: C.purpleBorder,
                    },
                  ]}
                >
                  <Ionicons name="repeat-outline" size={16} color={C.purple} />
                </View>
                <View style={s.switchLabels}>
                  <Text style={s.switchLabel}>Lecture en boucle</Text>
                  <Text style={s.switchDesc}>
                    Répète la lecture indéfiniment
                  </Text>
                </View>
                <Switch
                  value={formData.loop}
                  onValueChange={(v) => updateField("loop", v)}
                  trackColor={{ false: C.white10, true: C.purpleDim }}
                  thumbColor={formData.loop ? C.purple : C.white40}
                />
              </LinearGradient>
            </View>

            {/* ── Programmation ── */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIconWrap, { backgroundColor: C.warningDim, borderColor: C.warningBorder }]}>
                  <Ionicons name="calendar-outline" size={18} color={C.warning} />
                </View>
                <Text style={s.sectionTitle}>Programmation</Text>
              </View>

              {schedules.length === 0 ? (
                <LinearGradient
                  colors={["rgba(255,255,255,0.04)", "rgba(255,255,255,0.01)"]}
                  style={[s.switchRow, { justifyContent: "center" }]}
                >
                  <Text style={{ color: C.white40, fontSize: 13 }}>
                    Aucune programmation assignée
                  </Text>
                </LinearGradient>
              ) : (
                schedules.map((sch) => (
                  <LinearGradient
                    key={sch.id}
                    colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
                    style={[s.switchRow, { flexDirection: "column", alignItems: "flex-start", gap: 8 }]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
                      <View style={[s.switchIcon, { backgroundColor: C.warningDim, borderColor: C.warningBorder }]}>
                        <Ionicons name="time-outline" size={16} color={C.warning} />
                      </View>
                      <View style={[s.switchLabels, { marginLeft: 12 }]}>
                        <Text style={s.switchLabel} numberOfLines={1}>
                          {sch.playlist?.name ?? sch.title}
                        </Text>
                        <Text style={s.switchDesc}>
                          {sch.startTime} → {sch.endTime}
                          {"  "}
                          {(sch.daysOfWeek ?? []).map((d: number) => DAY_LABELS[d]).join(", ")}
                        </Text>
                      </View>
                      <Switch
                        value={sch.isActive}
                        onValueChange={() => toggleSchedule(sch.id, sch.isActive)}
                        trackColor={{ false: C.white10, true: C.warningDim }}
                        thumbColor={sch.isActive ? C.warning : C.white40}
                      />
                    </View>
                  </LinearGradient>
                ))
              )}
            </View>

            {/* ── Résumé ── */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View
                  style={[
                    s.sectionIconWrap,
                    {
                      backgroundColor: C.warningDim,
                      borderColor: C.warningBorder,
                    },
                  ]}
                >
                  <Ionicons name="eye-outline" size={18} color={C.warning} />
                </View>
                <Text style={s.sectionTitle}>Résumé</Text>
              </View>

              <LinearGradient
                colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
                style={s.summaryCard}
              >
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Device ID</Text>
                  <Text style={s.summaryValue}>{data?.deviceId ?? "—"}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Code de connexion</Text>
                  <Text style={s.summaryValue}>
                    {data?.codeConnection ?? "—"}
                  </Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Statut actuel</Text>
                  <View
                    style={[
                      s.statusPill,
                      { backgroundColor: statusDim, borderColor: statusBorder },
                    ]}
                  >
                    <View
                      style={[s.statusDot, { backgroundColor: statusColor }]}
                    />
                    <Text style={[s.statusPillText, { color: statusColor }]}>
                      {data?.status}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0D1340",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.92,
    minHeight: height * 0.6,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  // Header
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: "rgba(0,230,118,0.12)",
    borderColor: "rgba(0,230,118,0.28)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  scroll: { paddingBottom: 20 },

  // Section
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Inputs
  inputContainer: { gap: 6 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.40)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  // Selector
  selectorContainer: { gap: 10 },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectorIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.80)",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Volume
  volumeContainer: { gap: 12 },
  volumeTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    position: "relative",
    width: 240,
    marginLeft: 4,
  },
  volumeProgress: {
    height: "100%",
    backgroundColor: "#00E5FF",
    borderRadius: 3,
  },
  volumeThumb: {
    position: "absolute",
    width: 16,
    height: 16,
    backgroundColor: "#00E5FF",
    borderRadius: 8,
    top: -5,
    marginLeft: -8,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 5,
  },

  // Switch row
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  switchIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchLabels: { flex: 1 },
  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  switchDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
    marginTop: 2,
  },

  // Summary
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    gap: 0,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  summaryLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.40)",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

export default EditTvModal;
