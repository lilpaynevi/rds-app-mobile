// screens/AddPlaylistScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  FlatList,
  Platform,
  SafeAreaView,
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails"; // Ajout de l'import
import { router } from "expo-router";
import { getMyTVs } from "@/requests/tv.requests";
import { createPlaylist } from "@/requests/playlists.requests";
import { socket } from "@/scripts/socket.io";
import { LinearGradient } from "expo-linear-gradient";

// Options de durée disponibles
const DURATION_OPTIONS = [
  { label: "5 secondes", value: 5 },
  { label: "10 secondes", value: 10 },
  { label: "15 secondes", value: 15 },
  { label: "20 secondes", value: 20 },
  { label: "30 secondes", value: 30 },
  { label: "45 secondes", value: 45 },
  { label: "60 secondes", value: 60 },
];

export default function AddPlaylistScreen() {
  // États du formulaire existants
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [televisions, setTV] = useState<any>([]);
  const [selectedTV, setSelectedTV] = useState<any>(null);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [launchDate, setLaunchDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow;
  });

  // États pour les pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTVSelector, setShowTVSelector] = useState(false);

  // États pour les médias
  const [isSelectingMedia, setIsSelectingMedia] = useState(false);

  // États pour la sélection de durée
  const [showDurationSelector, setShowDurationSelector] = useState(false);
  const [selectedMediaForDuration, setSelectedMediaForDuration] =
    useState(null);

  // Nouvel état pour les thumbnails vidéo
  const [videoThumbnails, setVideoThumbnails] = useState<{
    [key: string]: string;
  }>({});
  const [generatingThumbnails, setGeneratingThumbnails] = useState<{
    [key: string]: boolean;
  }>({});

  // Fonction pour générer le thumbnail d'une vidéo
  const generateVideoThumbnail = async (videoUri: string, mediaId: string) => {
    try {
      // Marquer comme en cours de génération
      setGeneratingThumbnails((prev) => ({ ...prev, [mediaId]: true }));

      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // Première seconde de la vidéo
        quality: 0.8,
      });

      // Sauvegarder le thumbnail généré
      setVideoThumbnails((prev) => ({ ...prev, [mediaId]: uri }));
    } catch (error) {
      console.warn("Erreur lors de la génération du thumbnail:", error);
    } finally {
      // Marquer comme terminé
      setGeneratingThumbnails((prev) => ({ ...prev, [mediaId]: false }));
    }
  };

  // Demander les permissions (fonction existante)
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

  const fetchTVs = async () => {
    const TV = await getMyTVs();
    setTV(TV);
  };

  // Modifier la fonction selectMedia pour générer les thumbnails
  const selectMedia = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsSelectingMedia(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map((asset) => ({
          id: Date.now().toString() + Math.random().toString(),
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          duration: 10, // Durée par défaut en secondes
        }));

        setSelectedMedia((prev) => [...prev, ...newMedia]);

        // Générer les thumbnails pour les vidéos
        newMedia.forEach((media) => {
          if (media.type === "video") {
            generateVideoThumbnail(media.uri, media.id);
          }
        });
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sélectionner les médias.");
    } finally {
      setIsSelectingMedia(false);
    }
  };

  // Modifier la fonction removeMedia pour nettoyer les thumbnails
  const removeMedia = (id) => {
    setSelectedMedia((prev) => prev.filter((media) => media.id !== id));
    // Nettoyer le thumbnail si c'est une vidéo
    setVideoThumbnails((prev) => {
      const newThumbnails = { ...prev };
      delete newThumbnails[id];
      return newThumbnails;
    });
    setGeneratingThumbnails((prev) => {
      const newGenerating = { ...prev };
      delete newGenerating[id];
      return newGenerating;
    });
  };

  // Fonctions existantes pour la durée...
  const updateMediaDuration = (mediaId, duration) => {
    setSelectedMedia((prev) =>
      prev.map((media) =>
        media.id === mediaId ? { ...media, duration } : media
      )
    );
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

  // Fonctions existantes pour les dates, TV, etc...
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(launchDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setLaunchDate(newDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(launchDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setLaunchDate(newDate);
    }
  };

  const selectTV = (tv) => {
    setSelectedTV(tv);
    setShowTVSelector(false);
  };

  // Fonction pour rendre un média avec thumbnail si vidéo
  const renderMediaThumbnail = (item) => {
    if (item.type === "video") {
      const thumbnailUri = videoThumbnails[item.id];
      const isGenerating = generatingThumbnails[item.id];

      if (isGenerating) {
        // Afficher un loader pendant la génération
        return (
          <View style={[styles.mediaThumbnail, styles.thumbnailLoader]}>
            <ActivityIndicator size="small" color="#2575fc" />
            <Text style={styles.loadingText}>Génération...</Text>
          </View>
        );
      }

      if (thumbnailUri) {
        // Afficher le thumbnail généré
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

      // Fallback si pas de thumbnail
      return (
        <View style={[styles.mediaThumbnail, styles.videoPlaceholder]}>
          <Ionicons name="videocam" size={40} color="#666" />
          <Text style={styles.videoPlaceholderText}>Vidéo</Text>
        </View>
      );
    }

    // Pour les images, affichage normal
    return <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />;
  };

  // Calcul de la durée totale
  const getTotalDuration = () => {
    return selectedMedia.reduce((total, media) => total + media.duration, 0);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Fonction de sauvegarde (à adapter selon vos besoins)
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Veuillez saisir un titre pour la playlist.");
      return;
    }

    if (selectedMedia.length === 0) {
      Alert.alert("Erreur", "Veuillez sélectionner au moins un média.");
      return;
    }

    if (!selectedTV) {
      Alert.alert("Erreur", "Veuillez sélectionner une télévision.");
      return;
    }

    setIsSaving(true);

    try {
      const playlistData = {
        titre: title,
        television: selectedTV.id,
        nombreMedias: selectedMedia.length,
        isActive,
        items: selectedMedia,
        dateLancement: launchDate.toLocaleDateString("fr-FR"),
        heureLancement: launchDate.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      await createPlaylist(playlistData);
      Alert.alert("Succès", "Playlist créée avec succès !");
      router.back();
    } catch (error) {
      console.log("🚀 ~ handleSave ~ error:", error);
      Alert.alert("Erreur", "Impossible de créer la playlist.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchTVs();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#1B2845", "#2575fc"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle Playlist</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Titre */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="text" size={20} color="#1B2845" />
            <Text style={styles.sectionTitle}>Titre de la playlist</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Saisissez le titre..."
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Sélection TV */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="tv" size={20} color="#1B2845" />
            <Text style={styles.sectionTitle}>Télévision cible</Text>
          </View>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowTVSelector(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons
                name="tv"
                size={20}
                color={selectedTV ? "#333" : "#999"}
              />
              <Text
                style={[
                  styles.selectorText,
                  !selectedTV && styles.placeholderText,
                ]}
              >
                {selectedTV ? selectedTV.name : "Sélectionnez une télévision"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Médias */}
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
              onPress={selectMedia}
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
              keyExtractor={(item) => item.id}
              columnWrapperStyle={styles.mediaRow}
              renderItem={({ item }) => (
                <View style={styles.mediaItemContainer}>
                  <View style={styles.mediaItem}>
                    {renderMediaThumbnail(item)}

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeMedia(item.id)}
                    >
                      <Ionicons name="close" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {/* Formulaire de durée */}
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
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Aucun média sélectionné</Text>
              <Text style={styles.emptySubtext}>
                Appuyez sur "Ajouter" pour choisir des images et vidéos
              </Text>
            </View>
          )}
        </View>

        {/* Date et heure de lancement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#1B2845" />
            <Text style={styles.sectionTitle}>Date et heure de lancement</Text>
          </View>

          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={24} color="#2575fc" />
              <Text style={styles.dateTimeLabel}>Date</Text>
              <Text style={styles.dateTimeValue}>
                {launchDate.toLocaleDateString("fr-FR")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={24} color="#2575fc" />
              <Text style={styles.dateTimeLabel}>Heure</Text>
              <Text style={styles.dateTimeValue}>
                {launchDate.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Activation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name={isActive ? "toggle" : "toggle-outline"}
              size={20}
              color="#1B2845"
            />
            <Text style={styles.sectionTitle}>Activer immédiatement</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#ccc", true: "#2575fc" }}
              thumbColor={isActive ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Récapitulatif */}
        {(selectedMedia.length > 0 || selectedTV) && (
          <LinearGradient
            colors={["#f8f9fa", "#ffffff"]}
            style={styles.summaryContainer}
          >
            <Text style={styles.summaryTitle}>📋 Récapitulatif</Text>

            {selectedTV && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>📺 TV:</Text>
                <Text style={styles.summaryText}>{selectedTV.name}</Text>
              </View>
            )}

            {selectedMedia.length > 0 && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>🎬 Médias:</Text>
                  <Text style={styles.summaryText}>
                    {selectedMedia.length} élément
                    {selectedMedia.length > 1 ? "s" : ""}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>⏱️ Durée totale:</Text>
                  <Text style={styles.summaryText}>
                    {formatDuration(getTotalDuration())}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>🚀 Lancement:</Text>
              <Text style={styles.summaryText}>
                {isActive
                  ? "Immédiat"
                  : `${launchDate.toLocaleDateString("fr-FR")} à ${launchDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
              </Text>
            </View>
          </LinearGradient>
        )}
      </ScrollView>

      {/* Modales existantes pour les sélecteurs de date/heure */}
      {showDatePicker && (
        <DateTimePicker
          value={launchDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={launchDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      {/* Modal de sélection TV */}
      {showTVSelector && (
        <Modal
          visible={showTVSelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTVSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sélectionner une TV</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowTVSelector(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <FlatList
                style={styles.tvList}
                data={televisions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.tvItem,
                      selectedTV?.id === item.id && styles.selectedTvItem,
                      !item.status && styles.disabledTvItem,
                    ]}
                    onPress={() => item.status && selectTV(item)}
                    disabled={!item.status}
                  >
                    <View style={styles.tvInfo}>
                      <Ionicons
                        name="tv"
                        size={24}
                        color={item.status ? "#2575fc" : "#ccc"}
                      />
                      <View style={styles.tvDetails}>
                        <Text style={styles.tvName}>{item.name}</Text>
                        <Text style={styles.tvLocation}>{item.location}</Text>
                      </View>
                    </View>

                    <View style={styles.tvStatus}>
                      <View
                        style={[
                          styles.statusIndicator,
                          {
                            backgroundColor: item.status
                              ? "#4CAF50"
                              : "#f44336",
                          },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {item.status ? "En ligne" : "Hors ligne"}
                      </Text>
                    </View>

                    {selectedTV?.id === item.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#2575fc"
                      />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyTvList}>
                    <Ionicons name="tv-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyTvText}>
                      Aucune télévision disponible
                    </Text>
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Modal de sélection de durée */}
      {showDurationSelector && (
        <Modal
          visible={showDurationSelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDurationSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.durationModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Durée d'affichage</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDurationSelector(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <FlatList
                style={styles.durationList}
                data={DURATION_OPTIONS}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.durationOption,
                      selectedMediaForDuration?.duration === item.value &&
                        styles.selectedDurationOption,
                    ]}
                    onPress={() => selectDuration(item.value)}
                  >
                    <View style={styles.durationOptionContent}>
                      <Ionicons
                        name="time"
                        size={20}
                        color={
                          selectedMediaForDuration?.duration === item.value
                            ? "#2575fc"
                            : "#666"
                        }
                      />
                      <Text
                        style={[
                          styles.durationOptionText,
                          selectedMediaForDuration?.duration === item.value &&
                            styles.selectedDurationText,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>

                    {selectedMediaForDuration?.duration === item.value && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#2575fc"
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Styles mis à jour
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 0 : 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  placeholderText: {
    color: "#999",
  },
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
  },

  // Styles pour les médias avec formulaires
  mediaItemContainer: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  mediaItem: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#e0e0e0",
    position: "relative",
  },
  mediaThumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e0e0e0",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailLoader: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 12,
    color: "#2575fc",
    marginTop: 4,
  },
  videoOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -12,
    marginTop: -12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholderText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    padding: 2,
  },

  // Styles pour le formulaire de durée
  durationForm: {
    marginTop: 8,
    paddingTop: 8,
  },
  durationLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  durationSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  durationSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 4,
    fontWeight: "500",
  },

  // Styles pour les containers vides
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },

  // Styles pour la date et l'heure
  dateTimeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  dateTimeLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  // Styles pour le récapitulatif
  summaryContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    minWidth: 120,
  },
  summaryText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },

  // Styles pour les modales
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },

  // Styles pour la liste des TV
  tvList: {
    maxHeight: 400,
  },
  tvItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedTvItem: {
    backgroundColor: "#f0f8ff",
  },
  tvInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tvDetails: {
    marginLeft: 12,
    flex: 1,
  },
  tvName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tvLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  tvStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  disabledTvItem: {
    opacity: 0.5,
  },
  tvNameDisabled: {
    color: "#999",
  },
  tvLocationDisabled: {
    color: "#999",
  },
  statusTextDisabled: {
    color: "#999",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  emptyTvList: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTvText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },

  // Styles pour la modal de durée
  durationModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "85%",
    maxHeight: "70%",
  },
  durationList: {
    maxHeight: 400,
  },
  durationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedDurationOption: {
    backgroundColor: "#f0f8ff",
  },
  durationOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationOptionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  selectedDurationText: {
    color: "#2575fc",
    fontWeight: "600",
  },
});
