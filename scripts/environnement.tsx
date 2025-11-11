// utils/environment.tsx
import Constants from "expo-constants";

export const getEnvironmentRedirectUrl = () => {
  const env = __DEV__ ? "development" : "production";
  const redirectUrls = Constants.expoConfig?.extra?.redirectUrls;

  return redirectUrls?.[env] || Constants.expoConfig?.scheme || "exp://";
};
