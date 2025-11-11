import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Platform, Text, TouchableOpacity } from "react-native";
import { View } from "react-native";
import CustomTimePicker from "./customeTimePicker";

const DAYS_OF_WEEK = [
  { id: 0, name: "Dimanche", short: "Dim" },
  { id: 1, name: "Lundi", short: "Lun" },
  { id: 2, name: "Mardi", short: "Mar" },
  { id: 3, name: "Mercredi", short: "Mer" },
  { id: 4, name: "Jeudi", short: "Jeu" },
  { id: 5, name: "Vendredi", short: "Ven" },
  { id: 6, name: "Samedi", short: "Sam" },
];

export default function ScheduleForm({
  onSave,
  values,
}: {
  onSave: (data: any) => void;
  values?: any;
}) {
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  console.log("🚀 ~ ScheduleForm ~ daysOfWeek:", daysOfWeek)

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (values) {
      setDaysOfWeek(values.daysOfWeek);
      setStartTime(values.startTime);
      setEndTime(values.endTime);
    }
  }, [values]);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });

  const [endDate, setEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  });

  const toggleDay = async (dayId:any) => {
    const newDaysOfWeek = daysOfWeek.includes(dayId)
      ? daysOfWeek.filter((id) => id !== dayId)
      : [...daysOfWeek, dayId].sort();

    setDaysOfWeek(newDaysOfWeek);

    setTimeout(() => {
      onSave({
        daysOfWeek: newDaysOfWeek,
      });
    }, 1000);
  };

  const calculateDailyDuration = (start, end) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const diffMinutes = endMinutes - startMinutes;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const validateSchedule = () => {
    if (endDate <= startDate) return false;
    if (startTime >= endTime) return false;
    if (daysOfWeek.length === 0) return false;
    return true;
  };

  const formatTimeFromDate = (date) => {
    return date.toTimeString().slice(0, 5);
  };

  const createTimeFromString = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  };

  const handlePressShowStartTimePicker = () => {
    console.log("Start time pressed"); // Debug
    setShowStartTimePicker(true);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar" size={20} color="#1B2845" />
        <Text style={styles.sectionTitle}>Programmation</Text>
      </View>

      {/* Période d'activité */}
      {/* <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>📅 Période d'activité</Text>

        <View style={styles.dateRangeContainer}>
          <View style={styles.dateRangeItem}>
            <Text style={styles.dateLabel}>Du</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#2575fc" />
              <Text style={styles.dateText}>
                {startDate.toLocaleDateString("fr-FR")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateRangeItem}>
            <Text style={styles.dateLabel}>Au</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                endDate <= startDate && styles.dateButtonError,
              ]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={endDate <= startDate ? "#ff4444" : "#ff6b35"}
              />
              <Text
                style={[
                  styles.dateText,
                  endDate <= startDate && styles.dateTextError,
                ]}
              >
                {endDate.toLocaleDateString("fr-FR")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {endDate <= startDate && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={14} color="#ff4444" />
            <Text style={styles.errorText}>
              La date de fin doit être postérieure à la date de début
            </Text>
          </View>
        )}
      </View> */}

      {/* Jours de la semaine */}
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>📆 Jours de diffusion</Text>

        <View style={styles.daysContainer}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayButton,
                daysOfWeek?.includes(day.id) && styles.dayButtonSelected,
              ]}
              onPress={() => toggleDay(day.id)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  daysOfWeek?.includes(day.id) && styles.dayButtonTextSelected,
                ]}
              >
                {day.short}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickSelectContainer}>
          <TouchableOpacity
            style={styles.quickSelectButton}
            onPress={() => {
              setDaysOfWeek([1, 2, 3, 4, 5]);
              onSave({
                daysOfWeek: [1, 2, 3, 4, 5],
              });
            }}
          >
            <Text style={styles.quickSelectText}>Semaine</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickSelectButton}
            onPress={() => {
              setDaysOfWeek([0, 6]);
              onSave({
                daysOfWeek: [0, 6],
              });
            }}
          >
            <Text style={styles.quickSelectText}>Weekend</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickSelectButton}
            onPress={() => {
              setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
              onSave({
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              });
            }}
          >
            <Text style={styles.quickSelectText}>Tous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickSelectButton}
            onPress={() => {
              setDaysOfWeek([]);
              onSave({
                daysOfWeek: [],
              });
            }}
          >
            <Text style={styles.quickSelectText}>Aucun</Text>
          </TouchableOpacity>
        </View>

        {daysOfWeek.length === 0 && (
          <View style={styles.warningContainer}>
            <Ionicons name="information-circle" size={14} color="#ff9800" />
            <Text style={styles.warningText}>
              Sélectionnez au moins un jour de diffusion
            </Text>
          </View>
        )}
      </View>

      {/* Horaires de diffusion */}
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>⏰ Horaires de diffusion</Text>

        <View style={styles.timeContainer}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Heure de début</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={handlePressShowStartTimePicker}
            >
              <Ionicons name="time-outline" size={16} color="#2575fc" />
              <Text style={styles.timeText}>{startTime}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Heure de fin</Text>
            <TouchableOpacity
              style={[
                styles.timeButton,
                startTime >= endTime && styles.timeButtonError,
              ]}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={startTime >= endTime ? "#ff4444" : "#ff6b35"}
              />
              <Text
                style={[
                  styles.timeText,
                  startTime >= endTime && styles.timeTextError,
                ]}
              >
                {endTime}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timePresets}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              setStartTime("08:00");
              setEndTime("18:00");

              onSave({
                startTime: "08:00",
                endTime: "18:00",
              });
            }}
          >
            <Text style={styles.presetText}>Journée (8h-18h)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              setStartTime("12:00");
              setEndTime("14:00");

              onSave({
                startTime: "12:00",
                endTime: "14:00",
              });
            }}
          >
            <Text style={styles.presetText}>Midi (12h-14h)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              setStartTime("18:00");
              setEndTime("22:00");

              onSave({
                startTime: "18:00",
                endTime: "22:00",
              });
            }}
          >
            <Text style={styles.presetText}>Soirée (18h-22h)</Text>
          </TouchableOpacity>
        </View>

        {startTime >= endTime && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={14} color="#ff4444" />
            <Text style={styles.errorText}>
              L'heure de fin doit être postérieure à l'heure de début
            </Text>
          </View>
        )}

        {/* Durée quotidienne calculée */}
        {startTime < endTime && (
          <View style={styles.durationInfo}>
            <Ionicons name="time" size={14} color="#4CAF50" />
            <Text style={styles.durationInfoText}>
              Durée quotidienne: {calculateDailyDuration(startTime, endTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Modals */}
      <CustomTimePicker
        visible={showStartTimePicker}
        onClose={() => setShowStartTimePicker(false)}
        onConfirm={(time: string) => {
          setStartTime(time);
          onSave({
            startTime: time,
          });
        }}
        initialTime={startTime}
        title="Heure de début"
      />

      <CustomTimePicker
        visible={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        onConfirm={(time: string) => {
          setEndTime(time);
          onSave({
            endTime: time,
          });
        }}
        initialTime={endTime}
        title="Heure de fin"
      />
    </View>
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
