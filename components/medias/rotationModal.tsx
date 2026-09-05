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

/** Seules valeurs acceptées par le serveur. */
export type MediaRotation = 0 | 90 | 180 | 270;

const normalize = (value: number): MediaRotation =>
  ((((Math.round(value) % 360) + 360) % 360) as MediaRotation);

export default function RotationModal({
  visible,
  onClose,
  onSelect,
  currentRotation = 0,
  mediaTitle = "",
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (rotation: MediaRotation) => void;
  currentRotation?: number;
  mediaTitle?: string;
}) {
  const [angle, setAngle] = useState<MediaRotation>(0);

  useEffect(() => {
    if (visible) setAngle(normalize(currentRotation));
  }, [visible, currentRotation]);

  // Aperçu : un rectangle paysage pivoté du même angle que le média le sera.
  const previewRotation = `${angle}deg`;
  const isSideways = angle === 90 || angle === 270;

  const step = (delta: number) => setAngle(normalize(angle + delta));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Pivoter le média</Text>
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

          {/* Aperçu de l'angle courant */}
          <View style={styles.previewZone}>
            <View
              style={[
                styles.previewFrame,
                { transform: [{ rotate: previewRotation }] },
              ]}
            >
              <Ionicons name="image-outline" size={26} color="#2575fc" />
              <Text style={styles.previewUp}>HAUT</Text>
            </View>
            <Text style={styles.angleLabel}>{angle}°</Text>
            {isSideways && (
              <Text style={styles.angleHint}>
                Les côtés sont échangés : un média paysage devient portrait.
              </Text>
            )}
          </View>

          {/* Rotations relatives */}
          <View style={styles.stepRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => step(-90)}
            >
              <Ionicons name="return-up-back" size={22} color="#2575fc" />
              <Text style={styles.stepText}>Gauche</Text>
              <Text style={styles.stepHint}>−90°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => step(180)}
            >
              <Ionicons name="swap-vertical" size={22} color="#2575fc" />
              <Text style={styles.stepText}>Retourner</Text>
              <Text style={styles.stepHint}>180°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => step(90)}
            >
              <Ionicons name="return-up-forward" size={22} color="#2575fc" />
              <Text style={styles.stepText}>Droite</Text>
              <Text style={styles.stepHint}>+90°</Text>
            </TouchableOpacity>
          </View>

          {/* Angles absolus, pour aller droit au but */}
          <View style={styles.presetRow}>
            {[0, 90, 180, 270].map((value) => {
              const active = angle === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.preset, active && styles.presetActive]}
                  onPress={() => setAngle(value as MediaRotation)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      active && styles.presetTextActive,
                    ]}
                  >
                    {value}°
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirm}
              onPress={() => {
                onSelect(angle);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Appliquer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.footerText}>
              Une rotation manuelle remplace le réglage d'orientation automatique
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 420,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#f8f9fa",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#1B2845" },
  mediaTitle: { fontSize: 14, color: "#666", marginTop: 4 },
  closeButton: { padding: 4, marginLeft: 12 },

  previewZone: { alignItems: "center", paddingVertical: 22, gap: 8 },
  previewFrame: {
    width: 108,
    height: 68,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2575fc",
    backgroundColor: "#F3F7FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  previewUp: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2575fc",
    letterSpacing: 1,
  },
  angleLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B2845",
    fontVariant: ["tabular-nums"],
    marginTop: 6,
  },
  angleHint: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  stepRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
  },
  stepButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F7FF",
    borderWidth: 1,
    borderColor: "#D6E4FF",
    gap: 2,
  },
  stepText: { fontSize: 13, fontWeight: "600", color: "#2575fc" },
  stepHint: { fontSize: 10, color: "#8A9AB5", fontVariant: ["tabular-nums"] },

  presetRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  preset: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  presetActive: { backgroundColor: "#E3F2FD", borderColor: "#2575fc" },
  presetText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    fontVariant: ["tabular-nums"],
  },
  presetTextActive: { color: "#2575fc" },

  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
  },
  cancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#666" },
  confirm: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2575fc",
  },
  confirmText: { fontSize: 15, fontWeight: "600", color: "#fff" },

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
    flex: 1,
  },
});
