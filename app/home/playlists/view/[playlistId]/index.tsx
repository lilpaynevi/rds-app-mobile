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
import { Ionicons } from "@expo/vector-icons";
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
            <Text style={styles.modalSaveButtonText}>Sauvegarder</Text>
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
    }
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
    console.log("newData : ", data);

    if (formData.daysOfWeek.length === 0) {
      Alert.alert("Erreur", "Sélectionnez au moins un jour");
      return;
    }
    onSave(data);
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
              setData({
                ...data,
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
  const [tvSelectionVisible, setTvSelectionVisible] = useState(false);
  const [availableTvs, setAvailableTvs] = useState([]);
  const [selectedTv, setSelectedTv] = useState(null);

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
        { duration: newDuration }
      );

      // Mise à jour locale
      setMedia((prevMedia) =>
        prevMedia.map((m) =>
          m.id === editingMedia.id ? { ...m, duration: newDuration } : m
        )
      );

      if (isActive && selectedTv != null) {
        socket.emit("tv-change-playlist", {
          tvId: selectedTv.id,
          newPlaylistId: playlistId,
        });
      }

      Alert.alert("Succès", "Durée mise à jour");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour la durée");
    }
  };

  const handleScheduleSave = async (scheduleData) => {
    try {
      setLoading(true);

      const payload = {
        ...scheduleData,
      };
      console.log("🚀 ~ handleScheduleSave ~ payload:", payload);

      const res = await api.patch(`/schedules/${schedules[0].id}`, payload);

      // if (editingSchedule) {
      //   await api.patch(`/schedules/${payload.scheduleId}`, payload);
      // } else {
      //   await api.post("/schedules", payload);
      // }

      if (res.status != 400) {
        setScheduleModalVisible(false);
        setEditingSchedule(null);
      }
      loadPlaylistContent();
    } catch (error) {
      console.error("Erreur sauvegarde programmation:", error);
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
      ]
    );
  };

  const openScheduleModal = (schedule = null) => {
    setEditingSchedule(schedule);
    setScheduleModalVisible(true);
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
        JSON.stringify(playlistData)
      );

      setPlaylist(playlistData);
      setIsActive(playlistData.isActive);
      setSchedules(playlistData.schedules);
      setSelectedTv(playlistData.televisions[0]?.television || null);

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
      ]
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
      if (isActive === true && selectedTv) {
        socket.emit("tv-change-playlist", {
          tvId: selectedTv.id,
          newPlaylistId: playlist.id,
        });
      }
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
        orderUpdates
      );
      console.log("🚀 ~ handleReorderMedia ~ request:", request.data);

      if (request.status === 200) {
        setMedia(reorderedMedia);

        if (isActive && selectedTv) {
          socket.emit("tv-change-playlist", {
            tvId: selectedTv.id,
            newPlaylistId: playlistId,
          });
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

  // Nouvelle fonction pour changer de TV
  const handleTvSelection = async (tv) => {
    try {
      setLoading(true);

      const ppp = await api.patch(`/playlists/${playlistId}/assign-tv`, {
        televisionId: tv.id,
        playlistId,
      });
      console.log("🚀 ~ handleTvSelection ~ ppp:", ppp.data);

      setSelectedTv(tv);
      setTvSelectionVisible(false);

      if (isActive) {
        socket.emit("tv-change-playlist", {
          tvId: tv.id,
          newPlaylistId: playlistId,
        });
      }

      // Recharger pour avoir les données à jour
      loadPlaylistContent();
    } catch (error) {
      console.error("Erreur assignation TV:", error);
      Alert.alert("Erreur", "Impossible d'assigner la playlist à cette TV");
    } finally {
      setLoading(false);
    }
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission requise",
        "Nous avons besoin de l'accès à votre galerie pour sélectionner des médias"
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

        if (isActive && selectedTv) {
          socket.emit("tv-change-playlist", {
            tvId: selectedTv.id,
            newPlaylistId: playlist.id,
          });
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
    if (!selectedTv) {
      Alert.alert("Erreur", "Sélectionnez d'abord une TV pour cette playlist");
      return;
    }

    try {
      const newStatus = !isActive;
      await api.patch(
        `/playlists/${playlistId}/televisionId/${selectedTv.id}/status`,
        {
          isActive: newStatus,
        }
      );
      setIsActive(newStatus);
      socket.emit("tv-change-playlist", {
        tvId: selectedTv.id,
        newPlaylistId: playlistId,
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
              onPress={() => setTvSelectionVisible(true)}
              style={styles.tvSelector}
            >
              <Text style={styles.headerSubtitle}>
                {media.length} élément{media.length !== 1 ? "s" : ""} •{" "}
                {selectedTv?.name || "Aucune TV"}
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
            disabled={!selectedTv}
          />
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

      {/* Modal de sélection TV */}
      <TVSelectionModal
        visible={tvSelectionVisible}
        onClose={() => setTvSelectionVisible(false)}
        onSelect={handleTvSelection}
        currentTv={selectedTv}
        tvs={availableTvs}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  durationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  durationButtonText: {
    fontSize: 13,
    color: "#2575fc",
    fontWeight: "600",
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

export default PlaylistContent;
