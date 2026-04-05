import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
  Switch,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getMyTVs } from "@/requests/tv.requests";
import { createPlaylist } from "@/requests/playlists.requests";
import { socket } from "@/scripts/socket.io";
import ScheduleForm from "@/components/schedules/SchelduleForm";
import AddMediaForm from "@/components/medias/AddMediaForm";

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
  errorDim: "rgba(255,82,82,0.10)",
  errorBorder: "rgba(255,82,82,0.28)",
  warning: "#FFB74D",
  warningDim: "rgba(255,183,77,0.10)",
  warningBorder: "rgba(255,183,77,0.28)",
  purple: "#7C4DFF",
  purpleDim: "rgba(124,77,255,0.12)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  iconColor = C.accent,
  children,
}: {
  icon: string;
  title: string;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View
          style={[
            s.sectionIconWrap,
            {
              backgroundColor: iconColor + "18",
              borderColor: iconColor + "40",
            },
          ]}
        >
          <Ionicons name={icon as any} size={16} color={iconColor} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── SUMMARY ROW ──────────────────────────────────────────────────────────────
function SummaryRow({
  icon,
  label,
  value,
  color = C.accent,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={s.summaryRow}>
      <View
        style={[
          s.summaryIcon,
          { backgroundColor: color + "15", borderColor: color + "30" },
        ]}
      >
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.summaryLabel}>{label}</Text>
        <Text style={s.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── TV MODAL ─────────────────────────────────────────────────────────────────
function TVModal({
  visible,
  televisions,
  selectedTV,
  onSelect,
  onClose,
}: {
  visible: boolean;
  televisions: any[];
  selectedTV: any;
  onSelect: (tv: any) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent
    >
      <View style={s.tvModalOverlay}>
        <View style={s.tvModalSheet}>
          <LinearGradient
            colors={[C.bgMid, "#0D1B4B"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Handle */}
          <View style={s.sheetHandle} />

          {/* Header */}
          <View style={s.tvModalHeader}>
            <View style={s.tvModalTitleWrap}>
              <Ionicons name="tv-outline" size={18} color={C.cyan} />
              <Text style={s.tvModalTitle}>Sélectionner un écran</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.tvModalClose}>
              <Ionicons name="close" size={18} color={C.white60} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={televisions}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => {
              const isSelected = selectedTV?.id === item.id;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[s.tvItem, isSelected && s.tvItemSelected]}>
                    {/* Left accent */}
                    {isSelected && <View style={s.tvItemAccent} />}

                    <View
                      style={[
                        s.tvItemIcon,
                        {
                          backgroundColor: item.status
                            ? C.successDim
                            : C.white10,
                          borderColor: item.status ? C.successBorder : C.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="tv-outline"
                        size={18}
                        color={item.status ? C.success : C.white40}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[s.tvItemName, isSelected && { color: C.white }]}
                      >
                        {item.name}
                      </Text>
                      <View style={s.tvItemStatus}>
                        <View
                          style={[
                            s.statusDot,
                            {
                              backgroundColor: item.status
                                ? C.success
                                : C.error,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            s.tvItemStatusText,
                            { color: item.status ? C.success : C.error },
                          ]}
                        >
                          {item.status ? "En ligne" : "Hors ligne"}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={s.tvCheckWrap}>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={C.accent}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── SAVING OVERLAY ───────────────────────────────────────────────────────────
function SavingOverlay({ visible }: { visible: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.savingOverlay}>
        <View style={s.savingCard}>
          <LinearGradient
            colors={[C.bgMid, "#0D1B4B"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View
            style={[s.savingOrb, { transform: [{ scale: pulse }] }]}
          >
            <LinearGradient
              colors={[C.accent, C.cyan]}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="musical-notes" size={28} color={C.bgDeep} />
          </Animated.View>
          <Text style={s.savingTitle}>Création en cours…</Text>
          <Text style={s.savingSub}>Veuillez patienter</Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AddPlaylistScreen() {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [televisions, setTV] = useState<any[]>([]);
  const [selectedTV, setSelectedTV] = useState<any>(null);
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const [showTVSelector, setShowTVSelector] = useState(false);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [launchDate, setLaunchDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  });

  const headerY = useRef(new Animated.Value(-10)).current;
  const headerO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getMyTVs().then(setTV);
    Animated.parallel([
      Animated.spring(headerY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(headerO, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onDateChange = (_: any, d?: Date) => {
    setShowDatePicker(false);
    if (!d) return;
    const n = new Date(launchDate);
    n.setFullYear(d.getFullYear());
    n.setMonth(d.getMonth());
    n.setDate(d.getDate());
    setLaunchDate(n);
  };
  const onTimeChange = (_: any, t?: Date) => {
    setShowTimePicker(false);
    if (!t) return;
    const n = new Date(launchDate);
    n.setHours(t.getHours());
    n.setMinutes(t.getMinutes());
    setLaunchDate(n);
  };

  const getTotalDuration = () =>
    selectedMedia.reduce((t, m) => t + (m.duration || 0), 0);
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60),
      r = s % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  const isFormValid = title.trim() && selectedTV && selectedMedia.length > 0;

  const handleSave = async () => {
    if (!isFormValid) return;
    Alert.alert("Créer la playlist", "Voulez-vous créer cette playlist ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Créer",
        onPress: async () => {
          try {
            setIsSaving(true);
            const data = {
              titre: title.trim(),
              items: selectedMedia,
              television: selectedTV.id,
              launch_date: launchDate.toISOString(),
              ...scheduleData,
              isActive,
            };
            const response = await createPlaylist(data);
            if (response && selectedTV.status) {
              socket.emit("playlist_created", {
                tv_id: selectedTV.id,
                playlist: response,
              });
            }
            Alert.alert("🎉 Succès", "Playlist créée avec succès !");
            router.replace("/home");
          } catch (e) {
            console.error(e);
            Alert.alert("Erreur", "Impossible de créer la playlist");
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.root}>
      <LinearGradient
        colors={[C.bgDeep, C.bgMid, "#0D1B4B"]}
        style={StyleSheet.absoluteFillObject}
      />
      <SavingOverlay visible={isSaving} />

      {/* ── HEADER ── */}
      <Animated.View
        style={[
          s.header,
          { opacity: headerO, transform: [{ translateY: headerY }] },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.white80} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Nouvelle playlist</Text>
          <Text style={s.headerSub}>Configurez votre contenu</Text>
        </View>

        {/* Step indicator */}
        <View style={s.stepIndicator}>
          {[
            C.accent,
            selectedMedia.length > 0 ? C.accent : C.white20,
            selectedTV ? C.accent : C.white20,
          ].map((c, i) => (
            <View
              key={i}
              style={[
                s.stepDot,
                { backgroundColor: c, width: i === 0 ? 16 : 6 },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TITRE ── */}
        <SectionCard
          icon="text-outline"
          title="Titre de la playlist"
          iconColor={C.accent}
        >
          <View style={s.inputWrap}>
            <TextInput
              style={s.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nom de votre playlist…"
              placeholderTextColor={C.white40}
              selectionColor={C.accent}
            />
            {title.length > 0 && (
              <TouchableOpacity
                onPress={() => setTitle("")}
                style={s.inputClear}
              >
                <Ionicons name="close-circle" size={18} color={C.white40} />
              </TouchableOpacity>
            )}
          </View>
          {title.length > 0 && (
            <Text style={s.charCount}>{title.length} caractères</Text>
          )}
        </SectionCard>

        {/* ── MÉDIAS ── */}
        <SectionCard icon="images-outline" title="Médias" iconColor={C.cyan}>
          <AddMediaForm
            onSave={(data) => setSelectedMedia(data)}
            medias={selectedMedia}
          />
          {selectedMedia.length > 0 && (
            <View style={s.mediaSummaryRow}>
              <View
                style={[
                  s.mediaBadge,
                  { borderColor: C.cyanBorder, backgroundColor: C.cyanDim },
                ]}
              >
                <Ionicons name="film-outline" size={13} color={C.cyan} />
                <Text style={[s.mediaBadgeText, { color: C.cyan }]}>
                  {selectedMedia.length} média
                  {selectedMedia.length > 1 ? "s" : ""}
                </Text>
              </View>
              <View
                style={[
                  s.mediaBadge,
                  { borderColor: C.accentBorder, backgroundColor: C.accentDim },
                ]}
              >
                <Ionicons name="time-outline" size={13} color={C.accent} />
                <Text style={[s.mediaBadgeText, { color: C.accent }]}>
                  {formatDuration(getTotalDuration())}
                </Text>
              </View>
            </View>
          )}
        </SectionCard>

        {/* ── TÉLÉVISION ── */}
        <SectionCard icon="tv-outline" title="Écran cible" iconColor={C.purple}>
          <TouchableOpacity
            style={[
              s.tvSelector,
              selectedTV && { borderColor: C.accentBorder },
            ]}
            onPress={() => setShowTVSelector(true)}
            activeOpacity={0.8}
          >
            {selectedTV ? (
              <View style={s.tvSelectorSelected}>
                <View
                  style={[
                    s.tvSelectorIcon,
                    {
                      backgroundColor: C.successDim,
                      borderColor: C.successBorder,
                    },
                  ]}
                >
                  <Ionicons name="tv" size={16} color={C.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.tvSelectorName}>{selectedTV.name}</Text>
                  <View style={s.tvSelectorStatus}>
                    <View
                      style={[
                        s.statusDot,
                        {
                          backgroundColor: selectedTV.status
                            ? C.success
                            : C.error,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        s.tvSelectorStatusText,
                        { color: selectedTV.status ? C.success : C.error },
                      ]}
                    >
                      {selectedTV.status ? "En ligne" : "Hors ligne"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.tvSelectorPlaceholderWrap}>
                <Ionicons name="tv-outline" size={18} color={C.white40} />
                <Text style={s.tvSelectorPlaceholder}>
                  Sélectionner un écran
                </Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={18} color={C.white40} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── PLANIFICATION ── */}
        <SectionCard
          icon="calendar-outline"
          title="Planification"
          iconColor={C.warning}
        >
          <ScheduleForm
            onSave={(data) =>
              setScheduleData((prev: any) => ({ ...prev, ...data }))
            }
          />
        </SectionCard>

        {/* ── STATUT ── */}
        <SectionCard
          icon={isActive ? "play-circle-outline" : "pause-circle-outline"}
          title="Statut de diffusion"
          iconColor={isActive ? C.success : C.white40}
        >
          <View style={s.statusRow}>
            <View style={s.statusLeft}>
              <View
                style={[
                  s.statusIconWrap,
                  {
                    backgroundColor: isActive ? C.successDim : C.white10,
                    borderColor: isActive ? C.successBorder : C.border,
                  },
                ]}
              >
                <Ionicons
                  name={isActive ? "radio" : "radio-outline"}
                  size={16}
                  color={isActive ? C.success : C.white40}
                />
              </View>
              <View>
                <Text style={s.statusTitle}>
                  {isActive ? "Activer immédiatement" : "Garder en brouillon"}
                </Text>
                <Text style={s.statusSub}>
                  {isActive
                    ? "La playlist sera diffusée dès la création"
                    : "Vous pourrez l'activer plus tard"}
                </Text>
              </View>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: C.white10, true: C.accentDim }}
              thumbColor={isActive ? C.accent : C.white40}
              ios_backgroundColor={C.white10}
            />
          </View>
        </SectionCard>

        {/* ── RÉSUMÉ ── */}
        {selectedMedia.length > 0 && selectedTV && (
          <View style={s.summaryCard}>
            <LinearGradient
              colors={[C.accentDim, C.cyanDim]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={s.summaryTopBar} />
            <View style={s.summaryCardInner}>
              <Text style={s.summaryCardTitle}>📋 Résumé</Text>
              <SummaryRow
                icon="tv-outline"
                label="Télévision"
                value={selectedTV.name}
                color={C.cyan}
              />
              <SummaryRow
                icon="images-outline"
                label="Médias"
                value={`${selectedMedia.length} élément(s)`}
                color={C.accent}
              />
              <SummaryRow
                icon="time-outline"
                label="Durée totale"
                value={formatDuration(getTotalDuration())}
                color={C.purple}
              />
              <SummaryRow
                icon="calendar-outline"
                label="Date de lancement"
                color={C.warning}
                value={
                  launchDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }) +
                  " à " +
                  launchDate.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── SAVE BAR ── */}
      <View style={s.saveBar}>
        <LinearGradient
          colors={["transparent", C.bgDeep + "CC", C.bgDeep]}
          style={s.saveBarBlur}
          pointerEvents="none"
        />
        <TouchableOpacity
          style={[s.saveBtn, !isFormValid && { opacity: 0.45 }]}
          onPress={handleSave}
          disabled={!isFormValid || isSaving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isFormValid ? [C.accent, C.cyan] : [C.white20, C.white10]}
            style={s.saveBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={isFormValid ? C.bgDeep : C.white40}
            />
            <Text
              style={[
                s.saveBtnText,
                { color: isFormValid ? C.bgDeep : C.white40 },
              ]}
            >
              Créer la playlist
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── TV MODAL ── */}
      <TVModal
        visible={showTVSelector}
        televisions={televisions}
        selectedTV={selectedTV}
        onSelect={setSelectedTV}
        onClose={() => setShowTVSelector(false)}
      />

      {/* ── DATE / TIME PICKERS ── */}
      {showDatePicker && (
        <DateTimePicker
          value={launchDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={launchDate}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onTimeChange}
        />
      )}
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
  stepIndicator: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDot: { height: 6, borderRadius: 3 },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 130, gap: 12 },

  // Section
  section: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: C.white80 },

  // Input
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.white05,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: C.white,
    fontWeight: "500",
  },
  inputClear: { paddingLeft: 8 },
  charCount: { fontSize: 11, color: C.white40, textAlign: "right" },

  // Media summary
  mediaSummaryRow: { flexDirection: "row", gap: 8 },
  mediaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  mediaBadgeText: { fontSize: 12, fontWeight: "600" },

  // TV Selector
  tvSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.white05,
    padding: 12,
  },
  tvSelectorSelected: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  tvSelectorIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tvSelectorName: { fontSize: 15, fontWeight: "700", color: C.white80 },
  tvSelectorStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  tvSelectorStatusText: { fontSize: 11, fontWeight: "600" },
  tvSelectorPlaceholderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  tvSelectorPlaceholder: { fontSize: 14, color: C.white40 },

  // Status toggle
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  statusIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: { fontSize: 14, fontWeight: "700", color: C.white80 },
  statusSub: { fontSize: 11, color: C.white40, marginTop: 2, flexShrink: 1 },

  // Summary card
  summaryCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  summaryTopBar: { height: 2, backgroundColor: C.accent },
  summaryCardInner: { padding: 16, gap: 10 },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.white,
    marginBottom: 4,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 11, color: C.white40, fontWeight: "500" },
  summaryValue: { fontSize: 13, fontWeight: "700", color: C.white80 },

  // Save bar
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  saveBarBlur: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    height: 60,
  },
  saveBtn: { borderRadius: 18, overflow: "hidden" },
  saveBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },

  // Saving overlay
  savingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  savingCard: {
    width: 220,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    padding: 28,
    gap: 12,
  },
  savingOrb: {
    width: 70,
    height: 70,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  savingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.white,
    textAlign: "center",
  },
  savingSub: { fontSize: 13, color: C.white40, textAlign: "center" },

  // TV Modal
  tvModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  tvModalSheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: C.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.white20,
    alignSelf: "center",
    marginTop: 12,
  },
  tvModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tvModalTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  tvModalTitle: { fontSize: 16, fontWeight: "700", color: C.white },
  tvModalClose: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },

  // TV Item
  tvItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
    overflow: "hidden",
  },
  tvItemSelected: { borderColor: C.accentBorder, backgroundColor: C.accentDim },
  tvItemAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.accent,
  },
  tvItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tvItemName: { fontSize: 15, fontWeight: "700", color: C.white60 },
  tvItemStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  tvItemStatusText: { fontSize: 11, fontWeight: "600" },
  tvCheckWrap: { marginLeft: "auto" },

  // Shared
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});
