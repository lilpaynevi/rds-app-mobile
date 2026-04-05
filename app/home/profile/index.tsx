import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/scripts/AuthContext";
import api from "@/scripts/fetch.api";
import { router } from "expo-router";

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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfileScreen() {
  const { updateNewInfoUser, user, logout, subscription } = useAuth();
  const [_userData, setUserData] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [userInputCode, setUserInputCode] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (user) fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(!user);
      const res = await api.get("/auth/me");
      setUserData(res.data);
      if (user) {
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setEmail(user.email);
        setCompany(user.company);
        setAvatar((user as any)?.avatar || "");
      }
    } catch (error) {
      console.error("Erreur fetchUserProfile:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        ...(avatar.trim() && { avatar: avatar.trim() }),
      };
      if (!updateData.firstName || !updateData.lastName || !updateData.email) {
        Alert.alert("Erreur", "Tous les champs sont obligatoires");
        return;
      }
      const response = await api.patch("/users/" + user?.id, {
        firstName,
        lastName,
        email,
        company,
      });
      if (response) {
        setUserData(response.data);
        setIsEditing(false);
        updateNewInfoUser({ ...user, firstName, lastName, email, company });
        Alert.alert("Succès", "Profil mis à jour avec succès");
      }
    } catch (error) {
      console.error("Erreur handleSaveProfile:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setCompany(user.company);
    }
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    router.navigate("/home/profile/subscription/forgot-password");
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: () => logout() },
    ]);
  };

  const generateConfirmationCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++)
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleOpenDeleteModal = () => {
    setConfirmationCode(generateConfirmationCode());
    setDeleteStep(1);
    setUserInputCode("");
    setDeleteReason("");
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setUserInputCode("");
    setDeleteReason("");
    setConfirmationCode("");
  };

  const handleNextStep = () => {
    if (deleteStep === 1) {
      Alert.alert(
        "Confirmation",
        "Vous comprenez que cette action est irréversible ?",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Continuer", style: "destructive", onPress: () => setDeleteStep(2) },
        ]
      );
    } else if (deleteStep === 2) {
      if (userInputCode.toUpperCase() === confirmationCode) {
        setDeleteStep(3);
      } else {
        Alert.alert("Erreur", "Le code saisi ne correspond pas");
      }
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      if (userInputCode.toUpperCase() !== confirmationCode) {
        Alert.alert("Erreur", "Le code de confirmation est incorrect");
        return;
      }
      const response = await api.delete(`/users/${user?.id}`, {
        data: { reason: deleteReason, confirmationCode: userInputCode },
      });
      if (response) {
        Alert.alert(
          "Compte supprimé",
          "Votre compte a été supprimé avec succès. Nous sommes désolés de vous voir partir.",
          [{ text: "OK", onPress: () => { handleCloseDeleteModal(); logout(); } }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error?.response?.data?.message || "Impossible de supprimer le compte."
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN": return "Administrateur";
      case "MODERATOR": return "Modérateur";
      default: return "Utilisateur";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN": return C.purple;
      case "MODERATOR": return C.accent;
      default: return C.success;
    }
  };

  const getRoleDim = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN": return C.purpleDim;
      case "MODERATOR": return C.accentDim;
      default: return C.successDim;
    }
  };

  const getRoleBorder = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN": return C.purpleBorder;
      case "MODERATOR": return C.accentBorder;
      default: return C.successBorder;
    }
  };

  // ── Delete Modal ──
  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent
      animationType="slide"
      onRequestClose={handleCloseDeleteModal}
    >
      <BlurView intensity={40} tint="dark" style={s.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ maxHeight: "90%", width: "100%" }}
        >
          <View style={s.modalSheet}>
            {/* Handle */}
            <View style={s.modalHandle} />

            {/* Header */}
            <View style={s.modalHeader}>
              <View style={[s.modalIconWrap, { backgroundColor: C.errorDim, borderColor: C.errorBorder }]}>
                <Ionicons name="warning-outline" size={22} color={C.error} />
              </View>
              <Text style={s.modalTitle}>Supprimer mon compte</Text>
              <TouchableOpacity
                style={s.modalCloseBtn}
                onPress={handleCloseDeleteModal}
                disabled={isDeletingAccount}
              >
                <Ionicons name="close" size={18} color={C.white60} />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              {/* Étape 1 */}
              {deleteStep === 1 && (
                <>
                  <Text style={[s.modalStepTitle, { color: C.error }]}>
                    ⚠️ Action irréversible
                  </Text>
                  <Text style={s.modalStepText}>
                    La suppression de votre compte entraînera :
                  </Text>
                  <View style={[s.warningList, { backgroundColor: C.errorDim, borderColor: C.errorBorder }]}>
                    {[
                      "Perte définitive de toutes vos données",
                      "Suppression de votre historique complet",
                      "Annulation de tous vos abonnements actifs",
                      "Impossibilité de récupérer votre compte",
                    ].map((item, i) => (
                      <View key={i} style={s.warningItem}>
                        <Ionicons name="close-circle" size={18} color={C.error} />
                        <Text style={[s.warningItemText, { color: C.white60 }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.modalActions}>
                    <TouchableOpacity
                      style={[s.modalBtn, { backgroundColor: C.white10, borderColor: C.border }]}
                      onPress={handleCloseDeleteModal}
                    >
                      <Text style={[s.modalBtnText, { color: C.white60 }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.modalBtn, { backgroundColor: C.errorDim, borderColor: C.errorBorder }]}
                      onPress={handleNextStep}
                    >
                      <Text style={[s.modalBtnText, { color: C.error }]}>J'ai compris</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Étape 2 */}
              {deleteStep === 2 && (
                <>
                  <Text style={s.modalStepTitle}>Vérification de sécurité</Text>
                  <Text style={s.modalStepText}>
                    Pour confirmer, veuillez saisir le code suivant :
                  </Text>
                  <View style={[s.codeBox, { backgroundColor: C.errorDim, borderColor: C.error }]}>
                    <Text style={[s.codeText, { color: C.error }]}>{confirmationCode}</Text>
                  </View>
                  <TextInput
                    style={s.codeInput}
                    value={userInputCode}
                    onChangeText={setUserInputCode}
                    placeholder="Saisissez le code"
                    placeholderTextColor={C.white20}
                    autoCapitalize="characters"
                    maxLength={6}
                    autoFocus
                    selectionColor={C.error}
                  />
                  <View style={s.modalActions}>
                    <TouchableOpacity
                      style={[s.modalBtn, { backgroundColor: C.white10, borderColor: C.border }]}
                      onPress={() => setDeleteStep(1)}
                    >
                      <Text style={[s.modalBtnText, { color: C.white60 }]}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.modalBtn,
                        { backgroundColor: C.errorDim, borderColor: C.errorBorder },
                        userInputCode.length !== 6 && s.modalBtnDisabled,
                      ]}
                      onPress={handleNextStep}
                      disabled={userInputCode.length !== 6}
                    >
                      <Text style={[s.modalBtnText, { color: C.error }]}>Vérifier</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Étape 3 */}
              {deleteStep === 3 && (
                <>
                  <Text style={s.modalStepTitle}>Dernière étape (optionnel)</Text>
                  <Text style={s.modalStepText}>
                    Pourriez-vous nous dire pourquoi vous souhaitez supprimer votre compte ?
                  </Text>
                  <TextInput
                    style={s.reasonInput}
                    value={deleteReason}
                    onChangeText={setDeleteReason}
                    placeholder="Votre raison (optionnel)…"
                    placeholderTextColor={C.white20}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    selectionColor={C.error}
                  />
                  <View style={[s.finalWarningRow, { backgroundColor: C.errorDim, borderColor: C.errorBorder }]}>
                    <Ionicons name="alert-circle" size={18} color={C.error} />
                    <Text style={[s.finalWarningText, { color: C.white60 }]}>
                      Cette action est définitive et irréversible
                    </Text>
                  </View>
                  <View style={s.modalActions}>
                    <TouchableOpacity
                      style={[s.modalBtn, { backgroundColor: C.white10, borderColor: C.border }]}
                      onPress={() => setDeleteStep(2)}
                      disabled={isDeletingAccount}
                    >
                      <Text style={[s.modalBtnText, { color: C.white60 }]}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.modalBtn,
                        { backgroundColor: C.errorDim, borderColor: C.errorBorder },
                        isDeletingAccount && s.modalBtnDisabled,
                      ]}
                      onPress={handleDeleteAccount}
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? (
                        <ActivityIndicator size="small" color={C.error} />
                      ) : (
                        <Text style={[s.modalBtnText, { color: C.error }]}>
                          Supprimer définitivement
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );

  // ── Loading / Error states ──
  if (isLoading && !user) {
    return (
      <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={s.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={s.stateText}>Chargement du profil…</Text>
      </LinearGradient>
    );
  }

  if (!user && !isLoading) {
    return (
      <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={s.centered}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="person-circle-outline" size={80} color={C.white20} />
        <Text style={s.stateText}>Erreur de chargement du profil</Text>
        <TouchableOpacity
          style={[s.retryBtn, { backgroundColor: C.accentDim, borderColor: C.accentBorder }]}
          onPress={fetchUserProfile}
        >
          <Text style={[s.retryBtnText, { color: C.accent }]}>Réessayer</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[C.bgDeep, C.bgMid, "#0D1B4B"]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchUserProfile(); }}
                tintColor={C.cyan}
                colors={[C.cyan]}
              />
            }
          >
            {/* ── Header ── */}
            <LinearGradient
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.02)"]}
              style={s.header}
            >
              <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={18} color={C.white80} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Mon Profil</Text>
              <TouchableOpacity
                style={[s.headerBtn, isEditing && { backgroundColor: C.errorDim, borderColor: C.errorBorder }]}
                onPress={() => setIsEditing(!isEditing)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isEditing ? "close" : "pencil-outline"}
                  size={18}
                  color={isEditing ? C.error : C.accent}
                />
              </TouchableOpacity>
            </LinearGradient>

            {/* ── Avatar Section ── */}
            <View style={s.avatarSection}>
              <View style={s.avatarWrap}>
                {(user as any)?.avatar ? (
                  <Image source={{ uri: (user as any).avatar }} style={s.avatar} />
                ) : (
                  <LinearGradient
                    colors={[C.accent, C.purple]}
                    style={s.avatar}
                  >
                    <Text style={s.avatarText}>
                      {(user?.firstName?.[0] ?? "").toUpperCase()}
                      {(user?.lastName?.[0] ?? "").toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
                {/* Online badge */}
                <View
                  style={[
                    s.onlineBadge,
                    { backgroundColor: user?.isActive ? C.success : C.error },
                  ]}
                />
              </View>

              <Text style={s.fullName}>
                {user?.firstName} {user?.lastName}
              </Text>

              <View
                style={[
                  s.rolePill,
                  {
                    backgroundColor: getRoleDim((user as any)?.role || ""),
                    borderColor: getRoleBorder((user as any)?.role || ""),
                  },
                ]}
              >
                <Text style={[s.rolePillText, { color: getRoleColor((user as any)?.role || "") }]}>
                  {getRoleLabel((user as any)?.role || "")}
                </Text>
              </View>

              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor: user?.isActive ? C.successDim : C.errorDim,
                    borderColor: user?.isActive ? C.successBorder : C.errorBorder,
                  },
                ]}
              >
                <View
                  style={[
                    s.statusDot,
                    { backgroundColor: user?.isActive ? C.success : C.error },
                  ]}
                />
                <Text
                  style={[
                    s.statusPillText,
                    { color: user?.isActive ? C.success : C.error },
                  ]}
                >
                  {user?.isActive ? "Actif" : "Inactif"}
                </Text>
              </View>
            </View>

            {/* ── Informations personnelles ── */}
            <View style={s.section}>
              <LinearGradient
                colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
                style={[s.card, { borderColor: C.accentBorder }]}
              >
                <View style={s.cardHeader}>
                  <View style={[s.cardIconWrap, { backgroundColor: C.accentDim, borderColor: C.accentBorder }]}>
                    <Ionicons name="person-outline" size={18} color={C.accent} />
                  </View>
                  <Text style={s.cardTitle}>Informations personnelles</Text>
                </View>

                {[
                  { label: "Prénom", value: firstName, setter: setFirstName, placeholder: "Prénom" },
                  { label: "Nom", value: lastName, setter: setLastName, placeholder: "Nom de famille" },
                  { label: "Entreprise", value: company, setter: setCompany, placeholder: "Pizza Time Montmartre" },
                ].map(({ label, value, setter, placeholder }) => (
                  <View style={s.inputGroup} key={label}>
                    <Text style={s.inputLabel}>{label}</Text>
                    {isEditing ? (
                      <TextInput
                        style={s.textInput}
                        value={value}
                        onChangeText={setter}
                        placeholder={placeholder}
                        placeholderTextColor={C.white20}
                        selectionColor={C.accent}
                      />
                    ) : (
                      <View style={s.inputValue}>
                        <Text style={s.inputValueText}>{value || "—"}</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Email séparé car logique spéciale */}
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Email</Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        style={s.textInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        editable={subscription.length === 0}
                        placeholderTextColor={C.white20}
                        selectionColor={C.accent}
                      />
                      {subscription.length > 0 && (
                        <View style={[s.emailWarning, { backgroundColor: C.warningDim, borderColor: C.warningBorder }]}>
                          <Ionicons name="information-circle-outline" size={14} color={C.warning} />
                          <Text style={[s.emailWarningText, { color: C.warning }]}>
                            Impossible de modifier l'email après un abonnement
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={s.inputValue}>
                      <Text style={s.inputValueText}>{email || "—"}</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* ── Boutons save/cancel ── */}
            {isEditing && (
              <View style={[s.section, { flexDirection: "row", gap: 12 }]}>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
                  onPress={handleCancel}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
                    style={[s.actionBtn, { borderColor: C.border }]}
                  >
                    <Text style={[s.actionBtnText, { color: C.white60 }]}>Annuler</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}
                  onPress={handleSaveProfile}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[C.cyan, C.accent]}
                    style={s.actionBtn}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <Text style={[s.actionBtnText, { color: C.white }]}>Sauvegarder</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Actions ── */}
            <View style={s.section}>
              <LinearGradient
                colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]}
                style={[s.card, { borderColor: C.border }]}
              >
                <View style={s.cardHeader}>
                  <View style={[s.cardIconWrap, { backgroundColor: C.cyanDim, borderColor: C.cyanBorder }]}>
                    <Ionicons name="settings-outline" size={18} color={C.cyan} />
                  </View>
                  <Text style={s.cardTitle}>Actions</Text>
                </View>

                {/* Changer mot de passe */}
                <TouchableOpacity
                  style={[s.actionItem, { borderColor: C.warningBorder }]}
                  onPress={handleChangePassword}
                  activeOpacity={0.7}
                >
                  <View style={[s.actionItemIcon, { backgroundColor: C.warningDim, borderColor: C.warningBorder }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={C.warning} />
                  </View>
                  <Text style={[s.actionItemText, { color: C.white80 }]}>Changer le mot de passe</Text>
                  <Ionicons name="chevron-forward-outline" size={16} color={C.white20} />
                </TouchableOpacity>

                {/* Déconnexion */}
                <TouchableOpacity
                  style={[s.actionItem, { borderColor: C.border }]}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <View style={[s.actionItemIcon, { backgroundColor: C.errorDim, borderColor: C.errorBorder }]}>
                    <Ionicons name="log-out-outline" size={18} color={C.error} />
                  </View>
                  <Text style={[s.actionItemText, { color: C.error }]}>Se déconnecter</Text>
                  <Ionicons name="chevron-forward-outline" size={16} color={C.white20} />
                </TouchableOpacity>

                {/* Supprimer le compte */}
                <TouchableOpacity
                  style={[s.actionItem, { borderColor: C.border, marginBottom: 0 }]}
                  onPress={handleOpenDeleteModal}
                  activeOpacity={0.7}
                >
                  <View style={[s.actionItemIcon, { backgroundColor: C.errorDim, borderColor: C.errorBorder }]}>
                    <Ionicons name="trash-outline" size={18} color={C.error} />
                  </View>
                  <Text style={[s.actionItemText, { color: C.error }]}>Supprimer mon compte</Text>
                  <Ionicons name="chevron-forward-outline" size={16} color={C.white20} />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {renderDeleteModal()}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  // States
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  stateText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.40)",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },

  scroll: { paddingBottom: 50, paddingTop: 4 },

  // Header
  header: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0A0E27",
  },
  fullName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "700",
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

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
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

  // Inputs
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: 11,
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
  inputValue: {
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  inputValueText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.80)",
    fontWeight: "500",
  },
  emailWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  emailWarningText: {
    fontSize: 12,
    flex: 1,
  },

  // Action buttons (save/cancel)
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Action items (list)
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  actionItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0D1340",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    gap: 12,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 20,
    gap: 14,
  },
  modalStepTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalStepText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.60)",
    lineHeight: 20,
  },
  warningList: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  warningItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  codeBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
    borderStyle: "dashed",
  },
  codeText: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#FFFFFF",
    height: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  finalWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  finalWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnDisabled: {
    opacity: 0.4,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
