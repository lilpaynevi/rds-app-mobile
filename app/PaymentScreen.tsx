// components/PaymentScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { createSession } from "@/requests/stripe.requests";
import { useAuth } from "@/scripts/AuthContext";

const { width } = Dimensions.get("window");

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bgDeep: "#0A0E27",
  bgMid: "#0F1642",
  bgCard: "rgba(255,255,255,0.04)",
  bgCardHover: "rgba(255,255,255,0.08)",
  accent: "#4F8EF7",
  accentDark: "#2D6BE4",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.30)",
  accentGlow: "rgba(79,142,247,0.20)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.10)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.12)",
  successBorder: "rgba(0,230,118,0.30)",
  gold: "#FFD54F",
  goldDim: "rgba(255,213,79,0.12)",
  goldBorder: "rgba(255,213,79,0.30)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
};

// ─── Plans ───────────────────────────────────────────────────────────────────
const PLANS = {
  monthly: {
    id: "78d0a01f-6c05-46bb-a665-bd851868f27e",
    key: "monthly",
    label: "Mensuel",
    name: "Abonnement Mensuel",
    description: "Flexibilité maximale, sans engagement long terme",
    priceId: "price_1S7OuqAQxGgWdn2vTmQFwkQs",
    price: 30,
    period: "HT / mois",
    billedText: "Facturation mensuelle",
    totalAnnual: 360,
    popular: false,
    savings: null,
    monthlyEquivalent: 30,
  },
  annual: {
    id: "dadc97fe-4972-424d-b780-67431a77a8c8",
    key: "annual",
    label: "Annuel",
    name: "Abonnement Annuel",
    description: "1 mois offert — la solution préférée de nos clients",
    priceId: "price_1S7dNCAQxGgWdn2vUVFHeO6S",
    price: 330,
    period: "HT / an",
    billedText: "Facturation annuelle",
    totalAnnual: 330,
    popular: true,
    savings: "1 mois offert",
    monthlyEquivalent: 27.5,
  },
};

const FEATURES = [
  { icon: "tv-outline", text: "Accès illimité à 5 écrans simultanés" },
  { icon: "cloud-outline", text: "Synchronisation cloud en temps réel" },
  { icon: "headset-outline", text: "Support technique dédié 24/7" },
  // { icon: "analytics-outline", text: "Tableau de bord analytics avancé" },
];

// ─── Hook d'animation d'entrée ───────────────────────────────────────────────
const useEntrance = (delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
};

