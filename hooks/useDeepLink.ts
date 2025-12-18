import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { useRouter, useSegments } from "expo-router";

export const useDeepLink = () => {
  const router = useRouter();
  const segments = useSegments();
  const [initialUrl, setInitialUrl] = useState<string | null>(null);

  useEffect(() => {
    // Gérer le lien initial (app fermée)
    const getInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log("Initial URL:", url);
        setInitialUrl(url);
        handleDeepLink(url);
      }
    };

    getInitialURL();

    // Gérer les liens quand l'app est ouverte
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("Deep link received:", url);
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    try {
      const { hostname, path, queryParams } = Linking.parse(url);

      console.log("Parsed deep link:", { hostname, path, queryParams });

      // Gérer la réinitialisation du mot de passe
      if (path === "home/profile/subscription/reset-password" && queryParams?.token) {
        router.push({
          pathname: "/home/profile/subscription/reset-password",
          params: { token: queryParams.token as string },
        });
        return;
      }

      // Gérer d'autres deep links ici
      switch (path) {
        case "profile":
          router.push("/home/profile");
          break;
        case "home":
          router.push("/home");
          break;
        default:
          console.log("Deep link non géré:", path);
      }
    } catch (error) {
      console.error("Erreur lors du traitement du deep link:", error);
    }
  };

  return { initialUrl };
};
