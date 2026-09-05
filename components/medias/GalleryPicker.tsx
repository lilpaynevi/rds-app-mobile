import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";

/**
 * Sélecteur de médiathèque.
 *
 * Remplace `ImagePicker.launchImageLibraryAsync` pour une seule raison : le
 * sélecteur système d'Android **recopie** le fichier choisi dans le cache de
 * l'application avant de le rendre, et `expo-image-picker` n'offre aucun moyen
 * de l'en empêcher. Sur une vidéo de plusieurs centaines de mégaoctets, cette
 * copie est longue et échoue — c'est elle qui produisait « Impossible de
 * sélectionner les médias ».
 *
 * `expo-media-library` lit la médiathèque directement : on obtient le chemin du
 * fichier d'origine, sans duplication, quelle que soit sa taille. En prime, la
 * médiathèque fournit `width`, `height` et `duration`, que le sélecteur système
 * ne donnait pas toujours — l'orientation à la diffusion s'en trouve fiabilisée.
 */

/** Nombre de médias chargés par page. */
const PAGE_SIZE = 60;

const COLUMNS = 3;

type Filter = "all" | "photo" | "video";

export type PickedAsset = {
  id: string;
  uri: string;
  type: "image" | "video";
  fileName: string;
  width: number | null;
  height: number | null;
  /** Durée du média en secondes, uniquement pour les vidéos. */
  mediaDuration: number | null;
};

const formatDuration = (seconds: number): string => {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
};

