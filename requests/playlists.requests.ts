// services/mediaService.js
import api, { baseURL } from "@/scripts/fetch.api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Erreur récupération token:", error);
    return null;
  }
};

export const uploadMedia = async (mediaFile: any, onProgress = null) => {
  try {
    const token = await this.getAuthToken();

    const formData = new FormData();

    // Ajouter le fichier
    formData.append("media", {
      uri: mediaFile.uri,
      type: mediaFile.mimeType,
      name: mediaFile.fileName,
    });

    // Métadonnées
    formData.append(
      "metadata",
      JSON.stringify({
        originalName: mediaFile.fileName,
        type: mediaFile.type,
        duration: mediaFile.duration,
        width: mediaFile.width,
        height: mediaFile.height,
        fileSize: mediaFile.fileSize,
      })
    );

    const response = await fetch(`${baseURL}/medias/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur upload média:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const uploadMultipleMedia = async (
  mediaFiles: any,
  onProgress = null
) => {
  const results = [];
  const total = mediaFiles.length;

  for (let i = 0; i < mediaFiles.length; i++) {
    const media = mediaFiles[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        currentFile: media.fileName,
      });
    }

    const result = await this.uploadMedia(media);
    results.push({
      originalMedia: media,
      uploadResult: result,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
};

export const createPlaylist = async (playlistData: any) => {
  const token = await getAuthToken();
  try {
    const formData = new FormData();

    // 1️⃣ Ajouter les données JSON
    const playlistInfo = {
      titre: playlistData.titre,
      television: playlistData.television,
      nombreMedias: playlistData.nombreMedias,
      dateLancement: playlistData.dateLancement,
      isActive: playlistData.isActive,
      heureLancement: playlistData.heureLancement,
      schedule: {
        startDate: playlistData.startDate,
        endDate: playlistData.endDate,
        endTime: playlistData.endTime,
        startTime: playlistData.startTime,
        daysOfWeek: playlistData.daysOfWeek,
      },
      items: playlistData.items.map((item: any) => ({
        id: item.id,
        type: item.type,
        fileName: item.fileName,
        duration: item.duration,
      })),
    };

    formData.append("playlistData", JSON.stringify(playlistInfo));

    // 2️⃣ Ajouter chaque fichier
    for (const item of playlistData.items) {
      if (item.uri && item.uri.startsWith("file://")) {
        const fileUri = item.uri;
        const fileName = item.fileName;
        const duration = item.duration;
        const fileType = item.type === "video" ? "video/mp4" : "image/jpeg";

        // Créer l'objet fichier pour React Native
        const fileObject = {
          uri: fileUri,
          type: fileType,
          name: fileName,
          duration,
        } as any;

        formData.append("files", fileObject);
      }
    }

    // 3️⃣ Envoyer la requête
    const response = await fetch(`${baseURL}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur création playlist:", error);
    throw error;
  }
};

export const myPlaylists = async () => {
  const res = await api.get("/playlists/me");
  return res.data;
};
