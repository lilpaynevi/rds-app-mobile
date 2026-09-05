import React, { useEffect, useState } from "react";
import { Image, View, StyleSheet, type StyleProp, type ImageStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";

/**
 * Vignettes vidéo déjà extraites, partagées par tous les rendus.
 *
 * Le cache est au niveau du module, pas du composant : la même vidéo apparaît
 * en vue liste et en vue grille, et chaque défilement remonte les composants.
 * Sans ce partage, la vidéo serait retéléchargée à chaque fois juste pour en
 * refaire une image.
 */
const thumbnailCache = new Map<string, string>();

/** Extractions en cours, pour ne pas lancer deux fois la même. */
const pending = new Map<string, Promise<string | null>>();

/** Instant de la capture, en ms. La toute première image est souvent noire. */
const CAPTURE_TIME = 1000;

async function extractThumbnail(url: string): Promise<string | null> {
  const cached = thumbnailCache.get(url);
  if (cached) return cached;

  const inFlight = pending.get(url);
  if (inFlight) return inFlight;

  const task = VideoThumbnails.getThumbnailAsync(url, {
    time: CAPTURE_TIME,
    quality: 0.6,
  })
    .then(({ uri }) => {
      thumbnailCache.set(url, uri);
      return uri;
    })
    .catch((error) => {
      // Codec non géré, réseau, URL invalide… On ne bloque pas l'affichage :
      // l'appelant retombe sur son visuel de repli.
      console.warn("⚠️ Vignette vidéo indisponible:", url, error?.message);
      return null;
    })
    .finally(() => {
      pending.delete(url);
    });

  pending.set(url, task);
  return task;
}

/**
 * Aperçu d'un média. Pour une vidéo, extrait une image du fichier plutôt que de
 * la confier à `<Image>`, qui ne sait pas décoder une vidéo et n'affichait donc
 * qu'un cadre vide.
 */
export function MediaPreviewImage({
  url,
  isVideo,
  style,
  resizeMode = "cover",
}: {
  url: string;
  isVideo: boolean;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain";
}) {
  const [preview, setPreview] = useState<string | null>(() =>
    isVideo ? (thumbnailCache.get(url) ?? null) : null,
  );

  useEffect(() => {
    if (!isVideo || !url) return;

    const cached = thumbnailCache.get(url);
    if (cached) {
      setPreview(cached);
      return;
    }

    let cancelled = false;
    setPreview(null);

    extractThumbnail(url).then((uri) => {
      if (!cancelled) setPreview(uri);
    });

    return () => {
      cancelled = true;
    };
  }, [url, isVideo]);

  // Vidéo dont la vignette n'est pas encore prête, ou impossible à extraire
  if (isVideo && !preview) {
    return (
      <View style={[style as any, styles.placeholder]}>
        <Ionicons name="videocam" size={20} color="rgba(255,255,255,0.35)" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: isVideo ? (preview as string) : url }}
      style={style}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});

export default MediaPreviewImage;
