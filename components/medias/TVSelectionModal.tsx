import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Dimensions, Platform, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from 'react-native'
import { View } from 'react-native'
import { Modal } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
const { width, height } = Dimensions.get("window");

export default function TVSelectionModal({ visible, onClose, onSelect, currentTv, tvs }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.tvModalOverlay}>
        <View style={styles.tvModalContainer}>
          <View style={styles.tvModalHeader}>
            <Text style={styles.tvModalTitle}>Sélectionner une TV</Text>
            <Text style={styles.tvModalTitle}>{tvs.length}</Text>
            <TouchableOpacity onPress={onClose} style={styles.tvModalClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.tvListContent} // Différent du style
            showsVerticalScrollIndicator={false}
          >
            {tvs && tvs.length > 0 ? (
              tvs.map((tv) => (
                <TouchableOpacity
                  key={tv.id}
                  style={[
                    styles.tvItem,
                    currentTv?.id === tv.id && styles.tvItemSelected,
                  ]}
                  onPress={() => onSelect(tv)}
                >
                  <View style={styles.tvItemContent}>
                    <Ionicons
                      name="tv"
                      size={24}
                      color={currentTv?.id === tv.id ? "#00E5FF" : "#666"}
                    />
                    <View style={styles.tvItemInfo}>
                      <Text
                        style={[
                          styles.tvItemName,
                          currentTv?.id === tv.id && styles.tvItemNameSelected,
                        ]}
                      >
                        {tv.name}
                      </Text>
                      <Text style={styles.tvItemLocation}>
                        {tv.location || "Emplacement non défini"}
                      </Text>
                    </View>
                  </View>
                  {currentTv?.id === tv.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#00E5FF"
                    />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noTvContainer}>
                <Text style={styles.noTvText}>Aucune TV disponible</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

   durationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  durationButtonText: {
    fontSize: 13,
    color: '#2575fc',
    fontWeight: '600',
  },

  // Header
  header: {
    paddingTop: Platform.OS === "ios" ? 44 : 30,
    paddingBottom: 20,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },

  backButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#B0BEC5",
    marginRight: 8,
  },

  tvSelector: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    marginBottom: 15,
  },

  actionButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  addButton: {
    backgroundColor: "#00E5FF",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  activationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },

  activationLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },

  // Liste des médias
  mediaList: {
    padding: 20,
    paddingBottom: 100,
  },

  gridList: {
    paddingHorizontal: 15,
  },

  orderNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00E5FF",
    minWidth: 30,
    textAlign: "center",
    marginRight: 15,
  },

  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  listThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 15,
    position: "relative",
  },

  videoListThumbnail: {
    width: "100%",
    height: "100%",
    position: "relative",
  },

  listImage: {
    width: "100%",
    height: "100%",
  },

  listPlayOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 6,
  },

  durationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },

  durationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
  },

  listContent: {
    flex: 1,
    justifyContent: "center",
  },

  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },

  listMeta: {
    flexDirection: "column",
  },

  listType: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 2,
  },

  listDate: {
    fontSize: 12,
    color: "#adb5bd",
  },

  listActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  listDeleteButton: {
    padding: 6,
    marginRight: 10,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#f8f9fa",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#212529",
    marginTop: 20,
  },

  emptySubtitle: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 8,
  },

  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00E5FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },

  emptyActionText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },

  loadingText: {
    color: "#6c757d",
    fontSize: 16,
    marginTop: 20,
  },

  // Modal de visualisation
  modalViewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  modalViewerHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 1000,
  },

  closeButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },

  modalTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalViewerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },

  modalCounter: {
    fontSize: 14,
    color: "#adb5bd",
    marginTop: 4,
  },

  deleteButton: {
    padding: 8,
    backgroundColor: "rgba(255,107,107,0.2)",
    borderRadius: 20,
  },

  modalContent: {
    flex: 1,
  },

  videoContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  fullscreenVideo: {
    width: width,
    height: height,
  },

  fullscreenImage: {
    width: width,
    height: height,
    resizeMode: "contain",
  },

  videoControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  playButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 40,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },

  navigationContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    zIndex: 1000,
  },

  navButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 30,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  navButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: "rgba(255,255,255,0.1)",
  },

  // Modal d'ajout
  modalContainer: {
    flex: 1,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },

  modalUploadButton: {
    backgroundColor: "#00E5FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  modalUploadButtonDisabled: {
    backgroundColor: "#666",
  },

  modalUploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  modalSaveButton: {
    backgroundColor: "#00E5FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  modalSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  pickerContainer: {
    padding: 20,
  },

  pickerButton: {
    borderWidth: 2,
    borderColor: "#00E5FF",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    backgroundColor: "rgba(0,229,255,0.1)",
  },

  pickerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 12,
  },

  pickerSubtext: {
    fontSize: 14,
    color: "#B0BEC5",
    marginTop: 4,
  },

  selectedFilesContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  selectedFilesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 15,
  },

  selectedFilesList: {
    flexDirection: "row",
  },

  selectedFileItem: {
    marginRight: 15,
    position: "relative",
  },

  selectedFileThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#00E5FF",
  },

  removeFileButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  videoIndicator: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    padding: 4,
  },

  // Modal sélection TV

  tvModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  tvModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: height * 0.7,
    overflow: "hidden",
  },

  tvModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },

  tvModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
  },

  tvModalClose: {
    padding: 4,
  },

  tvList: {
    flex: 1, // Pour le ScrollView lui-même
  },

  tvListContent: {
    padding: 16, // Pour le contenu du ScrollView
  },

  tvItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },

  tvItemSelected: {
    backgroundColor: "rgba(0,229,255,0.1)",
    borderColor: "#00E5FF",
  },

  tvItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  tvItemInfo: {
    marginLeft: 12,
    flex: 1,
  },

  tvItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },

  tvItemNameSelected: {
    color: "#00E5FF",
  },

  tvItemLocation: {
    fontSize: 14,
    color: "#6c757d",
  },

  noTvContainer: {
    padding: 40,
    alignItems: "center",
  },

  noTvText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },

  // Modal réorganisation
  reorderList: {
    flex: 1,
    padding: 20,
  },

  reorderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  reorderItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  reorderIndex: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00E5FF",
    minWidth: 30,
    textAlign: "center",
    marginRight: 15,
  },

  reorderThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 15,
  },

  reorderInfo: {
    flex: 1,
  },

  reorderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },

  reorderType: {
    fontSize: 14,
    color: "#B0BEC5",
  },

  reorderControls: {
    flexDirection: "column",
    alignItems: "center",
  },

  reorderButton: {
    backgroundColor: "rgba(0,229,255,0.2)",
    borderRadius: 20,
    padding: 8,
    marginVertical: 2,
  },

  reorderButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  // Mode grille
  gridItemContainer: {
    flex: 1,
    margin: 6,
  },

  gridItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  thumbnail: {
    width: "100%",
    height: "80%",
  },

  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: "20%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  mediaInfo: {
    padding: 8,
    height: "20%",
  },

  mediaTitle: {
    color: "#212529",
    fontSize: 12,
    fontWeight: "600",
    numberOfLines: 1,
  },

  mediaMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },

  mediaType: {
    color: "#6c757d",
    fontSize: 10,
    flex: 1,
  },

  scheduleSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  scheduleSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  scheduleSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
  },

  scheduleAddButton: {
    padding: 8,
  },

  scheduleList: {
    flexDirection: "row",
  },

  scheduleCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 200,
    borderWidth: 2,
    borderColor: "transparent",
  },

  scheduleCardActive: {
    borderColor: "#00E5FF",
    backgroundColor: "#f0fdff",
  },

  scheduleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  scheduleCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    flex: 1,
  },

  scheduleStatus: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  scheduleStatusActive: {
    backgroundColor: "#00E5FF",
  },

  scheduleStatusText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  scheduleStatusTextActive: {
    color: "#fff",
  },

  scheduleCardTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },

  scheduleCardDays: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  scheduleCardDay: {
    backgroundColor: "#dee2e6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },

  scheduleCardDayText: {
    fontSize: 10,
    color: "#495057",
    fontWeight: "500",
  },

  // Modal programmation
  scheduleModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  scheduleModalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
  },

  scheduleModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },

  scheduleModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
  },

  scheduleModalClose: {
    padding: 4,
  },

  scheduleModalContent: {
    padding: 20,
  },

  scheduleFormGroup: {
    marginBottom: 20,
  },

  scheduleFormLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#212529",
    marginBottom: 8,
  },

  scheduleFormInput: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#212529",
  },

  scheduleFormTextArea: {
    height: 80,
    textAlignVertical: "top",
  },

  scheduleFormRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  scheduleDateText: {
    fontSize: 16,
    color: "#495057",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },

  scheduleDaysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  scheduleDayButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 45,
    alignItems: "center",
  },

  scheduleDayButtonActive: {
    backgroundColor: "#00E5FF",
    borderColor: "#00E5FF",
  },

  scheduleDayText: {
    fontSize: 14,
    color: "#495057",
    fontWeight: "500",
  },

  scheduleDayTextActive: {
    color: "#fff",
  },

  scheduleModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },

  scheduleDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  scheduleDeleteButtonText: {
    color: "#FF6B6B",
    marginLeft: 8,
    fontWeight: "500",
  },

  scheduleModalButtonsRight: {
    flexDirection: "row",
  },

  scheduleCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 12,
  },

  scheduleCancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },

  scheduleSaveButton: {
    backgroundColor: "#00E5FF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  scheduleSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});