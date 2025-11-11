import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  StyleSheet,
  Dimensions,
  TextInput,
} from "react-native";

const { width } = Dimensions.get("window");

const DURATION_OPTIONS = [
  { label: "5 secondes", value: 5 },
  { label: "10 secondes", value: 10 },
  { label: "15 secondes", value: 15 },
  { label: "20 secondes", value: 20 },
  { label: "30 secondes", value: 30 },
  { label: "45 secondes", value: 45 },
  { label: "60 secondes", value: 60 },
  { label: "90 secondes", value: 90 },
  { label: "2 minutes", value: 120 },
  { label: "3 minutes", value: 180 },
];

export default function DurationModal({
  visible,
  onClose,
  onSelect,
  currentDuration = 10000, // En millisecondes
  mediaTitle = "",
  returnInMilliseconds = true, // Nouveau prop
}) {
  // Conversion millisecondes → secondes
  const initialSeconds = Math.round(currentDuration / 1000);
  const [selectedDuration, setSelectedDuration] = useState(initialSeconds);
  const [customDuration, setCustomDuration] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (visible) {
      const seconds = Math.round(currentDuration / 1000);
      setSelectedDuration(seconds);
      setCustomDuration("");
      setShowCustomInput(false);
    }
  }, [visible, currentDuration]);

  const handleSelect = (durationInSeconds) => {
    setSelectedDuration(durationInSeconds);
    
    // Retourner en millisecondes ou secondes selon le besoin
    const valueToReturn = returnInMilliseconds 
      ? durationInSeconds * 1000 
      : durationInSeconds;
    
    if (onSelect) {
      onSelect(valueToReturn);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCustomDuration = () => {
    const seconds = parseInt(customDuration);
    if (!isNaN(seconds) && seconds > 0 && seconds <= 600) {
      handleSelect(seconds);
    } else {
      alert("Veuillez entrer une durée entre 1 et 600 secondes");
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.durationModalContainer}>
          {/* Header */}
          <View style={styles.durationModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.durationModalTitle}>
                Durée d'affichage
              </Text>
              {mediaTitle ? (
                <Text style={styles.mediaTitle} numberOfLines={1}>
                  {mediaTitle}
                </Text>
              ) : null}
              <Text style={styles.currentDurationText}>
                Actuellement : {formatDuration(selectedDuration)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.durationModalContent}>
            <FlatList
              data={DURATION_OPTIONS}
              keyExtractor={(item) => item.value.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedDuration === item.value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.durationOption,
                      isSelected && styles.selectedDurationOption,
                    ]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.durationOptionContent}>
                      <View
                        style={[
                          styles.iconContainer,
                          isSelected && styles.iconContainerSelected,
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color={isSelected ? "#2575fc" : "#666"}
                        />
                      </View>
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
                      <View style={styles.checkmarkContainer}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#2575fc"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Custom Duration */}
            <TouchableOpacity
              style={styles.customDurationButton}
              onPress={() => setShowCustomInput(!showCustomInput)}
            >
              <Ionicons name="create-outline" size={20} color="#2575fc" />
              <Text style={styles.customDurationButtonText}>
                Durée personnalisée
              </Text>
            </TouchableOpacity>

            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Ex: 45"
                  keyboardType="numeric"
                  value={customDuration}
                  onChangeText={setCustomDuration}
                  maxLength={3}
                />
                <Text style={styles.customInputLabel}>secondes</Text>
                <TouchableOpacity
                  style={styles.customInputButton}
                  onPress={handleCustomDuration}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer info */}
          <View style={styles.durationModalFooter}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.footerText}>
              La durée s'applique uniquement aux images et PDFs
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  durationModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: 600,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  durationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#f8f9fa",
  },
  durationModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B2845",
  },
  mediaTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  currentDurationText: {
    fontSize: 12,
    color: "#2575fc",
    marginTop: 4,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  durationModalContent: {
    maxHeight: 400,
  },
  durationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  selectedDurationOption: {
    backgroundColor: "#e3f2fd",
  },
  durationOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: "#cce7ff",
  },
  durationOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  selectedDurationText: {
    color: "#2575fc",
    fontWeight: "600",
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  customDurationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#f8f9fa",
  },
  customDurationButtonText: {
    fontSize: 16,
    color: "#2575fc",
    fontWeight: "500",
    marginLeft: 8,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  customInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    width: 80,
    textAlign: "center",
  },
  customInputLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    marginRight: 12,
  },
  customInputButton: {
    backgroundColor: "#2575fc",
    borderRadius: 8,
    padding: 10,
  },
  durationModalFooter: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footerText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
    fontStyle: "italic",
  },
});
