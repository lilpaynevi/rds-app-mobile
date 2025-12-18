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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/scripts/AuthContext";
import { authMe } from "@/requests/auth.requests";
import api from "@/scripts/fetch.api";
import { router } from "expo-router";

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
  const [userData, setUserData] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // États pour l'édition
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
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
        setAvatar(user?.avatar || "");
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
        const updatedUser = response.data;
        setUserData(updatedUser);
        setIsEditing(false);
        updateNewInfoUser({
          ...user,
          firstName,
          lastName,
          email,
          company,
        });
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
    return router.navigate("/home/profile/subscription/forgot-password");
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Date invalide";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return "#6366F1";
      case "MODERATOR":
        return "#8B5CF6";
      case "USER":
      default:
        return "#10B981";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return "Administrateur";
      case "MODERATOR":
        return "Modérateur";
      case "USER":
      default:
        return "Utilisateur";
    }
  };

  // Écran de chargement initial
  if (isLoading && !user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  // Écran d'erreur si pas de user
  if (!user && !isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="person-circle-outline" size={80} color="#E5E7EB" />
        <Text style={styles.errorText}>Erreur de chargement du profil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchUserProfile();
              }}
              tintColor="#6366F1"
              colors={["#6366F1"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header avec gradient */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  isEditing && styles.editButtonActive,
                ]}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <Ionicons name={"arrow-back"} size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Mon Profil</Text>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  isEditing && styles.editButtonActive,
                ]}
                onPress={() => setIsEditing(!isEditing)}
                disabled={isLoading}
              >
                <Ionicons
                  name={isEditing ? "close" : "pencil"}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {user?.firstName?.[0]?.toUpperCase() || "?"}
                    {user?.lastName?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}

              {/* Badge de statut */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: user?.isActive ? "#10B981" : "#EF4444",
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {user?.isActive ? "En ligne" : "Hors ligne"}
                </Text>
              </View>
            </View>

            {/* Nom complet */}
            <Text style={styles.fullName}>
              {user?.firstName} {user?.lastName}
            </Text>

            {/* Badge de rôle */}
            <View
              style={[
                styles.roleBadgeMain,
                { backgroundColor: getRoleColor(user?.role || "") },
              ]}
            >
              <Text style={styles.roleTextMain}>
                {getRoleLabel(user?.role || "")}
              </Text>
            </View>
          </View>

          {/* Informations Personnelles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="person" size={20} color="#6366F1" />
              </View>
              <Text style={styles.sectionTitle}>Informations Personnelles</Text>
            </View>

            {/* Prénom */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Prénom</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Prénom"
                  maxLength={50}
                />
              ) : (
                <View style={styles.inputValueContainer}>
                  <Text style={styles.inputValue}>{user?.firstName}</Text>
                </View>
              )}
            </View>

            {/* Nom */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Nom de famille"
                  maxLength={50}
                />
              ) : (
                <View style={styles.inputValueContainer}>
                  <Text style={styles.inputValue}>{user?.lastName}</Text>
                </View>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    aria-disabled={true}
                  />
                  {subscription.length > 0 && (
                    <View
                      style={{
                        marginTop: 3,
                        padding: 20,
                      }}
                    >
                      <Text
                        style={{
                          color: "red",
                        }}
                      >
                        Impossible de modifier votre email après avoir souscrit
                        à un abonnement
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.inputValueContainer}>
                  <Text style={styles.inputValue}>{user?.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Entreprise</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Pizza Time Montmartre"
                  autoCapitalize="none"
                  autoComplete="email"
                  aria-disabled={true}
                />
              ) : (
                <View style={styles.inputValueContainer}>
                  <Text style={styles.inputValue}>{user?.company}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Informations du Compte */}
          {/* <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="information-circle" size={20} color="#6366F1" />
              </View>
              <Text style={styles.sectionTitle}>Informations du Compte</Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Ionicons name="calendar" size={24} color="#10B981" />
                <Text style={styles.infoCardLabel}>Membre depuis</Text>
                <Text style={styles.infoCardValue}>
                  {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
                </Text>
              </View>

              {user?.lastLogin && (
                <View style={styles.infoCard}>
                  <Ionicons name="time" size={24} color="#F59E0B" />
                  <Text style={styles.infoCardLabel}>Dernière connexion</Text>
                  <Text style={styles.infoCardValue}>
                    {formatDate(user.lastLogin)}
                  </Text>
                </View>
              )}
            </View>

             <View style={styles.infoRow}>
              <Ionicons name="key" size={20} color="#9CA3AF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ID Utilisateur</Text>
                <Text style={styles.infoValueSmall}>{user?.id}</Text>
              </View>
            </View> 
          </View> */}

          {/* Boutons de sauvegarde en mode édition */}
          {isEditing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  isLoading && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Sauvegarder</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="settings" size={20} color="#6366F1" />
              </View>
              <Text style={styles.sectionTitle}>Actions</Text>
            </View>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleChangePassword}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="lock-closed" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>Changer le mot de passe</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="log-out" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, styles.logoutText]}>
                Se déconnecter
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#6366F1",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 80,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  editButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  avatarSection: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 30,
    marginTop: -40,
    marginHorizontal: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
    marginTop: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarPlaceholder: {
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  statusBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  fullName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  roleBadgeMain: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  roleTextMain: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarEditContainer: {
    width: "100%",
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  inputValueContainer: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoCardLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 4,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValueSmall: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  saveButton: {
    backgroundColor: "#6366F1",
  },
  saveButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
    fontWeight: "500",
  },
  logoutText: {
    color: "#EF4444",
  },
  bottomSpacing: {
    height: 40,
  },
});
