import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Alert,
  Switch,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { socket } from "@/scripts/socket.io";
import api, { baseURL } from "@/scripts/fetch.api";
import ScheduleForm from "@/components/schedules/SchelduleForm";
import { SafeAreaView } from "react-native-safe-area-context";
import AddMediaForm from "@/components/medias/AddMediaForm";
import DurationModal from "@/components/medias/durationModal";
import TVSelectionModal from "@/components/medias/TVSelectionModal";

const { width, height } = Dimensions.get("window");

const formatDuration = (seconds) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// En haut de votre composant, avant le return
const formatDurationDisplay = (durationMs) => {
  if (!durationMs) return "10s"; // Valeur par défaut

  const seconds = Math.round(durationMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}min`;
  }

  return `${minutes}min ${remainingSeconds}s`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Modal pour modifier l'ordre
const ReorderModal = ({ visible, onClose, media, onReorder }) => {
  const [reorderedMedia, setReorderedMedia] = useState([]);

  useEffect(() => {
    if (visible && media) {
      setReorderedMedia([...media]);
    }
  }, [visible, media]);

  const moveItem = (fromIndex, direction) => {
    const newMedia = [...reorderedMedia];
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= newMedia.length) return;

    [newMedia[fromIndex], newMedia[toIndex]] = [
      newMedia[toIndex],
      newMedia[fromIndex],
    ];
    setReorderedMedia(newMedia);
  };

  const handleSave = () => {
    onReorder(reorderedMedia);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <LinearGradient
        colors={["#1A1A2E", "#16213E"]}
        style={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Réorganiser les médias</Text>
          <TouchableOpacity onPress={handleSave} style={styles.modalSaveButton}>
            <Feather name="check" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.reorderList}>
          {reorderedMedia.map((item, index) => {
            const isVideo =
              item.type === "video" || item.mimeType?.startsWith("video/");
            return (
              <View key={item.id} style={styles.reorderItem}>
                <View style={styles.reorderItemContent}>
                  <Text style={styles.reorderIndex}>{index + 1}</Text>

                  <View style={styles.reorderThumbnail}>
                    {isVideo ? (
                      <View style={styles.videoListThumbnail}>
                        <Image
                          source={{ uri: baseURL + item.url }}
                          style={styles.listImage}
                          resizeMode="cover"
                        />
                        <View style={styles.listPlayOverlay}>
                          <Ionicons name="play" size={12} color="#333" />
                        </View>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: baseURL + item.url }}
                        style={styles.listImage}
                        resizeMode="cover"
                      />
                    )}
                  </View>

                  <View style={styles.reorderInfo}>
                    <Text style={styles.reorderTitle} numberOfLines={1}>
                      {item.title || item.name || "Sans titre"}
                    </Text>
                    <Text style={styles.reorderType}>
                      {isVideo ? "🎥 Vidéo" : "📷 Photo"}
                      {isVideo && item.duration
                        ? ` • ${formatDuration(item.duration)}`
                        : ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.reorderControls}>
                  <TouchableOpacity
                    onPress={() => moveItem(index, "up")}
                    style={[
                      styles.reorderButton,
                      index === 0 && styles.reorderButtonDisabled,
                    ]}
                    disabled={index === 0}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={index === 0 ? "#666" : "#00E5FF"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => moveItem(index, "down")}
                    style={[
                      styles.reorderButton,
                      index === reorderedMedia.length - 1 &&
                        styles.reorderButtonDisabled,
                    ]}
                    disabled={index === reorderedMedia.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={
                        index === reorderedMedia.length - 1 ? "#666" : "#00E5FF"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const MediaViewerModal = ({
  visible,
  media,
  currentIndex,
  totalCount,
  onClose,
  onNavigate,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const player = useVideoPlayer(
    media?.url ? baseURL + media.url : null,
    (player) => {
      player.loop = true;
      player.muted = false;
    },
  );

  useEffect(() => {
    if (player) {
      const subscription = player.addListener("playingChange", (isPlaying) => {
        setIsPlaying(isPlaying);
      });

      return () => {
        subscription?.remove();
      };
    }
  }, [player]);

  useEffect(() => {
    let timeout;
    if (showControls) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  useEffect(() => {
    if (visible && media?.url && player) {
      player.replace(baseURL + media.url);
    }
  }, [media?.url, visible, player]);

  if (!visible || !media) return null;

  const isVideo =
    media.type === "video" || media.mimeType?.startsWith("video/");

  const togglePlayPause = () => {
    if (player) {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
    setShowControls(true);
  };

  const handleScreenTouch = () => {
    setShowControls(!showControls);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalViewerContainer}>
        {showControls && (
          <View style={styles.modalViewerHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalViewerTitle} numberOfLines={1}>
                {media.title || media.name || "Sans titre"}
              </Text>
              <Text style={styles.modalCounter}>
                {currentIndex + 1}/{totalCount}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onDelete(media.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-bin" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={handleScreenTouch}
        >
          {isVideo ? (
            <View style={styles.videoContainer}>
              <VideoView
                style={styles.fullscreenVideo}
                player={player}
                allowsFullscreen
                allowsPictureInPicture
              />
              {!isPlaying && showControls && (
                <TouchableOpacity
                  style={styles.videoControls}
                  onPress={togglePlayPause}
                  activeOpacity={0.8}
                >
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={40} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Image
              source={{ uri: baseURL + media.url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>

        {showControls && (
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              onPress={() => onNavigate(-1)}
              style={[
                styles.navButton,
                currentIndex === 0 && styles.navButtonDisabled,
              ]}
              disabled={currentIndex === 0}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={currentIndex === 0 ? "#666" : "#fff"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onNavigate(1)}
              style={[
                styles.navButton,
                currentIndex === totalCount - 1 && styles.navButtonDisabled,
              ]}
              disabled={currentIndex === totalCount - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={currentIndex === totalCount - 1 ? "#666" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

// Ajoutez ce composant avant le composant principal PlaylistContent
const ScheduleModal = ({ visible, onClose, schedule, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(),
    startTime: "08:00",
    endTime: "18:00",
    daysOfWeek: [],
    isActive: true,
    priority: 5,
  });

  const daysOfWeekLabels = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];

  useEffect(() => {
    if (schedule) {
      setFormData({
        title: schedule.title || "",
        description: schedule.description || "",
        startDate: new Date(schedule.startDate),
        endDate: new Date(schedule.endDate),
        startTime: schedule.startTime || "08:00",
        endTime: schedule.endTime || "18:00",
        daysOfWeek: schedule.daysOfWeek || [],
        isActive: schedule.isActive !== undefined ? schedule.isActive : true,
        priority: schedule.priority || 5,
      });
    } else {
      // Reset pour nouvelle programmation
      setFormData({
        title: "",
        description: "",
        startDate: new Date(),
        endDate: new Date(),
        startTime: "08:00",
        endTime: "18:00",
        daysOfWeek: [],
        isActive: true,
        priority: 5,
      });
    }
  }, [schedule, visible]);

  const [data, setData] = useState({});

  const toggleDayOfWeek = (day) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const handleSave = () => {
    console.log("newData : ", formData);

    if (formData.daysOfWeek.length === 0) {
      Alert.alert("Erreur", "Sélectionnez au moins un jour");
      return;
    }
    onSave(formData);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.scheduleModalOverlay}>
        <View style={styles.scheduleModalContainer}>
          <View style={styles.scheduleModalHeader}>
            <Text style={styles.scheduleModalTitle}>
              {schedule
                ? "Modifier la programmation"
                : "Nouvelle programmation"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.scheduleModalClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScheduleForm
            onSave={(newData) => {
              console.log("🚀 ~ ScheduleModal ~ newData:", newData);
              setFormData({
                ...formData,
                ...newData,
              });
            }}
            values={formData}
          />

          <View style={styles.scheduleModalActions}>
            {schedule && (
              <TouchableOpacity
                onPress={() => onDelete(schedule.id)}
                style={styles.scheduleDeleteButton}
              >
                <Ionicons name="trash-bin" size={20} color="#FF6B6B" />
                <Text style={styles.scheduleDeleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
            )}
            <View style={styles.scheduleModalButtonsRight}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.scheduleCancelButton}
              >
                <Text style={styles.scheduleCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={styles.scheduleSaveButton}
              >
                <Text style={styles.scheduleSaveButtonText}>
                  {schedule ? "Modifier" : "Créer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PlaylistContent = ({ onBack }) => {
  const { playlistId } = useLocalSearchParams();
  const [playlist, setPlaylist] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState("list");
  const [addMediaModalVisible, setAddMediaModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isActive, setIsActive] = useState(false);

  // Nouveaux states pour les nouvelles fonctionnalités
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [tvAssignModalVisible, setTvAssignModalVisible] = useState(false);
  const [availableTvs, setAvailableTvs] = useState([]);
  const [assignedTvs, setAssignedTvs] = useState<{ id: string; name: string }[]>([]);
  const [selectedTv, setSelectedTv] = useState<{ id: string; name?: string } | null>(null);

  // Dans les states existants, ajoutez :
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);

  const openDurationEditor = (media) => {
    setEditingMedia(media);
    console.debug("🚀 ~ openDurationEditor ~ media:", media);
    setDurationModalVisible(true);
  };

  const handleDurationSave = async (newDuration) => {
    try {
      await api.patch(
        `/playlists/${playlistId}/media/${editingMedia.id}/duration`,
        { duration: newDuration },
      );

      // Mise à jour locale
      setMedia((prevMedia) =>
        prevMedia.map((m) =>
          m.id === editingMedia.id ? { ...m, duration: newDuration } : m,
        ),
      );

      notifyAllTvs("tv-change-playlist", (tvId) => ({ tvId, newPlaylistId: playlistId }));

      Alert.alert("Succès", "Durée mise à jour");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour la durée");
    }
  };

  // const handleScheduleSave = async (scheduleData) => {
  //   try {
  //     setLoading(true);

  //     const payload = {
  //       ...scheduleData,
  //     };
  //     console.log("🚀 ~ handleScheduleSave ~ payload:", payload);

  //     const res = await api.patch(`/schedules/${schedules[0].id}`, payload);

  //     // if (editingSchedule) {
  //     //   await api.patch(`/schedules/${payload.scheduleId}`, payload);
  //     // } else {
  //     //   await api.post("/schedules", payload);
  //     // }

  //     if (res.status != 400) {
  //       setScheduleModalVisible(false);
  //       setEditingSchedule(null);
  //     }
  //     loadPlaylistContent();
  //   } catch (error) {
  //     console.error("Erreur sauvegarde programmation:", error);
  //     Alert.alert("Erreur", "Impossible de sauvegarder la programmation");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleScheduleSave = async (scheduleData) => {
    console.log("🚀 ~ handleScheduleSave ~ scheduleData:", scheduleData);
    try {
      setLoading(true);
      console.log("📥 handleScheduleSave reçu:", scheduleData);

      // ✅ Déterminez si c'est création ou modification
      const isEditing =
        scheduleData.scheduleId ||
        (schedules && schedules.length > 0 && schedules[0].id);

      if (isEditing) {
        // 🔄 MODE MODIFICATION
        const scheduleId = scheduleData.scheduleId || schedules[0].id;
        console.log("🔄 Modification du schedule:", scheduleId);

        const payload = {
          daysOfWeek: scheduleData.daysOfWeek,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          title: scheduleData.title,
          description: scheduleData.description,
          startDate: scheduleData.startDate,
          endDate: scheduleData.endDate,
          isActive: scheduleData.isActive,
          priority: scheduleData.priority,
        };

        console.log("📤 PATCH /schedules/" + scheduleId, payload);
        const res = await api.patch(`/schedules/${scheduleId}`, payload);

        if (res.status === 200) {
          notifyAllTvs("tv-schedules-updated", (tvId) => ({ tvId }));
          Alert.alert("Succès", "Programmation modifiée");
          setScheduleModalVisible(false);
          setEditingSchedule(null);
          loadPlaylistContent(); // Recharge les données
        }
      } else {
        // ➕ MODE CRÉATION
        console.log("➕ Création d'un nouveau schedule");

        const payload = {
          playlistId: playlistId, // ✅ ID de la playlist actuelle
          televisionId: selectedTv?.id,
          daysOfWeek: scheduleData.daysOfWeek,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          title: scheduleData.title || "Programme sans titre",
          description: scheduleData.description || "",
          startDate: scheduleData.startDate || new Date(),
          endDate:
            scheduleData.endDate ||
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
          isActive:
            scheduleData.isActive !== undefined ? scheduleData.isActive : true,
          priority: scheduleData.priority || 5,
        };

        console.log("📤 POST /schedules", payload);
        const res = await api.post("/schedules", payload);

        if (res.status === 200 || res.status === 201) {
          notifyAllTvs("tv-schedules-updated", (tvId) => ({ tvId }));
          Alert.alert("Succès", "Programmation créée");
          setScheduleModalVisible(false);
          setEditingSchedule(null);
          loadPlaylistContent(); // Recharge les données
        }
      }
    } catch (error) {
      console.error("❌ Erreur sauvegarde programmation:", error);
      console.error("Détails:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder la programmation");
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleDelete = async (scheduleId) => {
    Alert.alert(
      "Supprimer la programmation",
      "Êtes-vous sûr de vouloir supprimer cette programmation ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`/schedules/${scheduleId}`);
              notifyAllTvs("tv-schedules-updated", (tvId) => ({ tvId }));
              setScheduleModalVisible(false);
              setEditingSchedule(null);
            } catch (error) {
              console.error("Erreur suppression programmation:", error);
              Alert.alert("Erreur", "Impossible de supprimer la programmation");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const openScheduleModal = (schedule = null) => {
    setEditingSchedule(schedule);
    setScheduleModalVisible(true);
  };

  // Émet un event socket vers toutes les TVs assignées
  const notifyAllTvs = (event: string, payloadFn: (tvId: string) => object) => {
    const tvList = assignedTvs.length > 0 ? assignedTvs : selectedTv ? [selectedTv] : [];
    tvList.forEach((tv) => socket.emit(event, payloadFn(tv.id)));
  };

  useEffect(() => {
    loadPlaylistContent();
    loadAvailableTvs();

    const socketListener = socket.on("playlistUpdated", (updatedPlaylist) => {
      if (updatedPlaylist.id === playlistId) {
        loadPlaylistContent();
      }
    });

    return () => {
      socket.off("playlistUpdated", socketListener);
    };
  }, [playlistId]);

  const loadAvailableTvs = async () => {
    try {
      const response = await api.get("/televisions/me");
      setAvailableTvs(response.data);
    } catch (error) {
      console.error("Erreur chargement TVs:", error);
    }
  };

  const loadPlaylistContent = async () => {
    try {
      setLoading(true);
      const playlistResponse = await api.get(`/playlists/${playlistId}`);
      const playlistData = playlistResponse.data;
      console.log(
        "🚀 ~ loadPlaylistContent ~ playlistData:",
        JSON.stringify(playlistData),
      );

      setPlaylist(playlistData);
      setIsActive(playlistData.isActive);
      setSchedules(playlistData.schedules);
      setSelectedTv(playlistData.televisions[0]?.television || null);
      setAssignedTvs(playlistData.televisions?.map((t: any) => t.television).filter(Boolean) || []);

      const extractedMedia =
        playlistData.items?.map((item, index) => ({
          id: item.media.id,
          title: item.media.filename
            ?.replace(/^\d+_/, "")
            .replace(/\.[^/.]+$/, ""),
          name: item.media.filename,
          url: item.media.s3Url,
          thumbnailUrl: baseURL + item.media.s3Url,
          type: getMediaType(item.media.filename),
          mimeType: getMimeType(item.media.filename),
          duration: item.media.duration,
          createdAt: item.createdAt || playlistData.createdAt,
          originalData: item.media,
          order: item.order || index,
        })) || [];

      // Trier par ordre
      extractedMedia.sort((a, b) => (a.order || 0) - (b.order || 0));
      // console.log("🚀 ~ loadPlaylistContent ~ extractedMedia:", extractedMedia);
      setMedia(extractedMedia);
    } catch (error) {
      console.error("Erreur chargement playlist:", error);
      Alert.alert("Erreur", "Impossible de charger la playlist");
    } finally {
      setLoading(false);
    }
  };

  const getMediaType = (filename) => {
    if (!filename) return "unknown";
    const videoExtensions = [".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    const extension = filename
      .toLowerCase()
      .substring(filename.lastIndexOf("."));
    return videoExtensions.includes(extension)
      ? "video"
      : imageExtensions.includes(extension)
        ? "photo"
        : "unknown";
  };

  const getMimeType = (filename) => {
    if (!filename) return "";
    const extension = filename
      .toLowerCase()
      .substring(filename.lastIndexOf("."));
    const mimeTypes = {
      ".mp4": "video/mp4",
      ".avi": "video/x-msvideo",
      ".mov": "video/quicktime",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
    };
    return mimeTypes[extension] || "";
  };

  const openMediaViewer = (mediaItem, index) => {
    setSelectedMedia(mediaItem);
    setCurrentIndex(index);
    setModalVisible(true);
  };

  const navigateMedia = (direction) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < media.length) {
      setCurrentIndex(newIndex);
      setSelectedMedia(media[newIndex]);
    }
  };

  const confirmDeleteMedia = (mediaId) => {
    Alert.alert(
      "Supprimer le média",
      "Êtes-vous sûr de vouloir supprimer ce média ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteMedia(mediaId),
        },
      ],
    );
  };

  const deleteMedia = async (mediaId) => {
    try {
      setLoading(true);
      await api.delete(`/playlists/media/${mediaId}`);
      loadPlaylistContent();
      if (selectedMedia?.id === mediaId) {
        setModalVisible(false);
      }
      notifyAllTvs("tv-change-playlist", (tvId) => ({ tvId, newPlaylistId: playlistId }));
    } catch (error) {
      console.error("Erreur suppression média:", error);
      Alert.alert("Erreur", "Impossible de supprimer le média");
    } finally {
      setLoading(false);
    }
  };

  // Nouvelle fonction pour réorganiser les médias
  const handleReorderMedia = async (reorderedMedia) => {
    try {
      setLoading(true);

      const orderUpdates = reorderedMedia.map((item, index) => ({
        mediaId: item.id,
        order: index + 1,
      }));

      const request = await api.patch(
        `/playlists/${playlistId}/reorder`,
        orderUpdates,
      );
      console.log("🚀 ~ handleReorderMedia ~ request:", request.data);

      if (request.status === 200) {
        setMedia(reorderedMedia);

        if (isActive) {
          notifyAllTvs("tv-change-playlist", (tvId) => ({ tvId, newPlaylistId: playlistId }));
        }
      }
    } catch (error) {
      console.error("Erreur réorganisation:", error);
      Alert.alert("Erreur", "Impossible de réorganiser les médias");
      loadPlaylistContent(); // Recharger en cas d'erreur
    } finally {
      setLoading(false);
    }
  };


  // Gestion multi-assignation TVs
  const handleTvAssignConfirm = async (selectedIds: string[]) => {
    const prevIds = new Set(assignedTvs.map((t) => t.id));
    const nextIds = new Set(selectedIds);
    const toAdd = selectedIds.filter((id) => !prevIds.has(id));
    const toRemove = assignedTvs.map((t) => t.id).filter((id) => !nextIds.has(id));
    try {
      await Promise.all([
        ...toAdd.map((tvId) =>
          api.patch(`/playlists/${playlistId}/assign-tv`, { televisionId: tvId, playlistId })
        ),
        ...toRemove.map((tvId) =>
          api.delete(`/playlists/${playlistId}/unassign-tv/${tvId}`)
        ),
      ]);
      loadPlaylistContent();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour les TVs assignées");
    }
  };

  const handleUnassignTv = (tvId: string) => {
    Alert.alert("Désassigner", "Retirer cette TV de la playlist ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/playlists/${playlistId}/unassign-tv/${tvId}`);
            setAssignedTvs((prev) => prev.filter((t) => t.id !== tvId));
            if (selectedTv?.id === tvId) setSelectedTv(null);
          } catch {
            Alert.alert("Erreur", "Impossible de désassigner la TV");
          }
        },
      },
    ]);
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission requise",
        "Nous avons besoin de l'accès à votre galerie pour sélectionner des médias",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const files = result.assets.map((asset, index) => ({
        id: `${Date.now()}-${index}`,
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "photo",
        name: asset.fileName || `media_${index}`,
        duration: asset.duration || 0,
      }));
      setSelectedFiles([...selectedFiles, ...files]);
    }
  };

  const removeFile = (fileId) => {
    setSelectedFiles(selectedFiles.filter((file) => file.id !== fileId));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      const formData = new FormData();

      selectedFiles.forEach((file, index) => {
        formData.append("files", {
          uri: file.uri,
          type: file.type === "video" ? "video/mp4" : "image/jpeg",
          name: file.name || `media_${index}`,
        } as any);
      });

      formData.append("playlistId", playlistId);
      console.log("🚀 ~ handleUpload ~ formData:", formData);

      const response = await api.patch("/playlists/" + playlistId, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert("Succès", "Médias ajoutés avec succès");
        setAddMediaModalVisible(false);
        setSelectedFiles([]);

        if (isActive) {
          notifyAllTvs("tv-change-playlist", (tvId) => ({ tvId, newPlaylistId: playlistId }));
        }

        loadPlaylistContent();
      } else {
        throw new Error(response.data?.message || "Erreur lors de l'upload");
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter les médias");
    } finally {
      setUploading(false);
    }
  };

  const togglePlaylistStatus = async () => {
    if (assignedTvs.length === 0) {
      Alert.alert("Erreur", "Assignez d'abord une TV à cette playlist");
      return;
    }

    try {
      const newStatus = !isActive;
      const contextTv = selectedTv ?? assignedTvs[0];

      await api.patch(
        `/playlists/${playlistId}/televisionId/${contextTv.id}/status`,
        { isActive: newStatus },
      );
      setIsActive(newStatus);

      // Notifier toutes les TVs assignées
      assignedTvs.forEach((tv) => {
        socket.emit("tv-change-playlist", {
          tvId: tv.id,
          newPlaylistId: playlistId,
        });
      });
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le statut");
      setIsActive(!isActive);
    }
  };

  const renderMediaItem = ({ item, index }) => {
    const isVideo =
      item.type === "video" || item.mimeType?.startsWith("video/");

    if (viewMode === "grid") {
      return (
        <TouchableOpacity
          style={styles.gridItemContainer}
          onPress={() => openMediaViewer(item, index)}
          activeOpacity={0.8}
        >
          <View style={styles.gridItem}>
            <View style={styles.thumbnail}>
              {isVideo ? (
                <View style={styles.videoContainer}>
                  <Image
                    source={{ uri: baseURL + item.url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.playOverlay}>
                    <Ionicons
                      name="play-circle"
                      size={40}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                  {item.duration > 0 && (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>
                        {formatDuration(item.duration)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Image
                  source={{ uri: baseURL + item.url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle} numberOfLines={1}>
                {item.title || item.name || "Sans titre"}
              </Text>
              <View style={styles.mediaMeta}>
                <Text style={styles.mediaType}>
                  {isVideo ? "🎥 Vidéo" : "📷 Photo"}
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    confirmDeleteMedia(item.id);
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-bin" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.listItemContainer}
        onPress={() => openMediaViewer(item, index)}
        activeOpacity={0.8}
      >
        <Text style={styles.orderNumber}>{index + 1}</Text>

        <View style={styles.listThumbnail}>
          {isVideo ? (
            <View style={styles.videoListThumbnail}>
              <Image
                source={{ uri: baseURL + item.url }}
                style={styles.listImage}
                resizeMode="cover"
              />
              <View style={styles.listPlayOverlay}>
                <Ionicons name="play" size={16} color="#333" />
              </View>
              {item.duration > 0 && (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    {formatDuration(item.duration)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Image
              source={{ uri: baseURL + item.url }}
              style={styles.listImage}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.listContent}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {item.title || item.name || "Sans titre"}
          </Text>
          <View style={styles.listMeta}>
            <Text style={styles.listType}>
              {isVideo ? "🎥 Vidéo" : "📷 Photo"}
              {isVideo && item.duration
                ? ` • ${formatDuration(item.duration)}`
                : ""}
            </Text>
            <Text style={styles.listDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.listActions}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openDurationEditor(item);
            }}
            style={styles.durationButton}
          >
            <Ionicons name="time-outline" size={18} color="#2575fc" />
            <Text style={styles.durationButtonText}>
              {formatDurationDisplay(item.duration)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              confirmDeleteMedia(item.id);
            }}
            style={styles.listDeleteButton}
          >
            <Ionicons name="trash-bin" size={20} color="#FF6B6B" />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <LinearGradient
        colors={["#1A1A2E", "#16213E"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {playlist?.name || "Ma Playlist"}
            </Text>
            <TouchableOpacity
              onPress={() => setTvAssignModalVisible(true)}
              style={styles.tvSelector}
            >
              <Text style={styles.headerSubtitle}>
                {media.length} élément{media.length !== 1 ? "s" : ""} •{" "}
                {assignedTvs.length === 0
                  ? "Aucune TV"
                  : assignedTvs.length === 1
                  ? assignedTvs[0].name
                  : `${assignedTvs.length} TVs`}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#00E5FF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* Bouton de réorganisation */}
          <TouchableOpacity
            onPress={() => setReorderModalVisible(true)}
            style={styles.actionButton}
            disabled={media.length === 0}
          >
            <Ionicons
              name="reorder-three"
              size={24}
              color={media.length === 0 ? "#666" : "#fff"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            style={styles.actionButton}
          >
            <Ionicons
              name={viewMode === "grid" ? "list" : "grid"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setScheduleModalVisible(true)}
            style={styles.actionButton}
          >
            <Ionicons name="time" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setAddMediaModalVisible(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Toggle activation playlist */}
        <View style={styles.activationContainer}>
          <Text style={styles.activationLabel}>
            Playlist {isActive ? "active" : "inactive"}
          </Text>
          <Switch
            value={isActive}
            onValueChange={togglePlaylistStatus}
            trackColor={{ false: "#767577", true: "#00E5FF" }}
            thumbColor={isActive ? "#fff" : "#f4f3f4"}
            disabled={assignedTvs.length === 0}
          />
        </View>

        {/* TVs assignées */}
        <View style={styles.tvChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {assignedTvs.map((tv) => (
              <View key={tv.id} style={styles.tvChip}>
                <Ionicons name="tv" size={13} color="#00E5FF" />
                <Text style={styles.tvChipText}>{tv.name}</Text>
                <TouchableOpacity onPress={() => handleUnassignTv(tv.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={15} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.tvChipAdd} onPress={() => setTvAssignModalVisible(true)}>
              <Ionicons name="add" size={15} color="#00E5FF" />
              <Text style={styles.tvChipAddText}>Gérer les TVs</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Contenu principal */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : media.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucun média</Text>
          <Text style={styles.emptySubtitle}>
            Commencez par ajouter des photos et vidéos à votre playlist
          </Text>
          <TouchableOpacity
            onPress={() => setAddMediaModalVisible(true)}
            style={styles.emptyActionButton}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyActionText}>Ajouter des médias</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={media}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={viewMode === "grid" ? 2 : 1}
          key={viewMode}
          contentContainerStyle={[
            styles.mediaList,
            viewMode === "grid" && styles.gridList,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal gestion TVs assignées (multi-select) */}
      <TVSelectionModal
        visible={tvAssignModalVisible}
        onClose={() => setTvAssignModalVisible(false)}
        tvs={availableTvs}
        multiSelect
        assignedTvIds={assignedTvs.map((t) => t.id)}
        onConfirm={handleTvAssignConfirm}
      />

      {/* Modal de réorganisation */}
      <ReorderModal
        visible={reorderModalVisible}
        onClose={() => setReorderModalVisible(false)}
        media={media}
        onReorder={handleReorderMedia}
      />

      {/* Modal de visualisation */}
      <MediaViewerModal
        visible={modalVisible}
        media={selectedMedia}
        currentIndex={currentIndex}
        totalCount={media.length}
        onClose={() => setModalVisible(false)}
        onNavigate={navigateMedia}
        onDelete={confirmDeleteMedia}
      />

      <ScheduleModal
        visible={scheduleModalVisible}
        onClose={() => {
          setScheduleModalVisible(false);
          setEditingSchedule(playlist && playlist.schedules[0] ? true : false);
        }}
        schedule={playlist ? playlist.schedules[0] : []}
        onSave={handleScheduleSave}
        onDelete={handleScheduleDelete}
      />

      <DurationModal
        visible={durationModalVisible}
        onClose={() => setDurationModalVisible(false)}
        onSelect={handleDurationSave}
        currentDuration={editingMedia?.duration || 10}
        mediaTitle={editingMedia?.title}
      />

      {/* Modal d'ajout de médias */}
      <Modal
        visible={addMediaModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAddMediaModalVisible(false)}
      >
        <LinearGradient
          colors={["#1A1A2E", "#16213E"]}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setAddMediaModalVisible(false);
                setSelectedFiles([]);
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ajouter des médias</Text>
            <TouchableOpacity
              onPress={handleUpload}
              style={[
                styles.modalUploadButton,
                selectedFiles.length === 0 && styles.modalUploadButtonDisabled,
              ]}
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalUploadButtonText}>
                  Ajouter ({selectedFiles.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            <AddMediaForm
              medias={selectedMedia}
              onSave={(data) => {
                console.log("🚀 ~ data: ------------------------");
                console.log(data);
                console.log("🚀 ~ data: ------------------------");
                setSelectedFiles(data);
              }}
            />
          </View>

          {/* <ScrollView style={styles.modalContent}>
            <View style={styles.pickerContainer}>
              <TouchableOpacity onPress={pickMedia} style={styles.pickerButton}>
                <Ionicons name="add-circle" size={40} color="#00E5FF" />
                <Text style={styles.pickerText}>
                  Sélectionner des photos/vidéos
                </Text>
                <Text style={styles.pickerSubtext}>
                  Appuyez pour choisir dans votre galerie
                </Text>
              </TouchableOpacity>
            </View>

            {selectedFiles.length > 0 && (
              <View style={styles.selectedFilesContainer}>
                <Text style={styles.selectedFilesTitle}>
                  Médias sélectionnés ({selectedFiles.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.selectedFilesList}
                >
                  {selectedFiles.map((file) => (
                    <View key={file.id} style={styles.selectedFileItem}>
                      <Image
                        source={{ uri: file.uri }}
                        style={styles.selectedFileThumbnail}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => removeFile(file.id)}
                        style={styles.removeFileButton}
                      >
                        <Ionicons name="close" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                      {file.type === "video" && (
                        <View style={styles.videoIndicator}>
                          <Ionicons name="play" size={12} color="#fff" />
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView> */}
        </LinearGradient>
      </Modal>
    </SafeAreaView>
  );
};

const C = {
  bgDeep: "#07091A",
  bgMid: "#0D1130",
  bgCard: "#111827",
  accent: "#4F8EF7",
  accentDim: "rgba(79,142,247,0.12)",
  accentBorder: "rgba(79,142,247,0.28)",
  cyan: "#00E5FF",
  cyanDim: "rgba(0,229,255,0.10)",
  cyanBorder: "rgba(0,229,255,0.25)",
  success: "#00E676",
  successDim: "rgba(0,230,118,0.10)",
  successBorder: "rgba(0,230,118,0.25)",
  warning: "#FFB300",
  warningDim: "rgba(255,179,0,0.12)",
  warningBorder: "rgba(255,179,0,0.28)",
  danger: "#FF5252",
  dangerDim: "rgba(255,82,82,0.10)",
  dangerBorder: "rgba(255,82,82,0.28)",
  white: "#FFFFFF",
  white80: "rgba(255,255,255,0.80)",
  white60: "rgba(255,255,255,0.60)",
  white40: "rgba(255,255,255,0.40)",
  white20: "rgba(255,255,255,0.20)",
  white10: "rgba(255,255,255,0.08)",
  white05: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
};

const styles = StyleSheet.create({
  // ── Base ─────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: C.bgDeep,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    paddingTop: Platform.OS === "ios" ? 44 : 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  backButton: {
    marginRight: 14,
    padding: 8,
    borderRadius: 13,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.white,
    marginBottom: 5,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: C.white40,
    marginRight: 6,
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
    marginBottom: 14,
    gap: 10,
  },
  actionButton: {
    padding: 9,
    borderRadius: 12,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  addButton: {
    backgroundColor: C.cyan,
    borderRadius: 14,
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  activationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 6,
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  activationLabel: {
    fontSize: 14,
    color: C.white80,
    fontWeight: "600",
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bgDeep,
  },
  loadingText: {
    color: C.white40,
    fontSize: 15,
    marginTop: 16,
    fontWeight: "500",
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: C.bgDeep,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.white,
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.white40,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cyan,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyActionText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Media list ────────────────────────────────────────────────────────────
  mediaList: {
    padding: 16,
    paddingBottom: 100,
  },
  gridList: {
    paddingHorizontal: 12,
  },

  // List view
  orderNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: C.cyan,
    minWidth: 28,
    textAlign: "center",
    marginRight: 14,
  },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  listThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 11,
    overflow: "hidden",
    marginRight: 14,
    position: "relative",
    backgroundColor: C.white05,
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
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 10,
    padding: 6,
  },
  durationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.70)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  durationText: {
    color: C.white,
    fontSize: 10,
    fontWeight: "600",
  },
  listContent: {
    flex: 1,
    justifyContent: "center",
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.white,
    marginBottom: 4,
  },
  listMeta: {
    flexDirection: "column",
    gap: 2,
  },
  listType: {
    fontSize: 13,
    color: C.white40,
  },
  listDate: {
    fontSize: 11,
    color: C.white20,
  },
  listActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listDeleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
  },
  durationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  durationButtonText: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "600",
  },

  // Grid view
  gridItemContainer: {
    flex: 1,
    margin: 5,
  },
  gridItem: {
    backgroundColor: C.bgCard,
    borderRadius: 14,
    overflow: "hidden",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: C.border,
  },
  thumbnail: {
    width: "100%",
    height: "78%",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: "22%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  mediaInfo: {
    padding: 7,
    height: "22%",
  },
  mediaTitle: {
    color: C.white,
    fontSize: 11,
    fontWeight: "600",
  },
  mediaMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  mediaType: {
    color: C.white40,
    fontSize: 10,
    flex: 1,
  },

  // ── TV selection modal ────────────────────────────────────────────────────
  tvModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "center",
    alignItems: "center",
  },
  tvModalContainer: {
    backgroundColor: C.bgCard,
    borderRadius: 24,
    width: width * 0.9,
    maxHeight: height * 0.7,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  tvModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tvModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.white,
  },
  tvModalClose: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  tvList: {
    flex: 1,
  },
  tvListContent: {
    padding: 14,
  },
  tvItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    marginBottom: 8,
    backgroundColor: C.white05,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  tvItemSelected: {
    backgroundColor: C.cyanDim,
    borderColor: C.cyanBorder,
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
    fontSize: 15,
    fontWeight: "600",
    color: C.white,
    marginBottom: 3,
  },
  tvItemNameSelected: {
    color: C.cyan,
  },
  tvItemLocation: {
    fontSize: 13,
    color: C.white40,
  },
  noTvContainer: {
    padding: 40,
    alignItems: "center",
  },
  noTvText: {
    fontSize: 15,
    color: C.white40,
    textAlign: "center",
  },

  // ── Reorder modal ─────────────────────────────────────────────────────────
  reorderList: {
    flex: 1,
    padding: 14,
  },
  reorderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white05,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  reorderItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reorderIndex: {
    fontSize: 16,
    fontWeight: "800",
    color: C.cyan,
    minWidth: 28,
    textAlign: "center",
    marginRight: 14,
  },
  reorderThumbnail: {
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 14,
    backgroundColor: C.white05,
  },
  reorderInfo: {
    flex: 1,
  },
  reorderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.white,
    marginBottom: 4,
  },
  reorderType: {
    fontSize: 12,
    color: C.white40,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reorderControls: {
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
  },
  reorderButton: {
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    borderRadius: 10,
    padding: 8,
  },
  reorderButtonDisabled: {
    backgroundColor: C.white05,
    borderColor: C.border,
  },

  // ── Add media modal ───────────────────────────────────────────────────────
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
    borderBottomColor: C.border,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.white,
  },
  modalUploadButton: {
    backgroundColor: C.cyan,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  modalUploadButtonDisabled: {
    backgroundColor: C.white10,
    shadowOpacity: 0,
  },
  modalUploadButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },
  modalSaveButton: {
    backgroundColor: C.cyan,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  modalSaveButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },
  modalContent: {
    flex: 1,
  },
  pickerContainer: {
    padding: 20,
  },
  pickerButton: {
    borderWidth: 1.5,
    borderColor: C.cyanBorder,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    backgroundColor: C.cyanDim,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    marginTop: 14,
  },
  pickerSubtext: {
    fontSize: 13,
    color: C.white40,
    marginTop: 5,
  },
  selectedFilesContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  selectedFilesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    marginBottom: 14,
  },
  selectedFilesList: {
    flexDirection: "row",
  },
  selectedFileItem: {
    marginRight: 14,
    position: "relative",
  },
  selectedFileThumbnail: {
    width: 78,
    height: 78,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.cyan,
  },
  removeFileButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: C.bgCard,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: C.dangerBorder,
  },
  videoIndicator: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.70)",
    borderRadius: 8,
    padding: 4,
  },

  // ── Viewer modal ──────────────────────────────────────────────────────────
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
    backgroundColor: "rgba(0,0,0,0.80)",
    zIndex: 1000,
  },
  closeButton: {
    padding: 9,
    backgroundColor: C.white10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalViewerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    textAlign: "center",
  },
  modalCounter: {
    fontSize: 13,
    color: C.white40,
    marginTop: 3,
  },
  deleteButton: {
    padding: 9,
    backgroundColor: C.dangerDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.dangerBorder,
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
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  playButton: {
    backgroundColor: "rgba(0,0,0,0.60)",
    borderRadius: 40,
    padding: 20,
    borderWidth: 1.5,
    borderColor: C.white20,
  },
  navigationContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    zIndex: 1000,
  },
  navButton: {
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 30,
    padding: 14,
    borderWidth: 1,
    borderColor: C.white20,
  },
  navButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.30)",
    borderColor: "rgba(255,255,255,0.08)",
  },

  // ── Schedule card ─────────────────────────────────────────────────────────
  scheduleSection: {
    backgroundColor: C.bgCard,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scheduleSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
  },
  scheduleAddButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  scheduleList: {
    flexDirection: "row",
  },
  scheduleCard: {
    backgroundColor: C.white05,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleCardActive: {
    backgroundColor: C.cyanDim,
    borderColor: C.cyanBorder,
  },
  scheduleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scheduleCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.white,
    flex: 1,
  },
  scheduleStatus: {
    backgroundColor: C.white10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scheduleStatusActive: {
    backgroundColor: C.cyan,
  },
  scheduleStatusText: {
    fontSize: 11,
    color: C.white40,
    fontWeight: "600",
  },
  scheduleStatusTextActive: {
    color: C.white,
  },
  scheduleCardTime: {
    fontSize: 13,
    color: C.white60,
    marginBottom: 8,
  },
  scheduleCardDays: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  scheduleCardDay: {
    backgroundColor: C.white10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleCardDayText: {
    fontSize: 10,
    color: C.white60,
    fontWeight: "600",
  },

  // ── Schedule modal ────────────────────────────────────────────────────────
  scheduleModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "flex-end",
  },
  scheduleModalContainer: {
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.85,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  scheduleModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  scheduleModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.white,
  },
  scheduleModalClose: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleModalContent: {
    padding: 20,
  },
  scheduleFormGroup: {
    marginBottom: 20,
  },
  scheduleFormLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.white60,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scheduleFormInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: C.white,
    backgroundColor: C.white05,
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
    fontSize: 15,
    color: C.white80,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: C.white05,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleDaysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scheduleDayButton: {
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
    minWidth: 46,
    alignItems: "center",
  },
  scheduleDayButtonActive: {
    backgroundColor: C.cyanDim,
    borderColor: C.cyanBorder,
  },
  scheduleDayText: {
    fontSize: 13,
    color: C.white40,
    fontWeight: "600",
  },
  scheduleDayTextActive: {
    color: C.cyan,
  },
  scheduleModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  scheduleDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    gap: 6,
  },
  scheduleDeleteButtonText: {
    color: C.danger,
    fontWeight: "600",
    fontSize: 14,
  },
  scheduleModalButtonsRight: {
    flexDirection: "row",
    gap: 10,
  },
  scheduleCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleCancelButtonText: {
    color: C.white40,
    fontSize: 14,
    fontWeight: "600",
  },
  scheduleSaveButton: {
    backgroundColor: C.cyan,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 11,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleSaveButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Misc ─────────────────────────────────────────────────────────────────
  bottomPadding: {
    height: 40,
  },

  // TV chips
  tvChipsRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 4,
  },
  tvChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,229,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.30)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tvChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  tvChipAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tvChipAddText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00E5FF",
  },
});

export default PlaylistContent;
