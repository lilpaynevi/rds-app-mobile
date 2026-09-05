// components/CustomTimePicker.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardAwareView from "../KeyboardAwareView";

const { height } = Dimensions.get("window");

const MINUTES_IN_DAY = 24 * 60;

const PRESET_GROUPS = [
  {
    label: "Matin",
    icon: "sunny-outline",
    presets: [
      { label: "06:00", hour: 6, minute: 0 },
      { label: "08:00", hour: 8, minute: 0 },
      { label: "09:00", hour: 9, minute: 0 },
    ],
  },
  {
    label: "Midi",
    icon: "restaurant-outline",
    presets: [
      { label: "12:00", hour: 12, minute: 0 },
      { label: "13:00", hour: 13, minute: 0 },
      { label: "14:00", hour: 14, minute: 0 },
    ],
  },
  {
    label: "Soir",
    icon: "moon-outline",
    presets: [
      { label: "18:00", hour: 18, minute: 0 },
      { label: "20:00", hour: 20, minute: 0 },
      { label: "22:00", hour: 22, minute: 0 },
    ],
  },
];

const RELATIVE_OFFSETS = [
  { label: "-1h", minutes: -60 },
  { label: "-30 min", minutes: -30 },
  { label: "-15 min", minutes: -15 },
  { label: "+15 min", minutes: 15 },
  { label: "+30 min", minutes: 30 },
  { label: "+1h", minutes: 60 },
];

const pad2 = (value: number) => value.toString().padStart(2, "0");

const parseTime = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
};

const toMinutes = (hour: number, minute: number) => hour * 60 + minute;

