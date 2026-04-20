import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/scripts/AuthContext";
import api from "@/scripts/fetch.api";
import { dissociatedUser } from "@/requests/tv.requests";
import { socket } from "@/scripts/socket.io";

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

// ─── Types ────────────────────────────────────────────────────────────────────
interface Television {
  id: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "PLAYING";
  lastSeen: string;
  updatedAt: string;
  playlists?: any[];
  ipAddress: string;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  accent: string;
  accentDim: string;
  accentBorder: string;
  action: () => void;
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ONLINE: {
    label: "En ligne",
    color: C.success,
    dim: C.successDim,
    border: C.successBorder,
    icon: "radio-button-on",
  },
  PLAYING: {
    label: "En lecture",
    color: C.warning,
    dim: C.warningDim,
    border: C.warningBorder,
    icon: "play-circle",
  },
  OFFLINE: {
    label: "Hors ligne",
    color: C.error,
    dim: C.errorDim,
    border: C.errorBorder,
    icon: "radio-button-off",
  },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  value: number;
  label: string;
  accent: string;
  icon: string;
}> = ({ value, label, accent, icon }) => (
  <LinearGradient
    colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
    style={s.statCard}
  >
    <View
      style={[
        s.statIconWrap,
        { backgroundColor: accent + "22", borderColor: accent + "55" },
      ]}
    >
      <Ionicons name={icon as any} size={16} color={accent} />
    </View>
    <Text style={[s.statValue, { color: accent }]}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </LinearGradient>
);

