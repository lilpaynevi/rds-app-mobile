import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import api from "@/scripts/fetch.api";

const { width, height } = Dimensions.get("window");

interface EditTvModalProps {
  visible: boolean;
  data: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

const EditTvModal: React.FC<EditTvModalProps> = ({
  visible,
  data,
  onClose,
  onSave,
}) => {
  // États pour les champs du formulaire
  const [formData, setFormData] = useState({
    id: data?.id || "",
    name: data?.name || "",
    description: data?.description || "",
    resolution: data?.resolution || "HD_1080P",
    orientation: data?.orientation || "LANDSCAPE",
    volume: data?.volume || 50,
    autoPlay: data?.autoPlay || false,
    loop: data?.loop || false,
    transition: data?.transition || "FADE",
    refreshRate: data?.refreshRate || 30,
  });

  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Options pour les listes déroulantes
  const resolutionOptions = [
    { label: "HD 720p", value: "HD_720P" },
    { label: "Full HD 1080p", value: "HD_1080P" },
    { label: "4K Ultra HD", value: "4K" },
    { label: "8K", value: "8K" },
  ];

  const orientationOptions = [
    { label: "Paysage", value: "LANDSCAPE" },
    { label: "Portrait", value: "PORTRAIT" },
  ];

  const transitionOptions = [
    { label: "Fondu", value: "FADE" },
    { label: "Glissement", value: "SLIDE" },
    { label: "Zoom", value: "ZOOM" },
    { label: "Aucune", value: "NONE" },
  ];

  const refreshRateOptions = [
    { label: "24 Hz", value: 24 },
    { label: "30 Hz", value: 30 },
    { label: "60 Hz", value: 60 },
    { label: "120 Hz", value: 120 },
  ];

  // Animation d'entrée du modal
  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert("Erreur", "Le nom de la télévision est requis");
      return;
    }

    // if (!formData.location.trim()) {
    //   Alert.alert("Erreur", "La localisation est requise");
    //   return;
    // }

    setIsLoading(true);

    try {
      // Simulation d'appel API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await api.patch("/televisions/" + formData.id, formData);

      const updatedData = {
        ...data,
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      onSave(updatedData);
      Alert.alert("Succès", "Télévision mise à jour avec succès");
      onClose();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour la télévision");
    } finally {
      setIsLoading(false);
    }
  };

