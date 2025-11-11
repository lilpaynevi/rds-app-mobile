import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const baseURL = process.env.EXPO_PUBLIC_BASE_URL;

console.log("🚀 ~ baseURL:", baseURL);

const api = axios.create({
  baseURL,
  // timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiImage = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

export const getToken = async () => {
  try {
    if (typeof window === "undefined") {
      console.warn(
        "L'environnement n'a pas d'accès à window. AsyncStorage non disponible."
      );
      return null;
    }

    const token = await AsyncStorage.getItem("authToken");
    return token;
  } catch (error) {
    console.error("Erreur lors de la récupération du token:", error);
    return null;
  }
};

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiImage.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