// ─── PlanTab ─────────────────────────────────────────────────────────────────
const PlanTab = ({
  plan,
  selected,
  onPress,
}: {
  plan: typeof PLANS.monthly;
  selected: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={press} activeOpacity={1} style={{ flex: 1 }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={
            selected
              ? [C.accentDim, "rgba(79,142,247,0.06)"]
              : [C.white05, C.white05]
          }
          style={[pt.card, selected && pt.cardSelected]}
        >
          {/* Badge populaire */}
          {plan.popular && (
            <View style={pt.hotBadge}>
              <Text style={pt.hotBadgeText}>🔥 POPULAIRE</Text>
            </View>
          )}

          <Text style={[pt.label, selected && pt.labelSelected]}>
            {plan.label}
          </Text>

          <Text style={[pt.price, selected && pt.priceSelected]}>
            {plan.price}€
          </Text>
          <Text style={pt.sub}>{plan.key === "annual" ? "/an" : "/mois"}</Text>

          {plan.key === "annual" && (
            <View style={pt.savingsPill}>
              <Text style={pt.savingsText}>
                −{PLANS.monthly.totalAnnual - plan.price}€/an
              </Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const pt = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 2,
    paddingTop: 22,
  },
  cardSelected: {
    borderColor: C.accent,
  },
  hotBadge: {
    position: "absolute",
    top: -10,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  hotBadgeInner: {
    backgroundColor: "#FF5252",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hotBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.5,
    backgroundColor: "#FF5252",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  label: { fontSize: 13, fontWeight: "600", color: C.white60 },
  labelSelected: { color: C.accent, fontWeight: "700" },
  price: { fontSize: 28, fontWeight: "800", color: C.white, marginTop: 4 },
  priceSelected: { color: C.accent },
  sub: { fontSize: 12, color: C.white40 },
  savingsPill: {
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: C.successBorder,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  savingsText: { fontSize: 11, fontWeight: "700", color: C.success },
});

// ─── FeatureRow ──────────────────────────────────────────────────────────────
const FeatureRow = ({ icon, text }: { icon: string; text: string }) => (
  <View style={fr.row}>
    <View style={fr.iconWrap}>
      <Ionicons name={icon as any} size={16} color={C.accent} />
    </View>
    <Text style={fr.text}>{text}</Text>
    <Ionicons name="checkmark-circle" size={16} color={C.success} />
  </View>
);

const fr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  text: { flex: 1, fontSize: 14, color: C.white80, fontWeight: "500" },
});

// ─── Main ────────────────────────────────────────────────────────────────────
const PaymentScreen = () => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    "annual",
  );
  const { user } = useAuth();

  const plan = PLANS[selectedPlan];

  const headerAnim = useEntrance(0);
  const tabsAnim = useEntrance(80);
  const cardAnim = useEntrance(160);
  const buttonAnim = useEntrance(240);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      await createSession(plan.priceId, plan.id, {
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
      });
    } catch {
      Alert.alert("Erreur", "Erreur lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <Animated.View style={[s.header, headerAnim]}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back-outline" size={18} color={C.white60} />
              <Text style={s.backBtnText}>Retour</Text>
            </TouchableOpacity>

            {/* Orb décoratif */}
            <View style={s.orb} />

            <View style={s.headerContent}>
              <LinearGradient
                colors={[C.accent, C.accentDark]}
                style={s.headerIcon}
              >
                <Ionicons name="rocket-outline" size={28} color={C.white} />
              </LinearGradient>

              <Text style={s.title}>RDS Connect</Text>
              <Text style={s.titleAccent}>Premium</Text>
              <Text style={s.subtitle}>
                Débloquez toutes les fonctionnalités{"\n"}pour votre entreprise
              </Text>

              {/* Trust badges */}
              <View style={s.trustRow}>
                {[
                  { icon: "shield-checkmark-outline", label: "SSL sécurisé" },
                  { icon: "flash-outline", label: "Activation immédiate" },
                  { icon: "refresh-outline", label: "Annulation libre" },
                ].map(({ icon, label }) => (
                  <View key={label} style={s.trustBadge}>
                    <Ionicons name={icon as any} size={12} color={C.cyan} />
                    <Text style={s.trustLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* ── Plan Tabs ────────────────────────────────────────────────── */}
          <Animated.View style={[s.section, tabsAnim]}>
            <Text style={s.sectionLabel}>Choisissez votre plan</Text>
            <View style={s.tabsRow}>
              {(Object.values(PLANS) as (typeof PLANS.monthly)[]).map((p) => (
                <PlanTab
                  key={p.key}
                  plan={p}
                  selected={selectedPlan === p.key}
                  onPress={() => setSelectedPlan(p.key as "monthly" | "annual")}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Plan Card ────────────────────────────────────────────────── */}
          <Animated.View style={[s.section, cardAnim]}>
            <LinearGradient
              colors={["rgba(79,142,247,0.10)", "rgba(79,142,247,0.03)"]}
              style={s.planCard}
            >
              {/* Card Header */}
              <View style={s.planCardHeader}>
                <View>
                  <Text style={s.planName}>{plan.name}</Text>
                  <Text style={s.planDesc}>{plan.description}</Text>
                </View>
                {plan.popular && (
                  <View style={s.bestPill}>
                    <Text style={s.bestPillText}>✦ TOP</Text>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={s.divider} />

              {/* Prix */}
              <View style={s.priceBlock}>
                <View style={s.priceRow}>
                  <Text style={s.priceCurrency}>€</Text>
                  <Text style={s.priceAmount}>{plan.price}</Text>
                  <View style={s.pricePeriodBlock}>
                    <Text style={s.pricePeriod}>{plan.period}</Text>
                    <Text style={s.priceBilled}>{plan.billedText}</Text>
                  </View>
                </View>

                {selectedPlan === "annual" && (
                  <View style={s.annualSavingsRow}>
                    <View style={s.annualSavingsPill}>
                      <Ionicons
                        name="gift-outline"
                        size={13}
                        color={C.success}
                      />
                      <Text style={s.annualSavingsText}>
                        Soit {plan.monthlyEquivalent}€/mois · Économisez{" "}
                        {PLANS.monthly.totalAnnual - plan.price}€
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={s.divider} />

              {/* Features */}
              <Text style={s.featuresTitle}>Ce qui est inclus</Text>
              {FEATURES.map((f) => (
                <FeatureRow key={f.icon} icon={f.icon} text={f.text} />
              ))}
              {selectedPlan === "annual" && (
                <FeatureRow
                  icon="gift-outline"
                  text="1 mois gratuit inclus dans l'offre annuelle"
                />
              )}

              {/* Divider */}
              <View style={s.divider} />

              {/* Garantie */}
              <View style={s.guaranteeRow}>
                <View style={s.guaranteeIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={C.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.guaranteeTitle}>Satisfait ou remboursé</Text>
                  <Text style={s.guaranteeSub}>
                    30 jours — sans question posée
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── CTA Button ───────────────────────────────────────────────── */}
          <Animated.View style={[s.section, buttonAnim]}>
            <TouchableOpacity
              onPress={handleCheckout}
              disabled={loading}
              activeOpacity={0.85}
              style={s.ctaWrapper}
            >
              <LinearGradient
                colors={
                  loading ? [C.white10, C.white10] : [C.accent, C.accentDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.ctaGradient}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color={C.white} size="small" />
                    <Text style={s.ctaText}>Traitement en cours...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={C.white}
                    />
                    <View style={s.ctaTextBlock}>
                      <Text style={s.ctaText}>
                        S'abonner — {plan.price}€ {plan.period}
                      </Text>
                      <Text style={s.ctaSub}>Paiement sécurisé via Stripe</Text>
                    </View>
                    <Ionicons
                      name="arrow-forward-outline"
                      size={18}
                      color="rgba(255,255,255,0.6)"
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Stripe logos / info */}
            <View style={s.stripeInfo}>
              <Ionicons name="card-outline" size={14} color={C.white40} />
              <Text style={s.stripeInfoText}>
                Visa · Mastercard · CB · SEPA — chiffrement TLS 1.3
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    position: "relative",
  },
  orb: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(79,142,247,0.06)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
  },
  backBtnText: { fontSize: 14, color: C.white60, fontWeight: "500" },
  headerContent: { alignItems: "center", gap: 8 },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: C.white,
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontSize: 30,
    fontWeight: "800",
    color: C.accent,
    letterSpacing: -0.5,
    marginTop: -8,
  },
  subtitle: {
    fontSize: 14,
    color: C.white40,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 4,
  },
  trustRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.cyanDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.20)",
  },
  trustLabel: { fontSize: 11, color: C.cyan, fontWeight: "600" },

  // ── Section ──
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.white40,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  tabsRow: { flexDirection: "row", gap: 12 },

  // ── Plan Card ──
  planCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: C.accentBorder,
    gap: 0,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.white,
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 13,
    color: C.white40,
    lineHeight: 18,
    maxWidth: width * 0.55,
  },
  bestPill: {
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.gold,
    letterSpacing: 0.5,
  },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 18 },

  // Prix
  priceBlock: { gap: 10 },
  priceRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  priceCurrency: {
    fontSize: 22,
    fontWeight: "700",
    color: C.accent,
    marginTop: 8,
  },
  priceAmount: {
    fontSize: 52,
    fontWeight: "900",
    color: C.accent,
    lineHeight: 58,
  },
  pricePeriodBlock: { marginTop: 12, marginLeft: 6 },
  pricePeriod: { fontSize: 16, fontWeight: "600", color: C.white60 },
  priceBilled: { fontSize: 12, color: C.white40 },
  annualSavingsRow: { alignItems: "flex-start" },
  annualSavingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: C.successBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  annualSavingsText: { fontSize: 13, color: C.success, fontWeight: "600" },

  // Features
  featuresTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.white60,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  // Garantie
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  guaranteeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  guaranteeTitle: { fontSize: 14, fontWeight: "700", color: C.white80 },
  guaranteeSub: { fontSize: 12, color: C.white40, marginTop: 2 },

  // ── CTA ──
  ctaWrapper: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  ctaTextBlock: { flex: 1, alignItems: "center" },
  ctaText: { fontSize: 16, fontWeight: "700", color: C.white },
  ctaSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },

  stripeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  stripeInfoText: { fontSize: 12, color: C.white40, textAlign: "center" },
});

export default PaymentScreen;