  const VolumeSlider = () => {
    const [localVolume, setLocalVolume] = useState(formData.volume);

    return (
      <View style={styles.volumeContainer}>
        <View style={styles.volumeHeader}>
          <MaterialIcons name="volume-up" size={20} color="#6B7280" />
          <Text style={styles.volumeLabel}>Volume: {localVolume}%</Text>
        </View>
        <View style={styles.volumeSlider}>
          <TouchableOpacity
            style={styles.volumeTrack}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              const percentage = Math.round((locationX / 200) * 100);
              const clampedVolume = Math.max(0, Math.min(100, percentage));
              setLocalVolume(clampedVolume);
              updateField("volume", clampedVolume);
            }}
          >
            <View
              style={[styles.volumeProgress, { width: `${localVolume}%` }]}
            />
            <View style={[styles.volumeThumb, { left: `${localVolume}%` }]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const OptionSelector = ({
    title,
    options,
    value,
    onSelect,
    icon,
  }: {
    title: string;
    options: Array<{ label: string; value: any }>;
    value: any;
    onSelect: (value: any) => void;
    icon: string;
  }) => (
    <View style={styles.selectorContainer}>
      <View style={styles.selectorHeader}>
        <MaterialIcons name={icon as any} size={20} color="#6B7280" />
        <Text style={styles.selectorTitle}>{title}</Text>
      </View>
      <View style={styles.optionsGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              value === option.value && styles.optionButtonActive,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                value === option.value && styles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={50} style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header du modal */}
          <LinearGradient
            colors={["#3B82F6", "#1D4ED8"]}
            style={styles.modalHeader}
          >
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Modifier la télévision</Text>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled,
              ]}
            >
              {isLoading ? (
                <MaterialIcons name="hourglass-empty" size={20} color="white" />
              ) : (
                <MaterialIcons name="check" size={20} color="white" />
              )}
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Informations de base */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info-outline" size={24} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Informations générales</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de la télévision *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => updateField("name", text)}
                  placeholder="Ex: Samsung TV Salon"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Localisation *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.location}
                  onChangeText={(text) => updateField("location", text)}
                  placeholder="Ex: Salon principal"
                  placeholderTextColor="#9CA3AF"
                />
              </View> */}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => updateField("description", text)}
                  placeholder="Description optionnelle..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Paramètres d'affichage */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="monitor"
                  size={24}
                  color="#10B981"
                />
                <Text style={styles.sectionTitle}>Paramètres d'affichage</Text>
              </View>

              <OptionSelector
                title="Résolution"
                options={resolutionOptions}
                value={formData.resolution}
                onSelect={(value) => updateField("resolution", value)}
                icon="high-definition"
              />

              <OptionSelector
                title="Orientation"
                options={orientationOptions}
                value={formData.orientation}
                onSelect={(value) => updateField("orientation", value)}
                icon="screen-rotation"
              />

              <OptionSelector
                title="Type de transition"
                options={transitionOptions}
                value={formData.transition}
                onSelect={(value) => updateField("transition", value)}
                icon="transition"
              />

              <OptionSelector
                title="Taux de rafraîchissement"
                options={refreshRateOptions}
                value={formData.refreshRate}
                onSelect={(value) => updateField("refreshRate", value)}
                icon="refresh"
              />
            </View>

            {/* Paramètres de lecture */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="play-circle-outline"
                  size={24}
                  color="#8B5CF6"
                />
                <Text style={styles.sectionTitle}>Paramètres de lecture</Text>
              </View>

              <VolumeSlider />

              <View style={styles.switchContainer}>
                <View style={styles.switchInfo}>
                  <MaterialIcons name="play-arrow" size={20} color="#6B7280" />
                  <View style={styles.switchLabels}>
                    <Text style={styles.switchLabel}>Lecture automatique</Text>
                    <Text style={styles.switchDescription}>
                      Démarre automatiquement la lecture
                    </Text>
                  </View>
                </View>
                <Switch
                  value={formData.autoPlay}
                  onValueChange={(value) => updateField("autoPlay", value)}
                  trackColor={{ false: "#E5E7EB", true: "#DBEAFE" }}
                  thumbColor={formData.autoPlay ? "#3B82F6" : "#9CA3AF"}
                />
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchInfo}>
                  <MaterialIcons name="loop" size={20} color="#6B7280" />
                  <View style={styles.switchLabels}>
                    <Text style={styles.switchLabel}>Lecture en boucle</Text>
                    <Text style={styles.switchDescription}>
                      Répète la lecture indéfiniment
                    </Text>
                  </View>
                </View>
                <Switch
                  value={formData.loop}
                  onValueChange={(value) => updateField("loop", value)}
                  trackColor={{ false: "#E5E7EB", true: "#DBEAFE" }}
                  thumbColor={formData.loop ? "#3B82F6" : "#9CA3AF"}
                />
              </View>
            </View>

            {/* Résumé des modifications */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="preview" size={24} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Résumé</Text>
              </View>

              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Device ID:</Text>
                  <Text style={styles.summaryValue}>{data?.deviceId}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Code de connexion:</Text>
                  <Text style={styles.summaryValue}>
                    {data?.codeConnection}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Statut actuel:</Text>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            data?.status === "ONLINE" ? "#10B981" : "#EF4444",
                        },
                      ]}
                    />
                    <Text style={styles.summaryValue}>{data?.status}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Espacement en bas */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    minHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  saveButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionButtonActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#3B82F6",
  },
  optionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  optionTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  volumeContainer: {
    marginBottom: 20,
  },
  volumeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  volumeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  volumeSlider: {
    paddingHorizontal: 16,
  },
  volumeTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    position: "relative",
    width: 200,
  },
  volumeProgress: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 3,
  },
  volumeThumb: {
    position: "absolute",
    width: 16,
    height: 16,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    top: -5,
    marginLeft: -8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  switchLabels: {
    marginLeft: 12,
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  switchDescription: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  summaryContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default EditTvModal;
