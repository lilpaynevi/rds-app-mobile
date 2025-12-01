// components/TVSelectionModal.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

interface TV {
  id: string;
  name: string;
  code: string;
  status: "ONLINE" | "OFFLINE";
  lastConnection?: string;
}

interface TVSelectionModalProps {
  visible: boolean;
  tvs: TV[];
  baseScreens: number;
  selectedTVs: string[];
  onToggleTV: (tvId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const TVSelectionModal: React.FC<TVSelectionModalProps> = ({
  visible,
  tvs,
  baseScreens,
  selectedTVs,
  onToggleTV,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  // 🧮 Calculs
  const tvsToDelete = Math.max(0, tvs.length - baseScreens);
  const remainingTVs = tvs.length - selectedTVs.length;
  const canProceed = selectedTVs.length === tvsToDelete && tvsToDelete > 0;
  const selectionProgress = tvsToDelete > 0 ? (selectedTVs.length / tvsToDelete) * 100 : 0;

  // 📅 Formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Jamais";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🎨 Rendu d'une TV
  const renderTVItem = ({ item }: { item: TV }) => {
    const isSelected = selectedTVs.includes(item.id);
    const isOnline = item.status === "ONLINE";

    return (
      <TouchableOpacity
        style={[styles.tvItem, isSelected && styles.tvItemSelected]}
        onPress={() => onToggleTV(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.tvItemContent}>
          {/* 📦 Checkbox */}
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </View>

          {/* 📺 Icône TV avec statut */}
          <View
            style={[
              styles.tvIcon,
              isOnline ? styles.tvIconOnline : styles.tvIconOffline,
            ]}
          >
            <Ionicons
              name="tv"
              size={24}
              color={isOnline ? "#10B981" : "#6B7280"}
            />
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? "#10B981" : "#EF4444" },
              ]}
            />
          </View>

          {/* 📋 Infos TV */}
          <View style={styles.tvInfo}>
            <Text style={styles.tvName} numberOfLines={1}>
              {item.name || `TV ${item.code}`}
            </Text>

            <View style={styles.tvMeta}>
              <View
                style={[
                  styles.tvStatusDot,
                  { backgroundColor: isOnline ? "#10B981" : "#6B7280" },
                ]}
              />
              <Text
                style={[
                  styles.tvStatus,
                  { color: isOnline ? "#10B981" : "#6B7280" },
                ]}
              >
                {isOnline ? "En ligne" : "Hors ligne"}
              </Text>
              <Text style={styles.tvCode}>• Code: {item.code}</Text>
            </View>

            {item.lastConnection && (
              <Text style={styles.tvLastSeen}>
                Dernière connexion: {formatDate(item.lastConnection)}
              </Text>
            )}
          </View>
        </View>

        {/* 🏷️ Badge de sélection */}
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="trash-outline" size={14} color="#fff" />
            <Text style={styles.selectedBadgeText}>À supprimer</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* 📌 HEADER */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="trash-bin" size={24} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  Sélectionner les TVs à supprimer
                </Text>
                <Text style={styles.modalSubtitle}>
                  {tvs.length} TV(s) connectée(s) • Max après annulation:{" "}
                  <Text style={styles.modalSubtitleHighlight}>
                    {baseScreens}
                  </Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onCancel}
            >
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* ⚠️ ALERTE */}
          {tvsToDelete > 0 ? (
            <View style={styles.alertContainer}>
              <View style={styles.alertIcon}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  Action requise avant annulation
                </Text>
                <Text style={styles.alertText}>
                  Vous devez sélectionner{" "}
                  <Text style={styles.alertTextBold}>{tvsToDelete} TV(s)</Text>{" "}
                  à supprimer pour respecter la limite de votre plan de base (
                  {baseScreens} écrans).
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.alertContainer, styles.alertSuccess]}>
              <View style={[styles.alertIcon, styles.alertIconSuccess]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: "#065F46" }]}>
                  Aucune TV à supprimer
                </Text>
                <Text style={[styles.alertText, { color: "#047857" }]}>
                  Votre nombre de TVs est compatible avec votre plan de base.
                </Text>
              </View>
            </View>
          )}

          {/* 📊 BARRE DE PROGRESSION */}
          {tvsToDelete > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Sélection: {selectedTVs.length} / {tvsToDelete}
                </Text>
                <Text
                  style={[
                    styles.progressPercentage,
                    canProceed && styles.progressPercentageComplete,
                  ]}
                >
                  {Math.round(selectionProgress)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${selectionProgress}%`,
                      backgroundColor: canProceed ? "#10B981" : "#4F46E5",
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* 📺 LISTE DES TVs */}
          <FlatList
            data={tvs}
            renderItem={renderTVItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tvList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Ionicons name="tv-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyListTitle}>Aucune TV trouvée</Text>
                <Text style={styles.emptyListText}>
                  Vous n'avez aucune TV connectée à votre compte
                </Text>
              </View>
            }
          />

          {/* 🦶 FOOTER */}
          <View style={styles.modalFooter}>
            <View style={styles.footerInfo}>
              <View style={styles.footerInfoRow}>
                <Ionicons name="tv" size={18} color="#6B7280" />
                <Text style={styles.footerInfoText}>
                  TVs restantes après suppression:{" "}
                  <Text
                    style={[
                      styles.footerInfoValue,
                      remainingTVs > baseScreens && styles.footerInfoValueError,
                    ]}
                  >
                    {remainingTVs}
                  </Text>
                </Text>
              </View>

              {!canProceed && tvsToDelete > 0 && (
                <View style={styles.footerWarningContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.footerWarning}>
                    {selectedTVs.length < tvsToDelete
                      ? `Sélectionnez encore ${
                          tvsToDelete - selectedTVs.length
                        } TV(s)`
                      : `Vous avez sélectionné trop de TVs`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!canProceed || loading) && styles.confirmButtonDisabled,
                ]}
                onPress={onConfirm}
                disabled={!canProceed || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                      Supprimer et annuler
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 🎨 STYLES
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },

  // 📌 HEADER
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },

  modalSubtitleHighlight: {
    fontWeight: "600",
    color: "#4F46E5",
  },

  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },

  // ⚠️ ALERTE
  alertContainer: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    gap: 12,
  },

  alertSuccess: {
    backgroundColor: "#D1FAE5",
    borderLeftColor: "#10B981",
  },

  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
  },

  alertIconSuccess: {
    backgroundColor: "#A7F3D0",
  },

  alertContent: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 4,
  },

  alertText: {
    fontSize: 13,
    color: "#B45309",
    lineHeight: 18,
  },

  alertTextBold: {
    fontWeight: "700",
  },

  // 📊 PROGRESSION
  progressContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  progressPercentage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },

  progressPercentageComplete: {
    color: "#10B981",
  },

  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s ease",
  },

  // 📺 LISTE TVs
  tvList: {
    padding: 20,
    paddingBottom: 0,
  },

  tvItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },

  tvItemSelected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },

  tvItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxSelected: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  // Icône TV
  tvIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  tvIconOnline: {
    backgroundColor: "#D1FAE5",
  },

  tvIconOffline: {
    backgroundColor: "#F3F4F6",
  },

  statusDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },

  // Infos TV
  tvInfo: {
    flex: 1,
  },

  tvName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },

  tvMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },

  tvStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  tvStatus: {
    fontSize: 13,
    fontWeight: "500",
  },

  tvCode: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  tvLastSeen: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  // Badge
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  selectedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  // Liste vide
  emptyList: {
    padding: 40,
    alignItems: "center",
  },

  emptyListTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },

  emptyListText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // 🦶 FOOTER
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 20,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: "#F9FAFB",
  },

  footerInfo: {
    gap: 8,
  },

  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  footerInfoText: {
    fontSize: 14,
    color: "#6B7280",
  },

  footerInfoValue: {
    fontWeight: "700",
    color: "#1F2937",
    fontSize: 15,
  },

  footerInfoValueError: {
    color: "#EF4444",
  },

  footerWarningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
  },

  footerWarning: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },

  footerButtons: {
    flexDirection: "row",
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },

  confirmButton: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  confirmButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
    shadowOpacity: 0,
  },

  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

export default TVSelectionModal;
