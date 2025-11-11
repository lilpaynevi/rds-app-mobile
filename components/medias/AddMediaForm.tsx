import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "react-native";
import { Text } from "react-native";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { FlatList } from "react-native";

import * as VideoThumbnails from "expo-video-thumbnails";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

const DURATION_OPTIONS = [
  { label: "5 secondes", value: 5 },
  { label: "10 secondes", value: 10 },
  { label: "15 secondes", value: 15 },
  { label: "20 secondes", value: 20 },
  { label: "30 secondes", value: 30 },
  { label: "45 secondes", value: 45 },
  { label: "60 secondes", value: 60 },
];

export default function AddMediaForm({
  medias,
  onSave,
}: {
  medias: any;
  onSave: (data: any) => void;
}) {
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [isSelectingMedia, setIsSelectingMedia] = useState(false);
  const [showMediaTypeSelector, setShowMediaTypeSelector] = useState(false); // NOUVEAU
  const [selectedMediaForDuration, setSelectedMediaForDuration] =
    useState(null);
  const [showDurationSelector, setShowDurationSelector] = useState(false);

  const [videoThumbnails, setVideoThumbnails] = useState<{
    [key: string]: string;
  }>({});
  const [generatingThumbnails, setGeneratingThumbnails] = useState<{
    [key: string]: boolean;
  }>({});

  // États pour la sélection groupée
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(
    new Set()
  );
  const [groupSelectionMode, setGroupSelectionMode] = useState(false);
  const [groupSelectionType, setGroupSelectionType] = useState<
    "image" | "video" | null
  >(null);

  const handleLongPressMedia = (media) => {
    const mediaType = media.type === "video" ? "video" : "image";
    setGroupSelectionMode(true);
    setGroupSelectionType(mediaType);
    const mediaIds = selectedMedia
      .filter((m) => (m.type === "video" ? "video" : "image") === mediaType)
      .map((m) => m.id.toString());
    setSelectedMediaIds(new Set(mediaIds));
  };

  const exitGroupSelection = () => {
    setGroupSelectionMode(false);
    setGroupSelectionType(null);
    setSelectedMediaIds(new Set());
  };

  // Demander les permissions pour les médias
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission requise",
        "L'accès à la galerie est nécessaire pour sélectionner des médias."
      );
      return false;
    }
    return true;
  };

  const generateVideoThumbnail = async (videoUri: string, mediaId: string) => {
    try {
      setGeneratingThumbnails((prev) => ({ ...prev, [mediaId]: true }));
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
        quality: 0.8,
      });
      setVideoThumbnails((prev) => ({ ...prev, [mediaId]: uri }));
    } catch (error) {
      console.warn("Erreur lors de la génération du thumbnail:", error);
    } finally {
      setGeneratingThumbnails((prev) => ({ ...prev, [mediaId]: false }));
    }
  };

  // NOUVEAU: Ouvrir le sélecteur de type de média
  const openMediaTypeSelector = () => {
    setShowMediaTypeSelector(true);
  };

  // NOUVEAU: Sélection des images et vidéos avec ImagePicker
  const selectImagesAndVideos = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map((asset: any, index: number) => ({
          id: Date.now() + index,
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName || `media_${Date.now() + index}`,
          duration: 10,
        }));

        setSelectedMedia([...selectedMedia, ...newMedia]);
        onSave([...selectedMedia, ...newMedia]);

        newMedia.forEach((media) => {
          if (media.type === "video") {
            generateVideoThumbnail(media.uri, media.id);
          }
        });

        setIsSelectingMedia(true);
        setShowMediaTypeSelector(false);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sélectionner les médias");
    } finally {
      setIsSelectingMedia(false);
    }
  };

  // NOUVEAU: Sélection des documents avec DocumentPicker
  const selectDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const newDocuments = result.assets.map((asset: any, index: number) => ({
          id: Date.now() + index,
          uri: asset.uri,
          type: "document",
          fileName: asset.name || `document_${Date.now() + index}`,
          duration: 30, // Durée par défaut pour les documents
          size: asset.size,
          mimeType: asset.mimeType,
        }));

        setSelectedMedia([...selectedMedia, ...newDocuments]);
        onSave([...selectedMedia, ...newDocuments]);

        setIsSelectingMedia(true);
        setShowMediaTypeSelector(false);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sélectionner les documents");
    } finally {
      setIsSelectingMedia(false);
    }
  };

  // Supprimer un média
  const removeMedia = (mediaId: string) => {
    setSelectedMedia(selectedMedia.filter((media) => media.id !== mediaId));
    onSave(selectedMedia.filter((media) => media.id !== mediaId));
    const newSelectedIds = new Set(selectedMediaIds);
    newSelectedIds.delete(mediaId.toString());
    setSelectedMediaIds(newSelectedIds);

    if (newSelectedIds.size === 0) {
      exitGroupSelection();
    }
  };

  const updateMediaDuration = (mediaId, duration) => {
    if (groupSelectionMode && selectedMediaIds.size > 0) {
      const newMedias = selectedMedia.map((media) =>
        selectedMediaIds.has(media.id.toString())
          ? { ...media, duration }
          : media
      );
      setSelectedMedia(newMedias);
      onSave(newMedias);
    } else {
      const newMedias = selectedMedia.map((media) =>
        media.id === mediaId ? { ...media, duration } : media
      );
      setSelectedMedia(newMedias);
      onSave(newMedias);
    }
  };

  const openDurationSelector = (media) => {
    setSelectedMediaForDuration(media);
    setShowDurationSelector(true);
  };

  const selectDuration = (duration) => {
    if (selectedMediaForDuration) {
      updateMediaDuration(selectedMediaForDuration.id, duration);
    }
    setShowDurationSelector(false);
    setSelectedMediaForDuration(null);
  };

  const renderMediaThumbnail = (item) => {
    // Pour les documents PDF
    if (item.type === "document") {
      return (
        <View style={[styles.mediaThumbnail, styles.documentPlaceholder]}>
          <Ionicons name="document-text" size={40} color="#666" />
          <Text style={styles.documentPlaceholderText}>PDF</Text>
        </View>
      );
    }

    if (item.type === "video") {
      const thumbnailUri = videoThumbnails[item.id];
      const isGenerating = generatingThumbnails[item.id];

      if (isGenerating) {
        return (
          <View style={[styles.mediaThumbnail, styles.thumbnailLoader]}>
            <ActivityIndicator size="small" color="#2575fc" />
            <Text style={styles.loadingText}>Génération...</Text>
          </View>
        );
      }

      if (thumbnailUri) {
        return (
          <View style={styles.mediaThumbnail}>
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnailImage}
            />
            <View style={styles.videoOverlay}>
              <Ionicons name="play-circle" size={24} color="#fff" />
            </View>
          </View>
        );
      }

      return (
        <View style={[styles.mediaThumbnail, styles.videoPlaceholder]}>
          <Ionicons name="videocam" size={40} color="#666" />
          <Text style={styles.videoPlaceholderText}>Vidéo</Text>
        </View>
      );
    }

    return <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />;
  };

  return (
    <ScrollView>
      {/* Barre d'information mode groupé */}
      {groupSelectionMode && (
        <View style={styles.groupModeBar}>
          <View style={styles.groupModeInfo}>
            <Ionicons
              name={groupSelectionType === "video" ? "videocam" : "image"}
              size={16}
              color="#2575fc"
            />
            <Text style={styles.groupModeText}>
              {selectedMediaIds.size}{" "}
              {groupSelectionType === "video" ? "vidéo(s)" : "image(s)"}{" "}
              sélectionnée(s)
            </Text>
          </View>
          <TouchableOpacity
            onPress={exitGroupSelection}
            style={styles.exitGroupButton}
          >
            <Text style={styles.exitGroupText}>Sortir</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.mediaHeader}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images" size={20} color="#1B2845" />
            <Text style={styles.sectionTitle}>
              Médias ({selectedMedia.length})
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addMediaButton,
              isSelectingMedia && styles.disabledButton,
            ]}
            onPress={openMediaTypeSelector} // MODIFIÉ
            disabled={isSelectingMedia}
          >
            {isSelectingMedia ? (
              <ActivityIndicator size="small" color="#2575fc" />
            ) : (
              <Ionicons name="add" size={16} color="#2575fc" />
            )}
            <Text
              style={[
                styles.addMediaText,
                isSelectingMedia && styles.disabledText,
              ]}
            >
              Ajouter
            </Text>
          </TouchableOpacity>
        </View>

        {selectedMedia.length > 0 ? (
          <FlatList
            data={selectedMedia}
            numColumns={2}
            columnWrapperStyle={styles.mediaRow}
            style={{ marginBottom: 100 }}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = selectedMediaIds.has(item.id.toString());
              const isHighlighted = groupSelectionMode && isSelected;

              return (
                <TouchableOpacity
                  style={[
                    styles.mediaItemContainer,
                    isHighlighted && styles.highlightedMedia,
                  ]}
                  onLongPress={() => handleLongPressMedia(item)}
                  delayLongPress={500}
                >
                  <View style={styles.mediaItem}>
                    {renderMediaThumbnail(item)}

                    {isHighlighted && (
                      <View style={styles.selectionBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#2575fc"
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeMedia(item.id)}
                    >
                      <Ionicons name="close" size={16} color="#ff4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.durationForm}>
                    <Text style={styles.durationLabel}>Durée d'affichage</Text>
                    <TouchableOpacity
                      style={styles.durationSelector}
                      onPress={() => openDurationSelector(item)}
                    >
                      <View style={styles.durationSelectorContent}>
                        <Ionicons name="time" size={16} color="#2575fc" />
                        <Text style={styles.durationText}>
                          {item.duration}s
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#999" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun média sélectionné</Text>
            <Text style={styles.emptySubtext}>
              Appuyez sur "Ajouter" pour choisir des images, vidéos ou documents
            </Text>
          </View>
        )}
      </View>

      {/* Modal sélection durée */}
      <Modal
        visible={showDurationSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDurationSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.durationModalContainer}>
            <View style={styles.durationModalHeader}>
              <Text style={styles.durationModalTitle}>
                Choisir la durée d'affichage
              </Text>
              <TouchableOpacity
                onPress={() => setShowDurationSelector(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.durationModalContent}>
              <FlatList
                data={DURATION_OPTIONS}
                keyExtractor={(item) => item.value.toString()}
                style={styles.durationList}
                renderItem={({ item }) => {
                  const isSelected =
                    selectedMediaForDuration?.duration === item.value;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.durationOption,
                        isSelected && styles.selectedDurationOption,
                      ]}
                      onPress={() => selectDuration(item.value)}
                    >
                      <View style={styles.durationOptionContent}>
                        <Ionicons
                          name="time"
                          size={20}
                          color={isSelected ? "#2575fc" : "#666"}
                        />
                        <Text
                          style={[
                            styles.durationOptionText,
                            isSelected && styles.selectedDurationText,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#2575fc" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* NOUVEAU: Modal de sélection du type de média */}
      <Modal
        visible={showMediaTypeSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMediaTypeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mediaTypeSelectorContainer}>
            <View style={styles.mediaTypeSelectorHeader}>
              <Text style={styles.mediaTypeSelectorTitle}>
                Choisir le type de contenu
              </Text>
              <TouchableOpacity
                onPress={() => setShowMediaTypeSelector(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.mediaTypeOptions}>
              <TouchableOpacity
                style={styles.mediaTypeOption}
                onPress={selectImagesAndVideos}
              >
                <View style={styles.mediaTypeIcon}>
                  <Ionicons name="images" size={32} color="#2575fc" />
                </View>
                <Text style={styles.mediaTypeOptionTitle}>Photos & Vidéos</Text>
                <Text style={styles.mediaTypeOptionDescription}>
                  Sélectionner depuis votre galerie
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaTypeOption}
                onPress={selectDocuments}
              >
                <View style={styles.mediaTypeIcon}>
                  <Ionicons name="document-text" size={32} color="#2575fc" />
                </View>
                <Text style={styles.mediaTypeOptionTitle}>Documents PDF</Text>
                <Text style={styles.mediaTypeOptionDescription}>
                  Sélectionner des fichiers PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 0 : 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },

  // Section styles
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B2845",
    marginLeft: 8,
  },

  // Text input styles
  textInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },

  // Media styles
  mediaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addMediaText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#2575fc",
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: "#ccc",
  },
  mediaRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  mediaItemContainer: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  highlightedMedia: {
    backgroundColor: "#e3f2fd",
    borderWidth: 2,
    borderColor: "#2575fc",
    shadowColor: "#2575fc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mediaItem: {
    position: "relative",
  },
  mediaThumbnail: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  thumbnailLoader: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#2575fc",
  },
  videoOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8e8e8",
  },
  videoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
  },
  documentPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff3e0",
  },
  documentPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#ff9800",
    fontWeight: "600",
  },
  selectionBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 4,
  },
  durationForm: {
    marginTop: 8,
  },
  durationLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  durationSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  durationSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#2575fc",
    fontWeight: "500",
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },

  // TV selector
  tvSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tvSelectorContent: {
    flex: 1,
  },
  tvSelectorText: {
    fontSize: 16,
    color: "#333",
  },
  tvPlaceholder: {
    fontSize: 16,
    color: "#999",
  },

  // Date time
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateTimeButton: {
    flex: 0.48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateTimeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  // Status
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: "#1B2845",
    fontWeight: "500",
  },

  // Summary
  summarySection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e3f2fd",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B2845",
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  summaryLabel: {
    fontWeight: "600",
    color: "#1B2845",
  },

  // Group mode bar
  groupModeBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2575fc20",
  },
  groupModeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupModeText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#2575fc",
    fontWeight: "600",
  },
  exitGroupButton: {
    backgroundColor: "#2575fc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exitGroupText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Save button
  saveButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  disabledSaveButton: {
    opacity: 0.6,
  },

  // Saving overlay
  savingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  savingContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    minWidth: 200,
  },
  savingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    textAlign: "center",
  },
  savingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // NOUVEAU: Styles pour le modal de sélection du type de média
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaTypeSelectorContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    width: "90%",
  },
  mediaTypeSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  mediaTypeSelectorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B2845",
  },
  closeButton: {
    padding: 4,
  },
  mediaTypeOptions: {
    padding: 20,
  },
  mediaTypeOption: {
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  mediaTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mediaTypeOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B2845",
    marginBottom: 4,
  },
  mediaTypeOptionDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // Modal styles existants
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B2845",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // TV item styles
  tvItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedTVItem: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2575fc",
  },
  tvInfo: {
    flex: 1,
  },
  tvName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  tvStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#4CAF50",
  },
  statusTextDisabled: {
    color: "#f44336",
  },

  // Duration modal styles
  durationModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    maxHeight: "70%",
  },
  durationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  durationModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B2845",
  },
  durationModalContent: {
    flex: 1,
  },
  durationList: {
    maxHeight: 400,
  },
  durationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedDurationOption: {
    backgroundColor: "#e3f2fd",
  },
  durationOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  selectedDurationText: {
    color: "#2575fc",
    fontWeight: "600",
  },

  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  dateRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dateRangeItem: {
    flex: 0.48,
  },
  dateLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
  },
  dateButtonError: {
    borderColor: "#ff4444",
    backgroundColor: "#fff5f5",
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dateTextError: {
    color: "#ff4444",
  },

  // Jours de la semaine
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dayButtonSelected: {
    backgroundColor: "#2575fc",
    borderColor: "#2575fc",
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  dayButtonTextSelected: {
    color: "#fff",
  },
  quickSelectContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  quickSelectButton: {
    flex: 0.22,
    backgroundColor: "#e3f2fd",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  quickSelectText: {
    fontSize: 11,
    color: "#2575fc",
    fontWeight: "500",
  },

  // Horaires
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeItem: {
    flex: 0.48,
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
  },
  timeButtonError: {
    borderColor: "#ff4444",
    backgroundColor: "#fff5f5",
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  timeTextError: {
    color: "#ff4444",
  },
  timePresets: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  presetButton: {
    flex: 0.31,
    backgroundColor: "#fff3e0",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  presetText: {
    fontSize: 10,
    color: "#ff6b35",
    fontWeight: "500",
  },

  // Messages d'erreur et d'info
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    marginLeft: 6,
    fontSize: 11,
    color: "#ff4444",
    flex: 1,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8e1",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    marginLeft: 6,
    fontSize: 11,
    color: "#ff9800",
    flex: 1,
  },
  durationInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e8",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  durationInfoText: {
    marginLeft: 6,
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "500",
  },
});
