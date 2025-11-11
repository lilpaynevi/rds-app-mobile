import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, View } from "react-native";
import LoginScreen from "./auth/login";
import HomeScreen from "./home";
import { useAuth } from "@/scripts/AuthContext";
import { authMe } from "@/requests/auth.requests";
import { Redirect, router } from "expo-router";
import "../globals.css"
export default function IndexRoot() {
  const { user, login, logout, isLoading, accessToken } = useAuth();
  const [isActive, setIsActive] = useState(false);

  if (accessToken) {
    return <Redirect href={"/home"} />;
  }

 

  const handleDeepLink = ({ url }: { url: string }) => {
    console.log('🔗 Deep link reçu:', url);
    
    const { path, queryParams } = JSON.parse(url);

    if (path === 'success') {
      router.navigate('/PaymentSuccess');
    } else if (path === 'cancel') {
      router.navigate('/PaymentCancel');
    } else if (path === 'error') {
      Alert.alert('Erreur', queryParams?.message || 'Une erreur est survenue');
    }
  };

  return (
    <View>
      <LoginScreen />
      {/* <HomeScreen /> */}
    </View>
  );
}