const fromMinutes = (totalMinutes: number) => {
  const normalized =
    ((totalMinutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return { hour: Math.floor(normalized / 60), minute: normalized % 60 };
};

const CustomTimePicker = ({
  visible,
  onClose,
  onConfirm,
  initialTime = "08:00",
  title = "Sélectionner l'heure",
  confirmText = "Confirmer",
  cancelText = "Annuler",
}) => {
  const [hourText, setHourText] = useState("08");
  const [minuteText, setMinuteText] = useState("00");
  const [slideAnim] = useState(new Animated.Value(height));

  // Barre de navigation Android (et barre d'accueil iOS). Depuis le passage en
  // affichage bord à bord, la feuille se dessine DERRIÈRE elle : avec la seule
  // marge fixe de 20, les boutons « Annuler » et « Confirmer » se retrouvaient
  // recouverts par les trois boutons système et devenaient inatteignables.
  const insets = useSafeAreaInsets();

  const minuteInputRef = useRef<TextInput>(null);

  // Référence figée sur la valeur d'ouverture, pour les suggestions relatives
  const baseTimeRef = useRef(parseTime(initialTime));

  useEffect(() => {
    if (visible) {
      const { hour, minute } = parseTime(initialTime);
      baseTimeRef.current = { hour, minute };
      setHourText(pad2(hour));
      setMinuteText(pad2(minute));

      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, initialTime]);

  const selectedHour = Math.min(23, Math.max(0, parseInt(hourText, 10) || 0));
  const selectedMinute = Math.min(
    59,
    Math.max(0, parseInt(minuteText, 10) || 0),
  );

  const handleHourChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 2);
    setHourText(digits);
    if (digits.length === 2) {
      minuteInputRef.current?.focus();
    }
  };

  const handleHourBlur = () => {
    setHourText(pad2(selectedHour));
  };

  const handleMinuteChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 2);
    setMinuteText(digits);
    if (digits.length === 2) {
      Keyboard.dismiss();
    }
  };

  const handleMinuteBlur = () => {
    setMinuteText(pad2(selectedMinute));
  };

  const applyTime = (hour: number, minute: number) => {
    setHourText(pad2(hour));
    setMinuteText(pad2(minute));
  };

  const stepHour = (delta: number) => {
    const { hour } = fromMinutes(
      toMinutes(selectedHour + delta, selectedMinute),
    );
    applyTime(hour, selectedMinute);
  };

  const stepMinute = (delta: number) => {
    const { hour, minute } = fromMinutes(
      toMinutes(selectedHour, selectedMinute) + delta,
    );
    applyTime(hour, minute);
  };

  const setNow = () => {
    const now = new Date();
    applyTime(now.getHours(), now.getMinutes());
  };

  const applyRelativeOffset = (deltaMinutes: number) => {
    const base = baseTimeRef.current;
    const { hour, minute } = fromMinutes(
      toMinutes(base.hour, base.minute) + deltaMinutes,
    );
    applyTime(hour, minute);
  };

  const handleConfirm = () => {
    onConfirm(`${pad2(selectedHour)}:${pad2(selectedMinute)}`);
    onClose();
  };

  const baseTimeLabel = `${pad2(baseTimeRef.current.hour)}:${pad2(baseTimeRef.current.minute)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAwareView style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurView} />

        {/* Capteur d'appui dédié, DERRIÈRE la feuille : envelopper la feuille
            entière dans un TouchableWithoutFeedback lui faisait intercepter les
            gestes de la zone défilante. */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.backdropCatcher} />
        </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.modalContainer,
              // La marge basse doit au moins dégager la barre système.
              { paddingBottom: Math.max(insets.bottom, 20) },
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Zone défilante : le contenu dépasse la hauteur maximale de la
                feuille sur un écran compact. Les boutons d'action restent en
                dehors, pour être toujours atteignables. */}
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
            {/* Saisie directe de l'heure */}
            <View style={styles.timeInputSection}>
              <View style={styles.timeInputGroup}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => stepHour(1)}
                >
                  <Ionicons name="chevron-up" size={20} color="#2575fc" />
                </TouchableOpacity>
                <TextInput
                  style={styles.timeInputBox}
                  value={hourText}
                  onChangeText={handleHourChange}
                  onBlur={handleHourBlur}
                  onFocus={() => setHourText("")}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => stepHour(-1)}
                >
                  <Ionicons name="chevron-down" size={20} color="#2575fc" />
                </TouchableOpacity>
                <Text style={styles.timeInputLabel}>Heures</Text>
              </View>

              <Text style={styles.separatorText}>:</Text>

              <View style={styles.timeInputGroup}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => stepMinute(5)}
                >
                  <Ionicons name="chevron-up" size={20} color="#2575fc" />
                </TouchableOpacity>
                <TextInput
                  ref={minuteInputRef}
                  style={styles.timeInputBox}
                  value={minuteText}
                  onChangeText={handleMinuteChange}
                  onBlur={handleMinuteBlur}
                  onFocus={() => setMinuteText("")}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => stepMinute(-5)}
                >
                  <Ionicons name="chevron-down" size={20} color="#2575fc" />
                </TouchableOpacity>
                <Text style={styles.timeInputLabel}>Minutes</Text>
              </View>

              <TouchableOpacity style={styles.nowButton} onPress={setNow}>
                <Ionicons name="time-outline" size={16} color="#2575fc" />
                <Text style={styles.nowButtonText}>Maintenant</Text>
              </TouchableOpacity>
            </View>

            {/* Suggestions basées sur l'heure existante */}
            <View style={styles.relativeContainer}>
              <Text style={styles.relativeTitle}>
                Ajuster depuis {baseTimeLabel}
              </Text>
              <View style={styles.relativeRow}>
                {RELATIVE_OFFSETS.map((offset) => (
                  <TouchableOpacity
                    key={offset.label}
                    style={styles.relativeChip}
                    onPress={() => applyRelativeOffset(offset.minutes)}
                  >
                    <Text style={styles.relativeChipText}>{offset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Raccourcis */}
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsTitle}>Raccourcis</Text>
              {PRESET_GROUPS.map((group) => (
                <View key={group.label} style={styles.presetGroup}>
                  <View style={styles.presetGroupHeader}>
                    <Ionicons name={group.icon as any} size={14} color="#999" />
                    <Text style={styles.presetGroupLabel}>{group.label}</Text>
                  </View>
                  <View style={styles.presetButtons}>
                    {group.presets.map((preset) => {
                      const active =
                        selectedHour === preset.hour &&
                        selectedMinute === preset.minute;
                      return (
                        <TouchableOpacity
                          key={preset.label}
                          style={[
                            styles.presetButton,
                            active && styles.activePreset,
                          ]}
                          onPress={() => applyTime(preset.hour, preset.minute)}
                        >
                          <Text
                            style={[
                              styles.presetButtonText,
                              active && styles.activePresetText,
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
            </ScrollView>

            {/* Boutons d'action — hors de la zone défilante, donc toujours
                visibles quelle que soit la hauteur de l'écran. */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
      </KeyboardAwareView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  blurView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropCatcher: {
    ...StyleSheet.absoluteFillObject,
  },
  // `flexShrink` est la clé : sans lui, la zone garde la hauteur de son contenu
  // et déborde de `maxHeight` au lieu de se comprimer, ce qui rejetait le pied
  // hors de l'écran.
  scrollBody: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    // `paddingBottom` est posé à l'affichage, à partir de l'inset système.
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  placeholder: {
    width: 40,
  },

  // ── Saisie directe ──
  timeInputSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 14,
  },
  timeInputGroup: {
    alignItems: "center",
  },
  timeInputBox: {
    width: 84,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E3F2FD",
    backgroundColor: "#F8F9FA",
    fontSize: 32,
    fontWeight: "700",
    color: "#2575fc",
    fontFamily: "monospace",
    textAlign: "center",
    paddingVertical: 0,
  },
  stepperButton: {
    paddingVertical: 4,
  },
  timeInputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
    marginTop: 6,
  },
  separatorText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2575fc",
    marginTop: -20,
  },
  nowButton: {
    position: "absolute",
    top: 0,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  nowButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2575fc",
  },

  // ── Suggestions relatives ──
  relativeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  relativeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginBottom: 10,
  },
  relativeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  relativeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  relativeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },

  // ── Raccourcis ──
  presetsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  presetGroup: {
    marginBottom: 10,
  },
  presetGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  presetGroupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  presetButtons: {
    flexDirection: "row",
    gap: 10,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  activePreset: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2575fc",
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activePresetText: {
    color: "#2575fc",
    fontWeight: "600",
  },

  // ── Boutons d'action ──
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    // Séparé visuellement du contenu qui défile en dessous de lui
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  confirmButton: {
    backgroundColor: "#2575fc",
    shadowColor: "#2575fc",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default CustomTimePicker;