export default function GalleryPicker({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (assets: PickedAsset[]) => void;
}) {
  const [permission, requestPermission] = MediaLibrary.usePermissions();

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<MediaLibrary.Asset[]>([]);

  const mediaType =
    filter === "photo"
      ? [MediaLibrary.MediaType.photo]
      : filter === "video"
        ? [MediaLibrary.MediaType.video]
        : [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

  /**
   * Charge une page. `reset` repart du début — changement de filtre, ou
   * réouverture : la médiathèque a pu changer entre-temps.
   */
  const loadPage = useCallback(
    async (reset: boolean) => {
      if (isLoading) return;
      if (!reset && !hasNextPage) return;

      setIsLoading(true);
      try {
        const page = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after: reset ? undefined : cursor,
          mediaType,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        setAssets((previous) =>
          reset ? page.assets : [...previous, ...page.assets],
        );
        setCursor(page.endCursor);
        setHasNextPage(page.hasNextPage);
      } catch (error: any) {
        console.error("Erreur lecture médiathèque:", error);
      } finally {
        setIsLoading(false);
      }
    },
    // `mediaType` est recalculé à chaque rendu : on dépend de `filter`, sa
    // seule source de variation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cursor, hasNextPage, isLoading, filter],
  );

  // Ouverture et changement de filtre : on repart d'une liste vide.
  useEffect(() => {
    if (!visible) return;
    if (!permission?.granted) return;

    setAssets([]);
    setCursor(undefined);
    setHasNextPage(true);
    loadPage(true);
    // `loadPage` change à chaque rendu ; ne dépendre que des déclencheurs réels
    // évite une boucle de chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, filter, permission?.granted]);

  // La sélection ne survit pas à la fermeture : la rouvrir doit repartir de zéro.
  useEffect(() => {
    if (!visible) setSelected([]);
  }, [visible]);

  const toggle = (asset: MediaLibrary.Asset) => {
    setSelected((previous) =>
      previous.some((item) => item.id === asset.id)
        ? previous.filter((item) => item.id !== asset.id)
        : [...previous, asset],
    );
  };

  /**
   * Résout le chemin réel de chaque média sélectionné.
   *
   * `asset.uri` suffit à l'affichage de la vignette, mais pas toujours à
   * l'envoi : sur iOS c'est une référence `ph://`. `getAssetInfoAsync` renvoie
   * `localUri`, le fichier lui-même — sans le copier.
   */
  const confirm = async () => {
    if (selected.length === 0) return;

    setIsResolving(true);
    try {
      const resolved: PickedAsset[] = await Promise.all(
        selected.map(async (asset) => {
          let uri = asset.uri;
          try {
            const info = await MediaLibrary.getAssetInfoAsync(asset);
            uri = info.localUri ?? asset.uri;
          } catch (error) {
            // Chemin d'origine indisponible : `asset.uri` reste exploitable sur
            // Android, où il désigne déjà le fichier.
            console.warn("Chemin d'origine indisponible:", error);
          }

          return {
            id: asset.id,
            uri,
            type:
              asset.mediaType === MediaLibrary.MediaType.video
                ? "video"
                : "image",
            fileName: asset.filename,
            width: asset.width || null,
            height: asset.height || null,
            mediaDuration: asset.duration || null,
          };
        }),
      );

      onConfirm(resolved);
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  const renderPermissionGate = () => (
    <View style={styles.centered}>
      <Ionicons name="images-outline" size={48} color="#999" />
      <Text style={styles.gateTitle}>Accès à la médiathèque</Text>
      <Text style={styles.gateText}>
        L&apos;application a besoin d&apos;accéder à vos photos et vidéos pour
        les ajouter à une playlist.
      </Text>
      <TouchableOpacity style={styles.gateButton} onPress={requestPermission}>
        <Text style={styles.gateButtonText}>Autoriser</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#1B2845" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ma galerie</Text>
          <TouchableOpacity
            onPress={confirm}
            disabled={selected.length === 0 || isResolving}
            style={[
              styles.confirmButton,
              (selected.length === 0 || isResolving) &&
                styles.confirmButtonDisabled,
            ]}
          >
            {isResolving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                Ajouter{selected.length > 0 ? ` (${selected.length})` : ""}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.filters}>
          {(
            [
              { key: "all", label: "Tout" },
              { key: "photo", label: "Photos" },
              { key: "video", label: "Vidéos" },
            ] as { key: Filter; label: string }[]
          ).map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterChip,
                filter === item.key && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2575fc" />
          </View>
        ) : !permission.granted ? (
          renderPermissionGate()
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            onEndReached={() => loadPage(false)}
            onEndReachedThreshold={0.6}
            ListEmptyComponent={
              isLoading ? null : (
                <View style={styles.centered}>
                  <Text style={styles.gateText}>Aucun média trouvé</Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#2575fc"
                  style={styles.footerLoader}
                />
              ) : null
            }
            renderItem={({ item }) => {
              const index = selected.findIndex(
                (asset) => asset.id === item.id,
              );
              const isSelected = index !== -1;
              const isVideo = item.mediaType === MediaLibrary.MediaType.video;

              return (
                <TouchableOpacity
                  style={styles.cell}
                  onPress={() => toggle(item)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.uri }} style={styles.thumbnail} />

                  {isVideo && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="videocam" size={11} color="#fff" />
                      {item.duration > 0 && (
                        <Text style={styles.videoDuration}>
                          {formatDuration(item.duration)}
                        </Text>
                      )}
                    </View>
                  )}

                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedRank}>{index + 1}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  headerButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1B2845", flex: 1 },
  confirmButton: {
    minWidth: 104,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "#2575fc",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: { backgroundColor: "#E3F2FD", borderColor: "#2575fc" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#666" },
  filterTextActive: { color: "#2575fc" },

  cell: {
    flex: 1 / COLUMNS,
    aspectRatio: 1,
    padding: 1.5,
  },
  thumbnail: { width: "100%", height: "100%", backgroundColor: "#eee" },
  videoBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  videoDuration: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    margin: 1.5,
    borderWidth: 3,
    borderColor: "#2575fc",
    backgroundColor: "rgba(37,117,252,0.18)",
  },
  selectedBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2575fc",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRank: { color: "#fff", fontSize: 11, fontWeight: "800" },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  gateTitle: { fontSize: 17, fontWeight: "700", color: "#1B2845" },
  gateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  gateButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2575fc",
  },
  gateButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  footerLoader: { marginVertical: 16 },
});
