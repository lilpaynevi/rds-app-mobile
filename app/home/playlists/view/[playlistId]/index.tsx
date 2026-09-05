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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AddMediaForm from "@/components/medias/AddMediaForm";
import DurationModal from "@/components/medias/durationModal";
import OrientationModal, {
  MediaOrientation,
} from "@/components/medias/orientationModal";
import RotationModal, {
  MediaRotation,
} from "@/components/medias/rotationModal";
import MediaPreviewImage from "@/components/medias/MediaPreviewImage";
import TVSelectionModal from "@/components/medias/TVSelectionModal";

const { width, height } = Dimensions.get("window");

// Toutes les durées manipulées ici sont en MILLISECONDES : c'est l'unité
// stockée en base (`changeDurationMedia` valide 1000 à 600000) malgré le
// commentaire « in seconds » du schéma Prisma, qui est périmé.
const formatDuration = (durationMs) => {
  if (!durationMs) return "0:00";
  const totalSeconds = Math.round(durationMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// Ne JAMAIS inventer de valeur ici. Cette fonction renvoyait « 10s » quand la
// durée était absente : un média sans durée affichait donc exactement la même
// chose qu'un média réglé sur 10 secondes, et il était impossible de voir que
// rien n'était enregistré.
const formatDurationDisplay = (durationMs) => {
  if (!durationMs) return "Non définie";

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

/**
 * Variante courte pour la vue grille, où la place est comptée.
 * « — » signale explicitement une durée non définie : afficher une valeur
 * inventée empêcherait de voir que rien n'est enregistré.
 */
const formatDurationCompact = (durationMs: number | null | undefined) => {
  if (!durationMs) return "—";
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
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
  const [reorderedMedia, setReorderedMedia] = useState<any[]>([]);

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
                        <MediaPreviewImage
                          url={baseURL + item.url}
                          isVideo
                          style={styles.listImage}
                        />
                        <View style={styles.listPlayOverlay}>
                          <Ionicons name="play" size={12} color="#333" />
                        </View>
                      </View>
                    ) : (
                      <MediaPreviewImage
                        url={baseURL + item.url}
                        isVideo={false}
                        style={styles.listImage}
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

// Composant dédié vidéo — recréé via key sur l'URI
const VideoPlayerView = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    return () => {
      player.release();
    };
  }, [player]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <VideoView
        player={player}
        style={{ width, height: height * 0.7 }}
        allowsPictureInPicture
        nativeControls
      />
    </View>
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
  if (!visible || !media) return null;

  const isVideo =
    media.type === "video" || media.mimeType?.startsWith("video/");

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalViewerContainer}>
        {/* Header */}
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

        {/* Contenu */}
        <View style={styles.modalContent}>
          {isVideo ? (
            <VideoPlayerView key={media.url} uri={baseURL + media.url} />
          ) : (
            <Image
              source={{ uri: baseURL + media.url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Navigation */}
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
      </View>
    </Modal>
  );
};

// Ajoutez ce composant avant le composant principal PlaylistContent
const ScheduleModal = ({ visible, onClose, schedule, onSave, onDelete }) => {
  // Barre de navigation Android (et barre d'accueil iOS). La feuille se dessine
  // DERRIÈRE elle en affichage bord à bord : sans cette marge, « Supprimer »,
  // « Annuler » et « Modifier » se retrouvaient sous les trois boutons système.
  const insets = useSafeAreaInsets();

  // Les bornes de dates sont optionnelles : `null` signifie « aucune limite ».
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    startDate: Date | null;
    endDate: Date | null;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    isActive: boolean;
    priority: number;
  }>({
    title: "",
    description: "",
    startDate: null,
    endDate: null,
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
        // Les bornes de dates sont optionnelles en base. `new Date(null)`
        // renvoyait le 1er janvier 1970 et `new Date(undefined)` une date
        // invalide — les deux se retrouvaient tels quels dans le PATCH.
        startDate: schedule.startDate ? new Date(schedule.startDate) : null,
        endDate: schedule.endDate ? new Date(schedule.endDate) : null,
        startTime: schedule.startTime || "08:00",
        endTime: schedule.endTime || "18:00",
        daysOfWeek: schedule.daysOfWeek || [],
        isActive: schedule.isActive !== undefined ? schedule.isActive : true,
        priority: schedule.priority || 5,
      });
    } else {
      // Reset pour nouvelle programmation — aucune borne de dates par défaut,
      // sinon la programmation expirerait sans que rien ne l'affiche.
      setFormData({
        title: "",
        description: "",
        startDate: null,
        endDate: null,
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

          {/* Zone défilante : le formulaire ne défile pas de lui-même, et son
              contenu dépasse la hauteur maximale de la feuille sur un écran
              compact — il repoussait alors les boutons d'action hors du
              conteneur. `flexShrink` est la clé : sans lui la zone garde la
              hauteur de son contenu au lieu de se comprimer. */}
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
          </ScrollView>

          <View
            style={[
              styles.scheduleModalActions,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
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
  const [playlist, setPlaylist] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState("list");
  const [addMediaModalVisible, setAddMediaModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  /**
   * Avancement de l'envoi, en pourcentage.
   *
   * Indispensable au-delà de quelques mégaoctets : une vidéo de 300 Mo met
   * plusieurs minutes à partir, et un simple indicateur d'activité ne permet pas
   * de distinguer un envoi qui progresse d'un envoi bloqué.
   */
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  // Renommage de la playlist
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Nouveaux states pour les nouvelles fonctionnalités
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [tvAssignModalVisible, setTvAssignModalVisible] = useState(false);
  const [availableTvs, setAvailableTvs] = useState([]);
  const [assignedTvs, setAssignedTvs] = useState<
    {
      id: string;
      televisionId: string;
      name: string;
      isActive: boolean;
      priority: number;
      position: number | null;
    }[]
  >([]);
  const [selectedTv, setSelectedTv] = useState<{
    id: string;
    name?: string;
  } | null>(null);

  // Dans les states existants, ajoutez :
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [orientationModalVisible, setOrientationModalVisible] = useState(false);
  const [rotationModalVisible, setRotationModalVisible] = useState(false);
  const [editingMedia, setEditingMedia] = useState<any>(null);

  const openDurationEditor = (media) => {
    setEditingMedia(media);
    console.debug("🚀 ~ openDurationEditor ~ media:", media);
    setDurationModalVisible(true);
  };

  const openOrientationEditor = (media: any) => {
    setEditingMedia(media);
    setOrientationModalVisible(true);
  };

  const openRotationEditor = (media: any) => {
    setEditingMedia(media);
    setRotationModalVisible(true);
  };

  const handleRotationSave = async (newRotation: MediaRotation) => {
    const previousRotation = editingMedia?.rotation ?? 0;
    const mediaId = editingMedia?.id;

    // Optimiste, avec retour arrière si le serveur refuse.
    setMedia((prevMedia) =>
      prevMedia.map((m) =>
        m.id === mediaId ? { ...m, rotation: newRotation } : m,
      ),
    );

    try {
      await api.patch(`/playlists/${playlistId}/media/${mediaId}/rotation`, {
        rotation: newRotation,
      });
      // Pas de "tv-change-playlist" : le serveur émet
      // "tv-media-rotation-updated", que la TV applique au média en cours sans
      // recharger la playlist.
    } catch (error: any) {
      setMedia((prevMedia) =>
        prevMedia.map((m) =>
          m.id === mediaId ? { ...m, rotation: previousRotation } : m,
        ),
      );
      Alert.alert(
        "Erreur",
        error?.response?.data?.message ??
          error?.message ??
          "Impossible de pivoter le média",
      );
    }
  };

  const handleOrientationSave = async (newOrientation: MediaOrientation) => {
    const previousOrientation = editingMedia?.orientation ?? "AUTO";
    const mediaId = editingMedia?.id;

    // Optimiste : la liste reflète le choix immédiatement, on revient en
    // arrière si le serveur refuse.
    setMedia((prevMedia) =>
      prevMedia.map((m) =>
        m.id === mediaId ? { ...m, orientation: newOrientation } : m,
      ),
    );

    try {
      // Pas de "tv-change-playlist" ici : le serveur émet lui-même
      // "tv-media-orientation-updated" vers les TVs concernées, qui corrigent
      // le média en cours sans recharger la playlist ni repartir du début.
      // Il couvre aussi les TVs où la playlist tourne via la file d'attente,
      // que "tv-change-playlist" rejetait faute de playlist active.
      await api.patch(`/playlists/${playlistId}/media/${mediaId}/orientation`, {
        orientation: newOrientation,
      });
    } catch (error: any) {
      setMedia((prevMedia) =>
        prevMedia.map((m) =>
          m.id === mediaId ? { ...m, orientation: previousOrientation } : m,
        ),
      );
      Alert.alert(
        "Erreur",
        error?.response?.data?.message ||
          "Impossible de mettre à jour l'orientation",
      );
    }
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

      notifyAllTvs("tv-change-playlist", (tvId) => ({
        tvId,
        newPlaylistId: playlistId,
      }));

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

        // Pas de notification manuelle : le serveur prévient lui-même toutes
        // les TVs concernées (celle du planning, celles de la playlist, celles
        // qui l'ont en file d'attente). En émettre une seconde ici faisait
        // recharger la TV deux fois.
        if (res.status === 200) {
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
          // Ne JAMAIS inventer de plage de dates. Une date de fin par défaut à
          // +7 jours faisait expirer la programmation à l'insu de l'utilisateur
          // — aucun champ de date n'est exposé dans le formulaire. Passé ce
          // délai le planning cessait de s'appliquer, et la playlist repassait
          // dans la rotation de la file où elle tournait en continu.
          // `null` = aucune borne, ce que le schéma autorise (DateTime?).
          startDate: scheduleData.startDate ?? null,
          endDate: scheduleData.endDate ?? null,
          isActive:
            scheduleData.isActive !== undefined ? scheduleData.isActive : true,
          priority: scheduleData.priority || 5,
        };

        console.log("📤 POST /schedules", payload);
        const res = await api.post("/schedules", payload);

        if (res.status === 200 || res.status === 201) {
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
              const res = await api.delete(`/schedules/${scheduleId}`);

              // Le serveur renvoie `{ success: true }`. On exige cette
              // confirmation explicite : `SchedulesService.update` a montré
              // qu'un refus pouvait revenir en 200 avec un corps vide, et on
              // annoncerait alors une suppression qui n'a pas eu lieu.
              if (res.data?.success !== true) {
                throw new Error(
                  res.data?.message ??
                    "Le serveur n'a pas confirmé la suppression",
                );
              }

              // Retrait immédiat de l'état local. Le modal reçoit son planning
              // depuis `playlist.schedules[0]` : sans ce nettoyage il se
              // réouvrirait avec les champs du planning supprimé, et son bouton
              // « Supprimer » renverrait un 404.
              setSchedules((prev) =>
                (prev ?? []).filter((s) => s.id !== scheduleId),
              );
              setPlaylist((prev: any) =>
                prev
                  ? {
                      ...prev,
                      schedules: (prev.schedules ?? []).filter(
                        (s) => s.id !== scheduleId,
                      ),
                    }
                  : prev,
              );

              setScheduleModalVisible(false);
              setEditingSchedule(null);

              Alert.alert(
                "Programmation supprimée",
                "Cette playlist n'a plus d'horaires. Si elle est active, elle repasse en diffusion continue.",
              );

              // Resynchronise depuis le serveur : les écrans ont été prévenus
              // de leur côté, l'app doit refléter le même état.
              loadPlaylistContent();
            } catch (error: any) {
              const message =
                error?.response?.data?.message ??
                error?.message ??
                "Impossible de supprimer la programmation";
              console.error("Erreur suppression programmation:", message);
              Alert.alert("Erreur", message);
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
    const tvList =
      assignedTvs.length > 0 ? assignedTvs : selectedTv ? [selectedTv] : [];
    tvList.forEach((tv: any) =>
      socket.emit(event, payloadFn(tv.televisionId ?? tv.id)),
    );
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

      setPlaylist(playlistData);
      setSchedules(playlistData.schedules);
      setSelectedTv(playlistData.televisions[0]?.television || null);

      const positionByTv = new Map(
        (playlistData.queueItems || []).map((q: any) => [
          q.televisionId,
          q.position,
        ]),
      );
      setAssignedTvs(
        playlistData.televisions
          ?.filter((t: any) => t.television)
          .map((t: any) => ({
            id: t.id,
            televisionId: t.televisionId,
            name: t.television.name,
            isActive: t.isActive,
            priority: t.priority,
            position: positionByTv.has(t.televisionId)
              ? positionByTv.get(t.televisionId)
              : null,
          })) || [],
      );

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
          // Même priorité que l'écran (`item.duration ?? item.media.duration`) :
          // la durée portée par l'item vaut pour cette playlist seulement, celle
          // du média est la valeur globale. Lire uniquement la seconde faisait
          // afficher une durée différente de celle réellement diffusée.
          duration: item.duration ?? item.media.duration ?? null,
          orientation: item.orientation || "AUTO",
          rotation: Number(item.rotation) || 0,
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
    console.log("🚀 ~ openMediaViewer ~ mediaItem:", mediaItem);
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
      notifyAllTvs("tv-change-playlist", (tvId) => ({
        tvId,
        newPlaylistId: playlistId,
      }));
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

        if (assignedTvs.some((tv) => tv.isActive)) {
          notifyAllTvs("tv-change-playlist", (tvId) => ({
            tvId,
            newPlaylistId: playlistId,
          }));
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
    const prevIds = new Set(assignedTvs.map((t) => t.televisionId));
    const nextIds = new Set(selectedIds);
    const toAdd = selectedIds.filter((id) => !prevIds.has(id));
    const toRemove = assignedTvs
      .map((t) => t.televisionId)
      .filter((id) => !nextIds.has(id));
    try {
      await Promise.all([
        ...toAdd.map((tvId) =>
          api.patch(`/playlists/${playlistId}/assign-tv`, {
            televisionId: tvId,
            playlistId,
          }),
        ),
        ...toRemove.map((tvId) =>
          api.delete(`/playlists/${playlistId}/unassign-tv/${tvId}`),
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
            setAssignedTvs((prev) =>
              prev.filter((t) => t.televisionId !== tvId),
            );
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
          // `AddMediaForm` renseigne `fileName`, pas `name` : sans ce repli le
          // nom réel était toujours perdu, et le serveur déduisait l'extension
          // du seul mimetype — un PNG finissait enregistré en .jpg.
          name: file.fileName || file.name || `media_${index}`,
        } as any);
      });

      formData.append("playlistId", playlistId);

      // Durée d'affichage choisie pour chaque média, EN MILLISECONDES et dans
      // le même ordre que les fichiers. Sans ça, le serveur appliquait la valeur
      // par défaut de son type (3 s pour une image) et le réglage visible dans
      // le formulaire n'était jamais enregistré.
      formData.append(
        "durations",
        JSON.stringify(
          selectedFiles.map((file) => {
            const seconds = Number(file.duration);
            return Number.isFinite(seconds) && seconds > 0
              ? Math.round(seconds * 1000)
              : null;
          }),
        ),
      );

      // Dimensions des médias, dans le même ordre que les fichiers. Le serveur
      // ne décode pas les fichiers : sans ça, Media.width/height restent nuls
      // et la TV doit deviner l'orientation à la lecture.
      formData.append(
        "dimensions",
        JSON.stringify(
          selectedFiles.map((file) => ({
            width: Number(file.width) || null,
            height: Number(file.height) || null,
          })),
        ),
      );

      console.log("🚀 ~ handleUpload ~ formData:", formData);

      setUploadProgress(0);

      const response = await api.patch("/playlists/" + playlistId, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // `api` n'a volontairement aucun timeout : un envoi de plusieurs
        // centaines de mégaoctets dure bien plus longtemps que n'importe quelle
        // valeur raisonnable.
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert("Succès", "Médias ajoutés avec succès");
        setAddMediaModalVisible(false);
        setSelectedFiles([]);

        if (assignedTvs.some((tv) => tv.isActive)) {
          notifyAllTvs("tv-change-playlist", (tvId) => ({
            tvId,
            newPlaylistId: playlistId,
          }));
        }

        loadPlaylistContent();
      } else {
        throw new Error(response.data?.message || "Erreur lors de l'upload");
      }
    } catch (error: any) {
      // Une erreur axios ne se sérialise pas (JSON.stringify → null) : le détail
      // utile est dans error.response.
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      console.error("Erreur upload:", status ?? "", serverMessage ?? error?.message);

      Alert.alert(
        "Erreur",
        status === 413
          ? "Fichier trop volumineux pour le serveur. Réduisez la définition ou la durée de la vidéo."
          : serverMessage || error?.message || "Impossible d'ajouter les médias",
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const openRenameModal = () => {
    setRenameValue(playlist?.name ?? "");
    setRenameModalVisible(true);
  };

  /**
   * Renomme la playlist.
   *
   * `PATCH /playlists/:id` est la route de mise à jour générale, mais un corps
   * ne portant que `name` ne touche à rien d'autre : la programmation n'est
   * réécrite que si `dateLancement` ET `heureLancement` sont présents, et
   * supprimée que sur `removeSchedule: true`. Les autres champs retombent sur
   * les valeurs existantes.
   */
  const handleRenamePlaylist = async () => {
    const name = renameValue.trim();

    if (!name) {
      Alert.alert("Titre requis", "Le titre ne peut pas être vide.");
      return;
    }
    if (name === playlist?.name) {
      setRenameModalVisible(false);
      return;
    }

    setRenaming(true);
    try {
      await api.patch(`/playlists/${playlistId}`, { name });

      // Mise à jour locale immédiate : l'en-tête affiche le nouveau titre sans
      // attendre le rechargement complet du contenu.
      setPlaylist((previous: any) =>
        previous ? { ...previous, name } : previous,
      );
      setRenameModalVisible(false);
      loadPlaylistContent();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? "Impossible de renommer la playlist";
      console.error("Erreur renommage:", message);
      Alert.alert("Erreur", String(message));
    } finally {
      setRenaming(false);
    }
  };

  // Active/désactive la playlist pour UNE TV donnée — plusieurs TVs peuvent
  // désormais être actives indépendamment (chacune avec sa propre position
  // dans sa file d'attente, gérée côté serveur).
  const toggleTvActive = async (tv: {
    televisionId: string;
    isActive: boolean;
  }) => {
    const newStatus = !tv.isActive;

    setAssignedTvs((prev) =>
      prev.map((t) =>
        t.televisionId === tv.televisionId ? { ...t, isActive: newStatus } : t,
      ),
    );

    try {
      await api.patch(
        `/playlists/${playlistId}/televisionId/${tv.televisionId}/status`,
        { isActive: newStatus },
      );

      // Pas de "tv-change-playlist" ici : le serveur notifie déjà la TV via
      // "tv-queue-updated" (elle refait tv-get-playlist-queue elle-même).
      // Émettre "tv-change-playlist" forcerait un changement d'affichage
      // immédiat et écraserait la rotation de la file en cours.
      loadPlaylistContent();
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le statut");
      setAssignedTvs((prev) =>
        prev.map((t) =>
          t.televisionId === tv.televisionId
            ? { ...t, isActive: tv.isActive }
            : t,
        ),
      );
    }
  };

  // Icône/libellé de l'orientation choisie pour un média
  const ORIENTATION_UI: Record<
    string,
    { icon: keyof typeof Ionicons.glyphMap; label: string }
  > = {
    AUTO: { icon: "sparkles-outline", label: "Auto" },
    LANDSCAPE: { icon: "tablet-landscape-outline", label: "Paysage" },
    PORTRAIT: { icon: "tablet-portrait-outline", label: "Portrait" },
  };

  const renderMediaItem = ({ item, index }) => {
    const isVideo =
      item.type === "video" || item.mimeType?.startsWith("video/");
    const orientationUi =
      ORIENTATION_UI[item.orientation] ?? ORIENTATION_UI.AUTO;

    if (viewMode === "grid") {
      return (
        <TouchableOpacity
          style={styles.gridItemContainer}
          onPress={() => openMediaViewer(item, index)}
          activeOpacity={0.8}
        >
          <View style={styles.gridItem}>
            {/* Miniature autonome : l'image remplit son conteneur, et la
                superposition « lecture » ne dépend plus de la hauteur du bloc
                d'informations. Auparavant le même style servait au conteneur ET
                à l'image, qui n'occupait donc que 78 % de sa propre boîte. */}
            <View style={styles.gridThumbWrap}>
              <MediaPreviewImage
                url={baseURL + item.url}
                isVideo={isVideo}
                style={styles.gridThumbImage}
              />
              {isVideo && (
                <View style={styles.gridPlayOverlay}>
                  <Ionicons
                    name="play-circle"
                    size={34}
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
              )}
            </View>

            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle} numberOfLines={1}>
                {item.title || item.name || "Sans titre"}
              </Text>

              {/* Les trois mêmes actions que la vue liste. Le libellé de type
                  (« 🎥 Vidéo ») a été retiré : il consommait la largeur dont le
                  bouton de durée avait besoin, alors que l'icône de lecture sur
                  la miniature donne déjà l'information. */}
              <View style={styles.mediaMeta}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    openDurationEditor(item);
                  }}
                  style={styles.gridActionButton}
                >
                  <Ionicons name="time-outline" size={13} color={C.accent} />
                  <Text style={styles.gridActionText}>
                    {formatDurationCompact(item.duration)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    openOrientationEditor(item);
                  }}
                  style={[
                    styles.gridActionButton,
                    item.orientation &&
                      item.orientation !== "AUTO" &&
                      styles.gridActionButtonForced,
                  ]}
                >
                  <Ionicons
                    name={orientationUi.icon}
                    size={13}
                    color={C.accent}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    openRotationEditor(item);
                  }}
                  style={[
                    styles.gridActionButton,
                    item.rotation ? styles.gridActionButtonForced : null,
                  ]}
                >
                  <Ionicons name="sync-outline" size={13} color={C.accent} />
                  {item.rotation ? (
                    <Text style={styles.gridActionText}>{item.rotation}°</Text>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    confirmDeleteMedia(item.id);
                  }}
                  style={styles.gridDeleteButton}
                >
                  <Ionicons name="trash-bin" size={13} color={C.danger} />
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
        {/* Ligne du haut : identité du média. Les réglages sont sur leur propre
            ligne en dessous — quatre boutons libellés en concurrence avec le
            titre le réduisaient à zéro et poussaient la corbeille hors écran. */}
        <View style={styles.listTopRow}>
        <Text style={styles.orderNumber}>{index + 1}</Text>

        <View style={styles.listThumbnail}>
          {isVideo ? (
            <View style={styles.videoListThumbnail}>
              <MediaPreviewImage
                url={baseURL + item.url}
                isVideo
                style={styles.listImage}
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
            <MediaPreviewImage
              url={baseURL + item.url}
              isVideo={false}
              style={styles.listImage}
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

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              confirmDeleteMedia(item.id);
            }}
            style={styles.listDeleteButton}
          >
            <Ionicons name="trash-bin" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* Ligne des réglages : trois boutons de largeur égale, donc jamais
            tronqués quelle que soit la longueur du libellé. */}
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
              openOrientationEditor(item);
            }}
            style={[
              styles.orientationButton,
              item.orientation &&
                item.orientation !== "AUTO" &&
                styles.orientationButtonForced,
            ]}
          >
            <Ionicons name={orientationUi.icon} size={18} color="#2575fc" />
            <Text style={styles.durationButtonText}>{orientationUi.label}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openRotationEditor(item);
            }}
            style={[
              styles.orientationButton,
              item.rotation ? styles.orientationButtonForced : null,
            ]}
          >
            <Ionicons name="sync-outline" size={18} color="#2575fc" />
            <Text style={styles.durationButtonText}>
              {item.rotation ? `${item.rotation}°` : "Pivoter"}
            </Text>
          </TouchableOpacity>
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
            {/* Titre éditable. Le crayon rend l'action visible : un titre
                simplement cliquable ne se signale pas. */}
            <TouchableOpacity
              onPress={openRenameModal}
              style={styles.headerTitleRow}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Renommer la playlist"
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {playlist?.name || "Ma Playlist"}
              </Text>
              <Ionicons name="pencil" size={15} color="#00E5FF" />
            </TouchableOpacity>
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

        {/* TVs assignées — activation et position dans la file, par TV */}
        <View style={styles.tvAssignSection}>
          {assignedTvs.length === 0 ? (
            <TouchableOpacity
              style={styles.tvChipAdd}
              onPress={() => setTvAssignModalVisible(true)}
            >
              <Ionicons name="add" size={15} color="#00E5FF" />
              <Text style={styles.tvChipAddText}>Assigner une TV</Text>
            </TouchableOpacity>
          ) : (
            <>
              {assignedTvs.map((tv) => (
                <View key={tv.id} style={styles.tvAssignRow}>
                  <View style={styles.tvAssignInfo}>
                    <Ionicons name="tv" size={15} color="#00E5FF" />
                    <Text style={styles.tvAssignName} numberOfLines={1}>
                      {tv.name}
                    </Text>
                    {tv.isActive && tv.position !== null && (
                      <View style={styles.tvAssignPositionBadge}>
                        <Text style={styles.tvAssignPositionText}>
                          #{tv.position + 1}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.tvAssignActions}>
                    <Switch
                      value={tv.isActive}
                      onValueChange={() => toggleTvActive(tv)}
                      trackColor={{ false: "#767577", true: "#00E5FF" }}
                      thumbColor={tv.isActive ? "#fff" : "#f4f3f4"}
                    />
                    <TouchableOpacity
                      onPress={() => handleUnassignTv(tv.televisionId)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={17}
                        color="rgba(255,255,255,0.5)"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.tvChipAdd}
                onPress={() => setTvAssignModalVisible(true)}
              >
                <Ionicons name="add" size={15} color="#00E5FF" />
                <Text style={styles.tvChipAddText}>Gérer les TVs</Text>
              </TouchableOpacity>
            </>
          )}
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
        assignedTvIds={assignedTvs.map((t) => t.televisionId)}
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
        // `null`, jamais `[]` : un tableau vide est TRUTHY, le modal le prenait
        // donc pour un planning existant, affichait le bouton « Supprimer » et
        // calculait `new Date(undefined)` sur ses dates.
        schedule={playlist?.schedules?.[0] ?? null}
        onSave={handleScheduleSave}
        onDelete={handleScheduleDelete}
      />

      {/* Renommage de la playlist. Boîte centrée et non feuille ancrée en bas :
          elle échappe ainsi à la barre de navigation Android, et le clavier
          n'a qu'un champ à dégager. */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.renameOverlay}>
          <View style={styles.renameContainer}>
            <Text style={styles.renameTitle}>Renommer la playlist</Text>

            <TextInput
              style={styles.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Titre de la playlist"
              placeholderTextColor={C.white40}
              autoFocus
              selectTextOnFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleRenamePlaylist}
              editable={!renaming}
            />

            <View style={styles.renameActions}>
              <TouchableOpacity
                style={styles.renameCancel}
                onPress={() => setRenameModalVisible(false)}
                disabled={renaming}
              >
                <Text style={styles.renameCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.renameConfirm,
                  (renaming || !renameValue.trim()) &&
                    styles.renameConfirmDisabled,
                ]}
                onPress={handleRenamePlaylist}
                disabled={renaming || !renameValue.trim()}
              >
                {renaming ? (
                  <ActivityIndicator size="small" color={C.bgDeep} />
                ) : (
                  <Text style={styles.renameConfirmText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DurationModal
        visible={durationModalVisible}
        onClose={() => setDurationModalVisible(false)}
        onSelect={handleDurationSave}
        // En millisecondes. Le repli valait 10, soit 10 ms, que le modal
        // arrondissait à « 0s » : le sélecteur s'ouvrait sur zéro seconde.
        currentDuration={editingMedia?.duration || 10000}
        mediaTitle={editingMedia?.title}
      />

      <OrientationModal
        visible={orientationModalVisible}
        onClose={() => setOrientationModalVisible(false)}
        onSelect={handleOrientationSave}
        currentOrientation={editingMedia?.orientation || "AUTO"}
        mediaTitle={editingMedia?.title}
      />

      <RotationModal
        visible={rotationModalVisible}
        onClose={() => setRotationModalVisible(false)}
        onSelect={handleRotationSave}
        currentRotation={editingMedia?.rotation ?? 0}
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
                <View style={styles.modalUploadProgress}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.modalUploadButtonText}>
                    {uploadProgress > 0 ? `${uploadProgress} %` : "Envoi…"}
                  </Text>
                </View>
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
  // Le crayon doit rester visible quel que soit le titre : c'est le texte qui
  // se comprime et se tronque, jamais l'icône.
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.white,
    marginBottom: 5,
    letterSpacing: -0.4,
    flexShrink: 1,
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
  tvAssignSection: {
    marginHorizontal: 20,
    marginTop: 6,
    gap: 8,
  },
  tvAssignRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.white05,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tvAssignInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  tvAssignName: {
    fontSize: 13,
    fontWeight: "600",
    color: C.white,
    flexShrink: 1,
  },
  tvAssignPositionBadge: {
    backgroundColor: "rgba(0,229,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.30)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tvAssignPositionText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00E5FF",
  },
  tvAssignActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  // Colonne : ligne d'identité, puis ligne de réglages
  listItemContainer: {
    backgroundColor: C.bgCard,
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  listTopRow: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "stretch",
    gap: 8,
  },
  listDeleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    marginLeft: 8,
  },
  // `flex: 1` sur les trois boutons de réglage : ils se partagent la largeur à
  // égalité et aucun libellé n'est tronqué, quelle que soit sa longueur.
  durationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  durationButtonText: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "600",
    // Le libellé cède avant le bouton : sur un écran étroit il se réduit au
    // lieu de faire déborder la rangée.
    flexShrink: 1,
  },
  orientationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  // Orientation forcée : bordure pleine pour la distinguer d'un simple "Auto"
  orientationButtonForced: {
    borderColor: C.accent,
  },
  gridOrientationButton: {
    padding: 3,
    marginRight: 4,
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
  // Miniature de la grille : le conteneur porte la hauteur, l'image la remplit.
  gridThumbWrap: {
    width: "100%",
    height: "64%",
    position: "relative",
    backgroundColor: C.white05,
  },
  gridThumbImage: {
    width: "100%",
    height: "100%",
  },
  gridPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  // 36 % de la carte : il faut de la place pour le titre ET les trois actions.
  mediaInfo: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    height: "36%",
    justifyContent: "space-between",
  },
  mediaTitle: {
    color: C.white,
    fontSize: 11,
    fontWeight: "600",
  },
  mediaMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mediaType: {
    color: C.white40,
    fontSize: 10,
    flex: 1,
  },
  gridActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
  },
  // Orientation forcée : bordure pleine, comme en vue liste
  gridActionButtonForced: {
    borderColor: C.accent,
  },
  gridActionText: {
    color: C.accent,
    fontSize: 9,
    fontWeight: "700",
  },
  gridDeleteButton: {
    marginLeft: "auto",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
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
  modalUploadProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  // ── Rename modal ──────────────────────────────────────────────────────────
  renameOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  renameContainer: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 16,
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.white,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: C.cyanBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.white,
    backgroundColor: C.white05,
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  renameCancel: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: C.white10,
    borderWidth: 1,
    borderColor: C.border,
  },
  renameCancelText: {
    color: C.white40,
    fontSize: 14,
    fontWeight: "600",
  },
  renameConfirm: {
    minWidth: 118,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 11,
    backgroundColor: C.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  renameConfirmDisabled: {
    opacity: 0.45,
  },
  renameConfirmText: {
    color: C.bgDeep,
    fontSize: 14,
    fontWeight: "700",
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
