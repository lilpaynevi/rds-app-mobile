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
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { getMyTVs } from "@/requests/tv.requests";
import { createPlaylist } from "@/requests/playlists.requests";
import { socket } from "@/scripts/socket.io";
import { LinearGradient } from "expo-linear-gradient";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import ScheduleForm from "@/components/schedules/SchelduleForm";
import AddMediaForm from "@/components/medias/AddMediaForm";

export default function AddPlaylistScreen() {
  // États du formulaire
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

  const [showDurationSelector, setShowDurationSelector] = useState(false);

  const [scheduleData, setScheduleData] = useState<any>({});

  const fetchTVs = async () => {
    const TV = await getMyTVs();
    setTV(TV);
  };

  const onDateChange = (event: any, selectedDate: any) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(launchDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setLaunchDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime: any) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(launchDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setLaunchDate(newDate);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Veuillez saisir un titre pour la playlist");
      return;
    }

    if (!selectedTV) {
      Alert.alert("Erreur", "Veuillez sélectionner une télévision");
      return;
    }

    if (selectedMedia.length === 0) {
      Alert.alert("Erreur", "Veuillez ajouter au moins un média");
      return;
    }

    Alert.alert("Confirmation", "Voulez-vous créer cette playlist ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        onPress: async () => {
          try {
            setIsSaving(true);

            const playlistData = {
              titre: title.trim(),
              items: selectedMedia,
              television: selectedTV.id,
              launch_date: launchDate.toISOString(),
              endDate: scheduleData.endDate,
              startTime: scheduleData.startTime,
              endTime: scheduleData.endTime,
              daysOfWeek: scheduleData.daysOfWeek,
              isActive,
            };
            console.log("🚀 ~ handleSave ~ playlistData:", playlistData);

            const response = await createPlaylist(playlistData);

            if (response && selectedTV.status) {
              socket.emit("playlist_created", {
                tv_id: selectedTV.id,
                playlist: response,
              });
            }

            Alert.alert("🎉 Succès", "Playlist créée avec succès!");
            router.replace("/home");
          } catch (error) {
            console.error("❌ Erreur création:", error);
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  };

  const getTotalDuration = () => {
    return selectedMedia.reduce((total, media) => total + media.duration, 0);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  useEffect(() => {
    fetchTVs();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {isSaving && (
        <Modal visible={isSaving} transparent={true} animationType="fade">
          <View style={styles.savingOverlay}>
            <View style={styles.savingContainer}>
              <ActivityIndicator size="large" color="#2575fc" />
              <Text style={styles.savingText}>
                Création de la playlist en cours...
              </Text>
              <Text style={styles.savingSubtext}>Veuillez patienter</Text>
            </View>
          </View>
        </Modal>
      )}

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={["#2575fc", "#6a11cb"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nouvelle playlist</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Titre */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="text" size={20} color="#1B2845" />
              <Text style={styles.sectionTitle}>Titre de la playlist</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nom de votre playlist"
              placeholderTextColor="#999"
            />
          </View>

          {/* Sélection Médias */}
          <AddMediaForm
            onSave={(data) => {
              console.log(data);

              setSelectedMedia(data)
            }}
            medias={selectedMedia}
          />

          {/* Sélection TV */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="tv" size={20} color="#1B2845" />
              <Text style={styles.sectionTitle}>Télévision</Text>
            </View>
            <TouchableOpacity
              style={styles.tvSelector}
              onPress={() => setShowTVSelector(true)}
            >
              <View style={styles.tvSelectorContent}>
                <Text
                  style={
                    selectedTV ? styles.tvSelectorText : styles.tvPlaceholder
                  }
                >
                  {selectedTV ? selectedTV.name : "Sélectionner une télévision"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Sélection TV */}
          <ScheduleForm
            onSave={(data) => {
              console.log("🚀 ~ data:", {
                ...scheduleData,
                ...data,
              });
              setScheduleData({
                ...scheduleData,
                ...data,
              });
            }}
          />

          {/* Section Status */}
          <View style={styles.section}>
            <View style={styles.statusContainer}>
              <View style={styles.statusInfo}>
                <Ionicons
                  name={isActive ? "play-circle" : "pause-circle"}
                  size={20}
                  color={isActive ? "#4CAF50" : "#FF6B35"}
                />
                <Text style={styles.statusLabel}>
                  {isActive ? "Activer immédiatement" : "Garder en brouillon"}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: "#e0e0e0", true: "#2575fc30" }}
                thumbColor={isActive ? "#2575fc" : "#999"}
              />
            </View>
          </View>

          {/* Résumé */}
          {selectedMedia.length > 0 && selectedTV && (
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>📋 Résumé</Text>

              <View style={styles.summaryItem}>
                <Ionicons name="tv" size={18} color="#1B2845" />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>Télévision:</Text>{" "}
                  {selectedTV.name}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="calendar" size={18} color="#1B2845" />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>Date:</Text>{" "}
                  {launchDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  à{" "}
                  {launchDate.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="images" size={18} color="#1B2845" />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>Médias:</Text>{" "}
                  {selectedMedia.length} élément(s)
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Ionicons name="time" size={18} color="#1B2845" />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>Durée totale:</Text>{" "}
                  {formatDuration(getTotalDuration())}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bouton de sauvegarde */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!title.trim() ||
              !selectedTV ||
              selectedMedia.length === 0 ||
              isSaving) &&
              styles.disabledSaveButton,
          ]}
          onPress={handleSave}
          disabled={
            !title.trim() ||
            !selectedTV ||
            selectedMedia.length === 0 ||
            isSaving
          }
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <LinearGradient
              colors={["#2575fc", "#6a11cb"]}
              style={styles.saveButtonGradient}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Créer la playlist</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal sélection TV */}
      <Modal
        visible={showTVSelector}
        animationType="slide"
        onRequestClose={() => setShowTVSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une télévision</Text>
            <TouchableOpacity
              onPress={() => setShowTVSelector(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <FlatList
              data={televisions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.tvItem,
                    selectedTV?.id === item.id && styles.selectedTVItem,
                  ]}
                  onPress={() => {
                    setSelectedTV(item);
                    setShowTVSelector(false);
                  }}
                >
                  <View style={styles.tvInfo}>
                    <Text style={styles.tvName}>{item.name}</Text>
                    <View style={styles.tvStatus}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: item.status
                              ? "#4CAF50"
                              : "#f44336",
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          !item.status && styles.statusTextDisabled,
                        ]}
                      >
                        {item.status ? "En ligne" : "Hors ligne"}
                      </Text>
                    </View>
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
            />
          </View>
        </View>
      </Modal>

      {/* DateTimePickers */}
      {showDatePicker && (
        <DateTimePicker
          value={launchDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
          minimumDate={new Date()}
          textColor="#1B2845"
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={launchDate}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onTimeChange}
          textColor="#1B2845"
        />
      )}
    </SafeAreaView>
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
    justifyContent: "between",
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
