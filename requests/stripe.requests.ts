import api from "@/scripts/fetch.api";
import { useStripe } from "@stripe/stripe-react-native";
import { Alert, Linking } from "react-native";

export const createSession = async (
  priceId: string,
  planId: string,
  data: any
) => {
  try {
    const response = await api.post("/stripe/create-checkout-session", {
      priceId,
      planId,
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        quantity: data.quantity ? Number(data.quantity) : 1,
      },
    });

    const { url } = await response.data;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);

      return true;
    } else {
      Alert.alert("Erreur", "Impossible d'ouvrir le lien de paiement");
    }
  } catch (error) {
    Alert.alert("Erreur", "Erreur lors de la création du paiement");
  } finally {
    return true;
  }
};