// ─── Quick Action Card ────────────────────────────────────────────────────────
const QuickActionCard: React.FC<{ action: QuickAction }> = ({ action }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      onPress={action.action}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      style={{ width: "48%", marginBottom: 12 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
          style={[s.qaCard, { borderColor: action.accentBorder }]}
        >
          <LinearGradient
            colors={[action.accentDim, "rgba(0,0,0,0)"]}
            style={[s.qaIconWrap, { borderColor: action.accentBorder }]}
          >
            <Ionicons
              name={action.icon as any}
              size={22}
              color={action.accent}
            />
          </LinearGradient>
          <Text style={s.qaTitle}>{action.title}</Text>
          <Ionicons
            name="chevron-forward-outline"
            size={13}
            color={C.white40}
            style={{ marginTop: 4 }}
          />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── TV Card ──────────────────────────────────────────────────────────────────
const TVCard: React.FC<{
  tv: Television;
  onPress: () => void;
  onLongPress: () => void;
  onPowerToggle: () => void;
}> = ({ tv, onPress, onLongPress, onPowerToggle }) => {
  const cfg = STATUS_CONFIG[tv.status];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const timeStr = tv.updatedAt
    ? new Date(tv.updatedAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
          style={[s.tvCard, { borderColor: cfg.border }]}
        >
          {/* Top bar */}
          <View style={[s.tvTopBar, { backgroundColor: cfg.color }]} />

          <View style={s.tvBody}>
            {/* Row 1: icon + name + badge */}
            <View style={s.tvRow}>
              <View
                style={[
                  s.tvIconWrap,
                  { backgroundColor: cfg.dim, borderColor: cfg.border },
                ]}
              >
                <Ionicons
                  name={tv.status === "OFFLINE" ? "tv-outline" : "tv"}
                  size={20}
                  color={cfg.color}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.tvName}>{tv.name}</Text>
                {tv.ipAddress ? (
                  <View style={s.tvIPRow}>
                    <Ionicons name="wifi-outline" size={11} color={C.white40} />
                    <Text style={s.tvIP}>{tv.ipAddress}</Text>
                  </View>
                ) : null}
              </View>
              <View
                style={[
                  s.statusBadge,
                  { backgroundColor: cfg.dim, borderColor: cfg.border },
                ]}
              >
                <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
                <Text style={[s.statusText, { color: cfg.color }]}>
                  {cfg.label}
                </Text>
              </View>
            </View>

            {/* Playlist */}
            {tv.playlists && tv.playlists.length > 0 && (
              <View
                style={[
                  s.playlistRow,
                  { backgroundColor: C.accentDim, borderColor: C.accentBorder },
                ]}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={14}
                  color={C.accent}
                />
                <Text style={s.playlistText} numberOfLines={1}>
                  {tv.playlists[0].playlist.name}
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={s.tvFooter}>
              <Ionicons name="time-outline" size={12} color={C.white40} />
              <Text style={s.lastSeen}>Dernière activité · {timeStr}</Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onPowerToggle();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  s.powerBtn,
                  {
                    backgroundColor:
                      tv.status === "OFFLINE" ? C.successDim : C.errorDim,
                    borderColor:
                      tv.status === "OFFLINE" ? C.successBorder : C.errorBorder,
                  },
                ]}
              >
                <Ionicons
                  name="power"
                  size={14}
                  color={tv.status === "OFFLINE" ? C.success : C.error}
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const { user, subscription, getSubscription } = useAuth();
  const [televisions, setTelevisions] = useState<Television[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Entrance animation
  const headerOp = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const contentOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOp, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(headerY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentOp, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Quick Actions ──
  const abonnmentRender = () => {
    if (subscription?.find((it: any) => it.plan.planType === "OPTION"))
      return router.navigate("/updateOptionSubscription");
    if (subscription?.length > 0)
      return router.navigate("/OptionPaymentScreen");
    return router.navigate("/PaymentScreen");
  };

  const quickActions: QuickAction[] = [
    {
      id: "1",
      title: subscription?.length > 0 ? "Augmenter ma capacité" : "M'abonner",
      icon: "card-outline",
      accent: C.purple,
      accentDim: C.purpleDim,
      accentBorder: C.purpleBorder,
      action: abonnmentRender,
    },
    {
      id: "2",
      title: "Mes playlists",
      icon: "list-outline",
      accent: C.accent,
      accentDim: C.accentDim,
      accentBorder: C.accentBorder,
      action: () => router.navigate("/home/playlists"),
    },
    {
      id: "3",
      title: "Gérer mes TVs",
      icon: "settings-outline",
      accent: C.success,
      accentDim: C.successDim,
      accentBorder: C.successBorder,
      action: () => router.navigate("/home/tv/MyTVScreen"),
    },
    ...(subscription?.length > 0
      ? [
          {
            id: "4",
            title: "Mon abonnement",
            icon: "ribbon-outline",
            accent: C.cyan,
            accentDim: C.cyanDim,
            accentBorder: C.cyanBorder,
            action: () => router.navigate("/home/profile/subscription"),
          },
        ]
      : []),
  ];

  // ── Data ──
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/televisions/me");
      const tvs: Television[] = res.data;
      setTelevisions(tvs);

      // Rejoindre la room de chaque TV pour recevoir les mises à jour en temps réel
      tvs.forEach((tv) => {
        socket.emit("join-room", { roomName: tv.id });
      });
    } catch {
      Alert.alert("Erreur", "Impossible de charger les données");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    getSubscription();
  };

  // ── Socket : mise à jour du statut en temps réel ──
  useEffect(() => {
    const handleStatusUpdate = (data: {
      tvId: string;
      status: Television["status"];
    }) => {
      setTelevisions((prev) =>
        prev.map((tv) =>
          tv.id === data.tvId ? { ...tv, status: data.status } : tv,
        ),
      );
    };

    socket.on("tv-status-update", handleStatusUpdate);
    return () => {
      socket.off("tv-status-update", handleStatusUpdate);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, []),
  );

  // ── TV handlers ──
  const handleTVPress = (tv: Television) => {
    // if (tv.status === "OFFLINE") {
    //   Alert.alert("TV hors ligne", `${tv.name} n'est pas connectée.`, [
    //     { text: "OK" },
    //   ]);
    //   return;
    // }
    router.push(
      `/home/tv/${tv.id}?item=${encodeURIComponent(JSON.stringify(tv))}`,
    );
  };

  const handleTVLongPress = (tv: Television) => {
    Alert.alert(tv.name, "Que voulez-vous faire ?", [
      {
        text: "Supprimer",
        onPress: () => confirmDeleteTV(tv),
        style: "destructive",
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const confirmDeleteTV = (tv: Television) => {
    Alert.alert(
      "Supprimer",
      `Êtes-vous sûr de vouloir supprimer "${tv.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteTV(tv.id),
        },
      ],
    );
  };

  const deleteTV = async (tvId: string) => {
    try {
      const res = await dissociatedUser(tvId);
      if (res.success) {
        setTelevisions((prev) => prev.filter((tv) => tv.id !== tvId));
        Alert.alert("✅", "Télévision supprimée");
      }
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  };

  const handlePowerToggle = (tv: Television) => {
    const action = tv.status === "OFFLINE" ? "ON" : "OFF";
    const label = action === "ON" ? "allumer" : "éteindre";
    Alert.alert(
      `${action === "ON" ? "Allumer" : "Éteindre"} la TV`,
      `Voulez-vous ${label} "${tv.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: action === "ON" ? "Allumer" : "Éteindre",
          onPress: () => socket.emit("tv-power", { tvId: tv.id, action }),
        },
      ],
    );
  };

  const addTV = () => {
    if (!subscription || subscription.length === 0) {
      return Alert.alert(
        "Abonnement requis",
        "Vous n'avez pas d'abonnement actif.",
        [
          {
            text: "Voir les offres",
            onPress: () => router.navigate("/PaymentScreen"),
          },
        ],
      );
    }
    router.navigate("/home/tv/addTV");
  };

  // ── Subscription display ──
  const mainSub = subscription?.find((it: any) => it.plan.planType === "MAIN");
  const usedStr = mainSub
    ? `${mainSub.usedScreens}/${mainSub.currentMaxScreens}`
    : null;
  const onlineCount = televisions.filter((t) => t.status !== "OFFLINE").length;
  const playingCount = televisions.filter((t) => t.status === "PLAYING").length;

  // ── Render ──
  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── HEADER ── */}
        <Animated.View
          style={{ opacity: headerOp, transform: [{ translateY: headerY }] }}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.02)"]}
            style={s.header}
          >
            {/* Top row */}
            <View style={s.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.greeting}>Bonjour,</Text>
                <Text style={s.userName}>
                  {user?.firstName} {user?.lastName} 👋
                </Text>
              </View>
              <TouchableOpacity
                style={s.avatarBtn}
                onPress={() => router.navigate("/home/profile")}
              >
                <LinearGradient
                  colors={[C.accent, C.purple]}
                  style={s.avatarGrad}
                >
                  <Text style={s.avatarText}>
                    {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
                  </Text>
                </LinearGradient>
                <View style={s.avatarOnline} />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              <StatCard
                value={televisions.length}
                label="Télévisions"
                accent={C.accent}
                icon="tv-outline"
              />
              <StatCard
                value={onlineCount}
                label="En ligne"
                accent={C.success}
                icon="radio-button-on"
              />
              {/* <StatCard
                value={playingCount}
                label="En lecture"
                accent={C.warning}
                icon="play-circle-outline"
              /> */}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── SCROLL ── */}
        <Animated.View style={{ flex: 1, opacity: contentOp }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.cyan}
                colors={[C.cyan]}
              />
            }
          >
            {/* Quick Actions */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Actions rapides</Text>
              </View>
              <View style={s.qaGrid}>
                {quickActions.map((a) => (
                  <QuickActionCard key={a.id} action={a} />
                ))}
              </View>
            </View>

            {/* Televisions */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>Mes télévisions</Text>
                  {usedStr && (
                    <Text style={s.sectionSub}>{usedStr} écrans utilisés</Text>
                  )}
                </View>
                <TouchableOpacity style={s.addBtn} onPress={addTV}>
                  <Ionicons name="add" size={16} color={C.success} />
                  <Text style={s.addBtnText}>Ajouter</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={s.stateBox}>
                  <View style={s.loadingOrb}>
                    <Ionicons name="tv-outline" size={28} color={C.cyan} />
                  </View>
                  <Text style={s.stateText}>Chargement…</Text>
                </View>
              ) : televisions.length === 0 ? (
                <LinearGradient
                  colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
                  style={s.emptyCard}
                >
                  <LinearGradient
                    colors={[C.cyanDim, C.white05]}
                    style={s.emptyIcon}
                  >
                    <Ionicons name="tv-outline" size={36} color={C.cyan} />
                  </LinearGradient>
                  <Text style={s.emptyTitle}>Aucune télévision</Text>
                  <Text style={s.emptySub}>Commencez par connecter une TV</Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={addTV}>
                    <LinearGradient
                      colors={[C.cyan, C.accent]}
                      style={s.emptyBtnGrad}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={C.white}
                      />
                      <Text style={s.emptyBtnText}>Ajouter une télévision</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <View style={{ gap: 12 }}>
                  {televisions.map((tv) => (
                    <TVCard
                      key={tv.id}
                      tv={tv}
                      onPress={() => handleTVPress(tv)}
                      onLongPress={() => handleTVLongPress(tv)}
                      onPowerToggle={() => handlePowerToggle(tv)}
                    />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  greeting: { fontSize: 13, color: C.white40, letterSpacing: 0.3 },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: C.white,
    marginTop: 3,
    letterSpacing: -0.3,
  },
  avatarBtn: { position: "relative" },
  avatarGrad: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: C.white },
  avatarOnline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.bgDeep,
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 10,
    color: C.white40,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Scroll
  scroll: { paddingTop: 4, paddingBottom: 50 },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.2,
  },
  sectionSub: { fontSize: 12, color: C.white40, marginTop: 3 },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: C.successBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: { fontSize: 13, color: C.success, fontWeight: "700" },

  // Quick Actions
  qaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  qaCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    backgroundColor: "transparent",
  },
  qaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  qaTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.white80,
    lineHeight: 18,
  },

  // TV Card
  tvCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  tvTopBar: { height: 3, width: "100%", opacity: 0.8 },
  tvBody: { padding: 16, gap: 10 },
  tvRow: { flexDirection: "row", alignItems: "center" },
  tvIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tvName: { fontSize: 15, fontWeight: "700", color: C.white },
  tvIPRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  tvIP: { fontSize: 12, color: C.white40 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "700" },
  playlistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playlistText: { flex: 1, fontSize: 13, color: C.white60 },
  tvFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  lastSeen: { fontSize: 12, color: C.white40 },
  powerBtn: {
    marginLeft: "auto" as any,
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  // States
  stateBox: { alignItems: "center", paddingVertical: 50, gap: 14 },
  loadingOrb: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  stateText: { fontSize: 15, color: C.white40 },

  // Empty
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cyanBorder,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.3,
  },
  emptySub: { fontSize: 14, color: C.white40, textAlign: "center" },
  emptyBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  emptyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: C.white },
});

export default HomeScreen;
