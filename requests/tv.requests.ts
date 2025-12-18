import api from "@/scripts/fetch.api";
import { socket } from "@/scripts/socket.io";
import { router } from "expo-router";
import { Alert } from "react-native";

export interface DissociateUserResponse {
  success: boolean;
  message?: string;
}

export const getMyTVs = async () => {
  const TV = await api.get("/televisions/me");
  return TV.data;
};

export const dissociatedUser = async (
  tvId: string
): Promise<DissociateUserResponse> => {
  try {
    const deleteTVrq = await api.get(
      "/televisions/" + tvId + "/user/dissociated"
    );
    if (deleteTVrq) {
      socket.emit("leave-room", { roomName: "tv:" + tvId, tvId });

      Alert.alert("✅", "Télévision supprimée", [
        {
          text: `Retour à la page d'acceuil`,
          onPress: () => router.navigate("/home"),
        },
      ]);

      return {
        success: true,
        message: "dissocié avec succès",
      };
    }

    return {
      success: false,
      message: "Erreur lors de la dissociation",
    };
  } catch (error) {
    Alert.alert("Erreur", error.message);
    return {
      success: false,
      message: error.message || "Erreur inconnue",
    };
  }
};
