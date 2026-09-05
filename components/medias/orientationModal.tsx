import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export type MediaOrientation = "AUTO" | "LANDSCAPE" | "PORTRAIT";

const ORIENTATION_OPTIONS: {
  value: MediaOrientation;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "AUTO",
    label: "Automatique",
    description:
      "La TV détecte l'orientation du fichier et l'affiche sans déformation.",
    icon: "sparkles-outline",
  },
  {
    value: "LANDSCAPE",
    label: "Paysage",
    description: "Un média portrait sera pivoté de 90° pour rester à l'endroit.",
    icon: "tablet-landscape-outline",
  },
  {
    value: "PORTRAIT",
    label: "Portrait",
    description: "Un média paysage sera pivoté de 90° pour rester à l'endroit.",
    icon: "tablet-portrait-outline",
  },
];

export default function OrientationModal({
  visible,
  onClose,
  onSelect,
  currentOrientation = "AUTO",
  mediaTitle = "",
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (orientation: MediaOrientation) => void;
  currentOrientation?: MediaOrientation;
  mediaTitle?: string;
}) {
  const [selected, setSelected] = useState<MediaOrientation>(currentOrientation);

  useEffect(() => {
    if (visible) setSelected(currentOrientation);
  }, [visible, currentOrientation]);

  const handleSelect = (orientation: MediaOrientation) => {
    setSelected(orientation);
    onSelect?.(orientation);
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Orientation à l'affichage</Text>
              {mediaTitle ? (
                <Text style={styles.mediaTitle} numberOfLines={1}>
                  {mediaTitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View>
            {ORIENTATION_OPTIONS.map((option) => {
              const isSelected = selected === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      isSelected && styles.iconContainerSelected,
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? "#2575fc" : "#666"}
                    />
                  </View>

                  <View style={styles.optionTexts}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>

                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#2575fc"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.footerText}>
              Ce réglage ne vaut que pour cette playlist
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
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B2845",
  },
  mediaTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
    gap: 12,
  },
  optionSelected: {
    backgroundColor: "#e3f2fd",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerSelected: {
    backgroundColor: "#cce7ff",
  },
  optionTexts: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: "#2575fc",
    fontWeight: "600",
  },
  optionDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    lineHeight: 17,
  },
  footer: {
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
