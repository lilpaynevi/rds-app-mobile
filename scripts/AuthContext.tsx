// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { Redirect, router, useRouter } from "expo-router";
import { Alert } from "react-native";
import {
  authlogin,
  authMe,
  authRegister,
  authResetPassword,
} from "@/requests/auth.requests";
import api from "./fetch.api";

// Types pour l'utilisateur et le contexte d'authentification
type User = {
  firstName: string;
  lastName: string;
  email: string;
  company: string
  isActive: boolean
  id: string;
};


export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  quantity: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentMaxScreens: number;
  usedScreens: number;
  plan: Plan;
  metadata: SubscriptionMetadata;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  planType: PlanType;
  stripeProductId: string;
  stripePriceId: string;
  maxScreens: number | null;
  maxStorage: number | null;
  maxMediaFiles: number | null;
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  parentPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
  UNPAID = 'UNPAID',
}

export enum PlanType {
  MAIN = 'MAIN',
  OPTION = 'OPTION',
  ADDON = 'ADDON',
}



type DecodedToken = {
  exp: number;
  iat: number;
  sub: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  decodedToken: DecodedToken | null;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateNewInfoUser: (a: any) => Promise<void>;
  isLoading: boolean;
  subscription: Subscription[];
  getSubscription: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [codepin, setCodePin] = useState<string | "">("");
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
  const [subscription, setSubscription] = useState<any>([]);

  const router = useRouter();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const token = await AsyncStorage.getItem("authToken");
        const subStripe = await AsyncStorage.getItem("subscription");

        if (storedUser && token) {
          setUser(JSON.parse(storedUser));

          const isDriver = await authMe();

          if (isDriver.status === false) {
            logout();
          }

          console.warn("🚀 ~ loadUserData ~ isDriver lo:", isDriver);

          setSubscription(isDriver.subscription);

          setAccessToken(token);
          const decoded = jwtDecode<DecodedToken>(token);
          setDecodedToken(decoded);

          router.push("/home");
        }
      } catch (e) {
        console.log(
          "Erreur lors de la récupération des données utilisateur",
          e
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loginUser = await authlogin(email, password);

      if (loginUser?.access_token) {
        await AsyncStorage.setItem("authToken", loginUser.access_token);
        setAccessToken(loginUser.access_token);

        const decoded = jwtDecode<DecodedToken>(loginUser.access_token);
        setDecodedToken(decoded);

        const me = await authMe();
        console.log("🚀 ~ login ~ me:", me);
        var dataUser = {
          id: me.sub,
          sub: me.sub,
          firstName: me.firstName,
          lastName: me.lastName,
          email: me.email,
          isActive: me.isActive,
          company: me.company
        }

        await AsyncStorage.setItem(
          "user",
          JSON.stringify(dataUser)
        );

        setUser(dataUser);

        setSubscription(me.subscription);

        return router.replace("/home");
      } else {
        Alert.alert("Erreur de connexion", loginUser.err);
      }
    } catch (error) {
      console.error("Login failed", error);
      Alert.alert(
        "Échec de la connexion",
        "Identifiant ou mot de passe incorrect"
      );
    } finally {
      setIsLoading(false);
    }

    return null; // Retourner null en cas d'échec
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    setIsLoading(true);

    try {
      const response = await authRegister(data);

      if (response) {
        return router.push("/home");
      }
    } catch (error: any) {
      console.error("Registration failed", error);

      let errorMessage = "Une erreur est survenue lors de l'inscription";

      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const loginUser = await authResetPassword(email);

      // if (loginUser?.access_token) {
      //   await AsyncStorage.setItem("token", response.access_token);
      //   setAccessToken(response.access_token);

      //   const decoded = jwtDecode<DecodedToken>(response.access_token);
      //   setDecodedToken(decoded);

      //   await AsyncStorage.setItem("user", JSON.stringify(decoded));

      //   const me = await auth.me(decoded.sub);
      //   console.log("🚀 ~ login ~ me:", JSON.stringify(me));
      //   setUser({
      //     username: me.username,
      //     sub: me.id,
      //     name: me.name,
      //     // address: me.address
      //   });
      // }
    } catch (error) {
      console.error("Login failed", error);
      Alert.alert("Identifiant ou mot de passe incorrect");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("connected");
      await AsyncStorage.removeItem("authToken");
      console.log("deconnexcion. !!!  ");
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      router.dismissAll();
      router.navigate("/auth/login");
      setIsLoading(false);
    }
  };

  const updateNewInfoUser = async (data: any) => {
    console.log("🚀 ~ updateNewInfoUser ~ data:", data);
    try {
      await AsyncStorage.setItem("user", JSON.stringify(data));
      setUser({
        ...user,
        ...data,
      });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const changeCodePin = async ({ code }: { code: string }) => {
    try {
      return setCodePin(code);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const getSubscription = async () => {
    const isDriver = await authMe();
    console.warn("🚀 ~ loadUserData ~ isDriver SUBS:", isDriver);

    setSubscription(isDriver.subscription);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        updateNewInfoUser,
        logout,
        accessToken,
        decodedToken,
        isLoading,
        resetPassword,
        subscription,
        getSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default {};
