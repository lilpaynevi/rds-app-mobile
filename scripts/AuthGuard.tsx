import { useEffect } from "react";
import { useAuth } from "./AuthContext"; // Assurez-vous que ce chemin correspond à votre structure
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function AuthGuard({ children }) {
  const { user, accessToken, login, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && accessToken && user?.isEmailVerified && user?.verified === true) {
      router.replace("/home");
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (accessToken) {
    return null;
  }

  return children;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
