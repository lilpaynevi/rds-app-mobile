import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { myPlaylists, setPlaylistActive } from "@/requests/playlists.requests";
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
/** Programmation retenue pour l'affichage d'une carte. */
interface PlaylistSchedule {
  startTime: string;
  endTime: string;
  /** 0 = dimanche, convention de `Date.getDay()` */
  daysOfWeek: number[];
  isActive: boolean;
  /** Nombre de programmations en plus de celle affichée. */
  extraCount: number;
}

/**
 * Clé du groupe qui rassemble les playlists sans écran. Un sentinelle explicite
 * plutôt que le libellé affiché : il ne doit jamais entrer en collision avec un
 * identifiant d'écran, et le libellé peut changer sans casser le regroupement.
 */
const UNASSIGNED_ID = "__unassigned__";

interface PlaylistItem {
  id: string;
  /** Clé de rendu : une playlist peut figurer sous plusieurs écrans. */
  rowKey: string;
  title: string;
  description: string;
  mediaCount: number;
  duration: string;
  televisionId: string;
  televisionName: string;
  status: "active" | "inactive" | "scheduled";
  lastModified: string;
  schedule: PlaylistSchedule | null;
  /**
   * Rang de passage dans la file de diffusion de l'écran, à partir de 1.
   * `null` quand la playlist n'est pas en file : elle existe, mais n'entre
   * pas dans la rotation.
   */
  position: number | null;
  /**
   * Activation sur CET écran (`PlaylistTelevision.isActive`), et non le
   * `Playlist.isActive` global : c'est ce drapeau que le serveur consulte pour
   * décider ce qu'un écran a le droit de diffuser.
   */
  isEnabled: boolean;
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
  onToggleActive,
  isToggling = false,
}: {
  playlist: PlaylistItem;
  onPress: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isToggling?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const st = STATUS[playlist.status] ?? STATUS.inactive;

  // La file d'attente est par écran : sans télévision assignée, il n'y a pas
  // d'écran sur lequel activer la playlist.
  const canToggle = playlist.televisionId !== UNASSIGNED_ID;

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
            {/* Row 1 : rang, titre, actions rapides */}
            <View style={s.cardHead}>
              <View style={s.cardTitleWrap}>
                {/* Rang de passage dans la file de l'écran */}
                {playlist.position !== null && (
                  <View style={s.rankBadge}>
                    <Text style={s.rankText}>N°{playlist.position}</Text>
                  </View>
                )}

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

              {/* Actions rapides */}
              <View style={s.cardActions}>
                {/* Activer / désactiver la diffusion sur cet écran. Masqué sans
                    assignation : le serveur refuserait l'appel. */}
                {canToggle && (
                  <TouchableOpacity
                    onPress={onToggleActive}
                    disabled={isToggling}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: playlist.isEnabled }}
                    accessibilityLabel={
                      playlist.isEnabled
                        ? "Désactiver la diffusion"
                        : "Activer la diffusion"
                    }
                  >
                    <View
                      style={[
                        s.actionBtn,
                        playlist.isEnabled
                          ? {
                              backgroundColor: C.successDim,
                              borderColor: C.successBorder,
                            }
                          : {
                              backgroundColor: C.white05,
                              borderColor: C.border,
                            },
                        isToggling && { opacity: 0.45 },
                      ]}
                    >
                      {isToggling ? (
                        <ActivityIndicator
                          size="small"
                          color={playlist.isEnabled ? C.success : C.white40}
                        />
                      ) : (
                        <Ionicons
                          name="power"
                          size={15}
                          color={playlist.isEnabled ? C.success : C.white40}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onDelete}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={s.deleteBtnInner}>
                    <Ionicons name="trash-outline" size={15} color={C.error} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}

            {/* Programmation : horaires et jours de diffusion */}
            {playlist.schedule && (
              <ScheduleBanner schedule={playlist.schedule} />
            )}

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

// ─── PROGRAMMATION ────────────────────────────────────────────────────────────
/** Index 0 = dimanche, pour coller à `Date.getDay()` et au stockage serveur. */
const DAY_INITIALS = ["D", "L", "M", "M", "J", "V", "S"];
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Semaine complète et week-end méritent un libellé plutôt que sept pastilles. */
function describeDays(days: number[]): string | null {
  const unique = [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort();
  if (unique.length === 0) return "Tous les jours";
  if (unique.length === 7) return "Tous les jours";
  if (unique.join() === "1,2,3,4,5") return "En semaine";
  if (unique.join() === "0,6") return "Week-end";
  return null;
}

function ScheduleBanner({ schedule }: { schedule: PlaylistSchedule }) {
  const today = new Date().getDay();
  const activeDays = new Set(
    schedule.daysOfWeek.length > 0
      ? schedule.daysOfWeek
      : [0, 1, 2, 3, 4, 5, 6],
  );
  const summary = describeDays(schedule.daysOfWeek);

  return (
    <View
      style={[
        scheduleStyles.scheduleBanner,
        !schedule.isActive && { opacity: 0.5, borderColor: C.border },
      ]}
    >
      <View style={scheduleStyles.scheduleTop}>
        <Ionicons
          name={schedule.isActive ? "calendar" : "calendar-outline"}
          size={13}
          color={C.warning}
        />
        <Text style={scheduleStyles.scheduleHours}>
          {schedule.startTime} → {schedule.endTime}
        </Text>
        {!schedule.isActive && (
          <Text style={scheduleStyles.scheduleOff}>désactivée</Text>
        )}
        {schedule.extraCount > 0 && (
          <Text style={scheduleStyles.scheduleExtra}>
            +{schedule.extraCount}
          </Text>
        )}
      </View>

      {summary ? (
        <Text style={scheduleStyles.scheduleDaysLabel}>{summary}</Text>
      ) : (
        // Pastilles seulement pour une sélection irrégulière : sept pastilles
        // pour « tous les jours » sont plus longues à lire qu'un libellé.
        <View style={scheduleStyles.scheduleDaysRow}>
          {DAY_INITIALS.map((initial, day) => {
            const on = activeDays.has(day);
            return (
              <View
                key={`${initial}-${day}`}
                accessibilityLabel={DAY_NAMES[day]}
                style={[
                  scheduleStyles.dayDot,
                  on && scheduleStyles.dayDotOn,
                  // L'aujourd'hui est souligné : c'est l'information la plus
                  // utile en un coup d'œil — « est-ce que ça passe ce jour ? »
                  day === today && scheduleStyles.dayDotToday,
                ]}
              >
                <Text
                  style={[
                    scheduleStyles.dayDotText,
                    on && scheduleStyles.dayDotTextOn,
                  ]}
                >
                  {initial}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const scheduleStyles = StyleSheet.create({
  scheduleBanner: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.warningDim,
    borderWidth: 1,
    borderColor: C.warningBorder,
    gap: 7,
  },
  scheduleTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduleHours: {
    fontSize: 13,
    fontWeight: "700",
    color: C.warning,
    // Les deux heures s'alignent d'une carte à l'autre
    fontVariant: ["tabular-nums"],
  },
  scheduleOff: {
    fontSize: 10,
    fontWeight: "600",
    color: C.white40,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scheduleExtra: {
    marginLeft: "auto",
    fontSize: 10,
    fontWeight: "700",
    color: C.warning,
  },
  scheduleDaysLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.white60,
  },
  scheduleDaysRow: {
    flexDirection: "row",
    gap: 4,
  },
  dayDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
  },
  dayDotOn: {
    backgroundColor: "rgba(255,183,77,0.22)",
    borderColor: C.warningBorder,
  },
  dayDotToday: {
    borderBottomWidth: 2,
    borderBottomColor: C.cyan,
  },
  dayDotText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.white20,
  },
  dayDotTextOn: {
    color: C.warning,
  },
});

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
  onPlaylistToggleActive,
  togglingId,
  defaultExpanded = false,
}: {
  tvData: TvGroup;
  tvId: string;
  onPlaylistPress: (p: PlaylistItem) => void;
  onPlaylistDelete: (id: string) => void;
  onPlaylistToggleActive: (p: PlaylistItem) => void;
  /** Playlist dont la bascule est en cours, pour n'en verrouiller qu'une. */
  togglingId: string | null;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Le chevron doit partir dans la position correspondante, sinon il pointe
  // vers le bas au-dessus d'une section déjà ouverte.
  const anim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

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
  // Replié, la section ne montre qu'un aperçu. Le filtre ne retenait que le
  // statut « active » — or une playlist programmée porte désormais le statut
  // « scheduled », donc l'aperçu était vide pour tout écran dont les playlists
  // sont toutes programmées. On retient la playlist en cours de diffusion, à
  // défaut une programmée, à défaut la première : jamais rien.
  const preview =
    tvData.playlists.find((p) => p.status === "active") ??
    tvData.playlists.find((p) => p.status === "scheduled") ??
    tvData.playlists[0];

  const toShow = expanded ? tvData.playlists : preview ? [preview] : [];

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
              key={p.rowKey}
              playlist={p}
              onPress={() => onPlaylistPress(p)}
              onDelete={() => onPlaylistDelete(p.id)}
              onToggleActive={() => onPlaylistToggleActive(p)}
              isToggling={togglingId === p.rowKey}
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
  /** Playlist dont l'activation est en cours : une seule bascule à la fois. */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const headerY = useRef(new Animated.Value(-20)).current;
  const headerO = useRef(new Animated.Value(0)).current;

  // L'animation d'en-tête reste au montage : la rejouer à chaque retour sur
  // l'écran serait inutilement bavard.
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(headerO, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /**
   * Vrai dès le premier chargement réussi. Sert à distinguer l'ouverture de
   * l'écran — où le voile de chargement est légitime — d'un simple retour, où
   * il ne ferait que faire clignoter la page.
   */
  const hasLoadedRef = useRef(false);

  const loadPlaylists = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const fetch = await myPlaylists();

      // Une entrée par couple (playlist, écran).
      //
      // Le regroupement ne lisait que `televisions[0]` : une playlist assignée
      // à plusieurs écrans n'apparaissait que sous l'un d'eux, et il suffisait
      // que cette première ligne soit inexploitable pour que la playlist bascule
      // dans « Non assignée » alors qu'elle est bien assignée ailleurs. Les
      // lignes sans écran réel sont écartées — la relation est optionnelle en
      // base (`PlaylistTelevision.televisionId` est nullable) —, exactement
      // comme le fait déjà la page de détail d'une playlist.
      const formatted: PlaylistItem[] = [];

      for (const it of fetch as any[]) {
        // `GET /playlists/me` renvoie déjà les programmations complètes.
        // On met en avant celle qui est active : une playlist peut en porter
        // plusieurs, et une programmation désactivée ne diffuse rien.
        const all: any[] = Array.isArray(it.schedules) ? it.schedules : [];
        const shown = all.find((s) => s.isActive !== false) ?? all[0] ?? null;

        const schedule: PlaylistSchedule | null = shown
          ? {
              startTime: shown.startTime ?? "00:00",
              endTime: shown.endTime ?? "23:59",
              daysOfWeek: Array.isArray(shown.daysOfWeek)
                ? shown.daysOfWeek
                : [],
              isActive: shown.isActive !== false,
              extraCount: Math.max(0, all.length - 1),
            }
          : null;

        const queueItems: any[] = Array.isArray(it.queueItems)
          ? it.queueItems
          : [];

        const assignments: any[] = (
          Array.isArray(it.televisions) ? it.televisions : []
        ).filter((a: any) => a?.televisionId && a?.television);

        const targets =
          assignments.length > 0
            ? assignments.map((a: any) => ({
                televisionId: a.televisionId as string,
                televisionName: (a.television?.name as string) || "Écran",
                // Sans assignation, il n'y a rien à activer : le serveur refuse
                // (« playlist non assignée à cet écran »).
                isEnabled: a.isActive === true,
              }))
            : [
                {
                  televisionId: UNASSIGNED_ID,
                  televisionName: "Non assignée",
                  isEnabled: false,
                },
              ];

        for (const target of targets) {
          // Rang de passage sur CET écran : la file est par télévision, une même
          // playlist peut donc y occuper des rangs différents. Le serveur
          // numérote à partir de 0, l'affichage à partir de 1.
          const inQueue = queueItems.find(
            (q) => q.televisionId === target.televisionId,
          );
          const position = Number.isFinite(Number(inQueue?.position))
            ? Number(inQueue.position) + 1
            : null;

          formatted.push({
            id: it.id,
            // La même playlist pouvant figurer sous plusieurs écrans, son
            // identifiant ne suffit plus comme clé de rendu.
            rowKey: `${it.id}::${target.televisionId}`,
            title: it.name,
            description: it.description,
            mediaCount: it.items.length,
            duration: "",
            televisionId: target.televisionId,
            televisionName: target.televisionName,
            // L'activation sur l'écran passe avant tout le reste : désactivée,
            // la playlist ne diffuse rien, quoi que dise sa programmation. Sans
            // cette priorité, une playlist qu'on venait de désactiver continuait
            // d'afficher « Programmé ».
            //
            // Ensuite seulement : une playlist programmée n'est pas « active »
            // en continu, son statut doit le dire, sinon la carte laisse croire
            // à une diffusion permanente.
            status: !target.isEnabled
              ? "inactive"
              : schedule?.isActive
                ? "scheduled"
                : it.isActive
                  ? "active"
                  : "inactive",
            lastModified: it.updatedAt,
            schedule,
            position,
            isEnabled: target.isEnabled,
          });
        }
      }

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
        // Le rang de diffusion dicte l'ordre d'affichage : afficher des rangs
        // 1, 3, 2 laisserait croire à un bug. Les playlists hors file passent
        // après, de la plus récemment modifiée à la plus ancienne.
        //
        // L'ancien comparateur plaçait la playlist active en tête, mais
        // renvoyait -1 dès que `a` était active — y compris face à une autre
        // active : un comparateur incohérent, dont le résultat dépendait de
        // l'ordre d'entrée.
        grouped[k].playlists.sort((a, b) => {
          if (a.position !== null && b.position !== null) {
            return a.position - b.position;
          }
          if (a.position !== null) return -1;
          if (b.position !== null) return 1;
          return (
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime()
          );
        });

        // Renumérotation continue une fois l'ordre figé. Les positions stockées
        // comportent des trous — retirer une playlist de la file supprime sa
        // ligne sans retasser les suivantes —, ce qui affichait « N°1, N°3 ».
        // La rotation suivant les positions croissantes, un rang dense décrit
        // le même ordre de passage sans laisser croire à une playlist manquante.
        let rank = 0;
        grouped[k].playlists = grouped[k].playlists.map((p) =>
          p.position === null ? p : { ...p, position: ++rank },
        );
      });

      setPlaylistsByTv(grouped);
      hasLoadedRef.current = true;
    } catch (e) {
      console.error(e);
      // Un rechargement de fond ne doit pas interrompre l'utilisateur avec une
      // alerte : les données déjà affichées restent valables.
      if (!silent) {
        Alert.alert("Erreur", "Impossible de charger les playlists");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rechargement à chaque prise de focus, et pas seulement au montage :
  // expo-router garde l'écran monté dans la pile, donc revenir dessus après
  // avoir modifié une playlist affichait encore les anciennes données.
  useFocusEffect(
    useCallback(() => {
      loadPlaylists({ silent: hasLoadedRef.current });
    }, [loadPlaylists]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlaylists({ silent: true });
    setRefreshing(false);
  };

  /**
   * Bascule l'activation d'une playlist sur son écran.
   *
   * Le serveur met la playlist en fin de file (activation) ou l'en retire
   * (désactivation), puis notifie l'écran : rien à émettre côté app. On recharge
   * ensuite en silence, la réponse ne portant ni le nouveau rang ni l'effet sur
   * les autres playlists de la file.
   */
  const handleToggleActive = async (p: PlaylistItem) => {
    if (togglingId) return;
    if (p.televisionId === UNASSIGNED_ID) {
      Alert.alert(
        "Aucun écran",
        "Assignez d'abord cette playlist à un écran pour pouvoir la diffuser.",
      );
      return;
    }

    const next = !p.isEnabled;
    // Par LIGNE et non par playlist : la même playlist peut figurer sous
    // plusieurs écrans, et basculer celle de l'écran A ne doit pas faire tourner
    // l'indicateur de celle de l'écran B.
    setTogglingId(p.rowKey);
    try {
      await setPlaylistActive(p.id, p.televisionId, next);
      await loadPlaylists({ silent: true });
    } catch (e: any) {
      // Le serveur renvoie un message actionnable (404 « playlist non assignée
      // à cet écran »). Le remonter tel quel plutôt qu'un texte générique.
      const message =
        e?.response?.data?.message ??
        (next
          ? "Impossible d'activer cette playlist"
          : "Impossible de désactiver cette playlist");
      Alert.alert("Erreur", String(message));
    } finally {
      setTogglingId(null);
    }
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
  // Le groupe « Non assignée » n'est pas un écran : il ne compte pas ici.
  const totalTvs = Object.keys(playlistsByTv).filter(
    (key) => key !== UNASSIGNED_ID,
  ).length;
  const totalActive = Object.values(playlistsByTv).filter(
    (tv) => tv.activePlaylist,
  ).length;
  // Playlists DISTINCTES : une playlist diffusée sur trois écrans apparaît dans
  // trois sections, mais reste une seule playlist.
  const totalPlaylists = new Set(allPlaylists.map((p) => p.id)).size;

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
              style={[
                s.viewToggleBtn,
                viewMode === "grouped" && s.viewToggleActive,
              ]}
              onPress={() => setViewMode("grouped")}
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={viewMode === "grouped" ? C.accent : C.white40}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.viewToggleBtn,
                viewMode === "list" && s.viewToggleActive,
              ]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={viewMode === "list" ? C.accent : C.white40}
              />
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
                .sort(([keyA, a], [keyB, b]) => {
                  // Le groupe « Non assignée » ferme toujours la marche : il ne
                  // correspond à aucun écran et n'a pas à passer devant eux.
                  if (keyA === UNASSIGNED_ID) return 1;
                  if (keyB === UNASSIGNED_ID) return -1;
                  return (
                    (b.activePlaylist ? 1 : 0) - (a.activePlaylist ? 1 : 0)
                  );
                })
                .map(([tvId, tvData], sectionIndex) => (
                  <TvSection
                    key={tvId}
                    tvId={tvId}
                    tvData={tvData}
                    // Premier écran déplié d'office : replié, une section ne
                    // montre qu'un aperçu, et celui-ci peut être vide. La page
                    // s'ouvrait alors sur une liste d'en-têtes sans contenu.
                    defaultExpanded={sectionIndex === 0}
                    onPlaylistPress={(p) =>
                      router.navigate(`/home/playlists/view/${p.id}`)
                    }
                    onPlaylistDelete={handleDelete}
                    onPlaylistToggleActive={handleToggleActive}
                    togglingId={togglingId}
                  />
                ))
            : allPlaylists.map((p) => {
                const st = STATUS[p.status] ?? STATUS.inactive;
                return (
                  <TouchableOpacity
                    key={p.rowKey}
                    onPress={() =>
                      router.navigate(`/home/playlists/view/${p.id}`)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={s.listRow}>
                      {/* Accent gauche */}
                      <View
                        style={[s.listAccent, { backgroundColor: st.color }]}
                      />

                      {/* Icône statut */}
                      <View
                        style={[
                          s.listIcon,
                          { backgroundColor: st.dim, borderColor: st.border },
                        ]}
                      >
                        <Ionicons
                          name={p.status === "active" ? "play-circle" : "list"}
                          size={16}
                          color={st.color}
                        />
                      </View>

                      {/* Infos */}
                      <View style={{ flex: 1 }}>
                        <Text style={s.listTitle} numberOfLines={1}>
                          {p.title}
                        </Text>
                        <View style={s.listMeta}>
                          {/* Rang de diffusion. En ligne dans la méta plutôt
                              qu'en pastille : la rangée est déjà saturée à
                              droite, un bloc de plus rognait le titre. */}
                          {p.position !== null && (
                            <>
                              <Text style={s.listRankText}>N°{p.position}</Text>
                              <View
                                style={[
                                  s.listDot,
                                  { backgroundColor: C.border },
                                ]}
                              />
                            </>
                          )}
                          <Ionicons
                            name="tv-outline"
                            size={11}
                            color={C.white40}
                          />
                          <Text
                            style={[s.listMetaText, { flexShrink: 1 }]}
                            numberOfLines={1}
                          >
                            {p.televisionName}
                          </Text>
                          <View
                            style={[s.listDot, { backgroundColor: C.border }]}
                          />
                          <Ionicons
                            name="film-outline"
                            size={11}
                            color={C.white40}
                          />
                          <Text style={s.listMetaText}>
                            {p.mediaCount} média{p.mediaCount > 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>

                      {/* Badge statut */}
                      <View
                        style={[
                          s.listBadge,
                          { backgroundColor: st.dim, borderColor: st.border },
                        ]}
                      >
                        <Text style={[s.listBadgeText, { color: st.color }]}>
                          {st.label}
                        </Text>
                      </View>

                      {/* Activer / désactiver */}
                      {p.televisionId !== UNASSIGNED_ID && (
                        <TouchableOpacity
                          onPress={() => handleToggleActive(p)}
                          disabled={togglingId === p.rowKey}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="switch"
                          accessibilityState={{ checked: p.isEnabled }}
                          accessibilityLabel={
                            p.isEnabled
                              ? "Désactiver la diffusion"
                              : "Activer la diffusion"
                          }
                          style={[
                            s.listActionBtn,
                            p.isEnabled
                              ? {
                                  backgroundColor: C.successDim,
                                  borderColor: C.successBorder,
                                }
                              : {
                                  backgroundColor: C.white05,
                                  borderColor: C.border,
                                },
                            togglingId === p.rowKey && { opacity: 0.45 },
                          ]}
                        >
                          {togglingId === p.rowKey ? (
                            <ActivityIndicator
                              size="small"
                              color={p.isEnabled ? C.success : C.white40}
                            />
                          ) : (
                            <Ionicons
                              name="power"
                              size={14}
                              color={p.isEnabled ? C.success : C.white40}
                            />
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Supprimer */}
                      <TouchableOpacity
                        onPress={() => handleDelete(p.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={s.listDeleteBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color={C.error}
                        />
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
  // Rang de diffusion. `marginTop` cale la pastille (22 px) sur le centre de
  // l'icône de statut (34 px, décalée de 1) : (34 - 22) / 2 + 1.
  rankBadge: {
    minWidth: 30,
    height: 22,
    borderRadius: 7,
    paddingHorizontal: 5,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 7,
  },
  rankText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.cyan,
    // Les rangs s'alignent d'une carte à l'autre, y compris au-delà de 9
    fontVariant: ["tabular-nums"],
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
  // Grappe d'actions rapides en tête de carte, alignée sur l'icône de statut.
  cardActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  listRankText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.cyan,
    fontVariant: ["tabular-nums"],
  },
  listDot: { width: 3, height: 3, borderRadius: 2 },
  listBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  listBadgeText: { fontSize: 10, fontWeight: "700" },
  listActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
