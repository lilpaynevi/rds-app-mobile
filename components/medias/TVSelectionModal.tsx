import { Ionicons } from '@expo/vector-icons'
import React, { useState, useEffect } from 'react'
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View, Text, Modal, ScrollView } from 'react-native'

const { width, height } = Dimensions.get("window");

interface TV {
  id: string;
  name: string;
  location?: string;
}

interface TVSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  tvs: TV[];
  // single-select mode (legacy)
  onSelect?: (tv: TV) => void;
  currentTv?: TV | null;
  // multi-select mode
  multiSelect?: boolean;
  assignedTvIds?: string[];
  onConfirm?: (selectedIds: string[]) => void;
}

export default function TVSelectionModal({
  visible,
  onClose,
  onSelect,
  currentTv,
  tvs,
  multiSelect = false,
  assignedTvIds = [],
  onConfirm,
}: TVSelectionModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedTvIds));

  useEffect(() => {
    if (visible) setSelected(new Set(assignedTvIds));
  }, [visible, assignedTvIds]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePress = (tv: TV) => {
    if (multiSelect) {
      toggle(tv.id);
    } else {
      onSelect?.(tv);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {multiSelect ? 'Gérer les TVs assignées' : 'Sélectionner une TV'}
            </Text>
            <Text style={styles.count}>{tvs.length}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {tvs && tvs.length > 0 ? tvs.map((tv) => {
              const isSelected = multiSelect ? selected.has(tv.id) : currentTv?.id === tv.id;
              return (
                <TouchableOpacity
                  key={tv.id}
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => handlePress(tv)}
                  activeOpacity={0.75}
                >
                  <View style={styles.itemContent}>
                    <Ionicons name="tv" size={24} color={isSelected ? "#00E5FF" : "#666"} />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                        {tv.name}
                      </Text>
                      <Text style={styles.itemLocation}>
                        {tv.location || "Emplacement non défini"}
                      </Text>
                    </View>
                  </View>
                  {multiSelect ? (
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  ) : (
                    isSelected && <Ionicons name="checkmark-circle" size={24} color="#00E5FF" />
                  )}
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucune TV disponible</Text>
              </View>
            )}
          </ScrollView>

          {/* Confirm button (multi-select only) */}
          {multiSelect && (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => { onConfirm?.(Array.from(selected)); onClose(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>
                Confirmer ({selected.size} TV{selected.size !== 1 ? 's' : ''})
              </Text>
            </TouchableOpacity>
          )}
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
    maxHeight: height * 0.75,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#212529", flex: 1 },
  count: { fontSize: 13, color: "#adb5bd", marginRight: 8 },
  closeBtn: { padding: 4 },
  list: { padding: 16, gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  itemSelected: {
    backgroundColor: "rgba(0,229,255,0.08)",
    borderColor: "#00E5FF",
  },
  itemContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  itemInfo: { marginLeft: 12, flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#212529", marginBottom: 2 },
  itemNameSelected: { color: "#00E5FF" },
  itemLocation: { fontSize: 13, color: "#6c757d" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#dee2e6",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#00E5FF",
    borderColor: "#00E5FF",
  },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 15, color: "#6c757d", textAlign: "center" },
  confirmBtn: {
    margin: 16,
    backgroundColor: "#00E5FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
