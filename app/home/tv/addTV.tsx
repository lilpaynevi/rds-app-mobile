import { useAuth } from "@/scripts/AuthContext";
import { baseURL } from "@/scripts/fetch.api";
import { socket } from "@/scripts/socket.io";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Vibration,
  BackHandler,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const TVConnectScreen = ({ onBack, onConnectionSuccess }) => {
  const [code, setCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connectionStep, setConnectionStep] = useState("");
  const { user } = useAuth();
  
  const codeInputRef = useRef(null);

  useEffect(() => {
    socket.on("connect-tv-code-success", (data) => {
      const deviceInfo = {
        id: data.deviceId,
        name: data.tvName,
      };

      setConnectedDevice(deviceInfo);
      setIsConnecting(false);
      setConnectionStatus("success");

      Vibration?.vibrate([100, 50, 100, 50, 100]);

      setTimeout(() => {
        router.back()
      }, 3000);
    });

    socket.on("connect-tv-code-error", async (data) => {
      console.log("🚀 ~ TVConnectScreen ~ data:", data);
      showError(data.error);
    });

    // Focus automatique
    setTimeout(() => codeInputRef.current?.focus(), 300);

    // Gérer bouton retour
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => backHandler.remove();
  }, []);

  const handleBackPress = () => {
    if (connectionStatus === "connecting") return true;
    handleBack();
    return true;
  };

  const handleBack = () => {
    router.back();
  };

  const handleCodeChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, "").slice(0, 9);
    setCode(numericText);

    if (connectionStatus === "error") {
      setConnectionStatus("idle");
      setErrorMessage("");
    }

    // Auto-connexion à 9 chiffres
    if (numericText.length === 9) {
      setTimeout(() => handleConnect(numericText), 500);
    }
  };

  const handleConnect = async (inputCode = code) => {
    if (inputCode.length !== 9) {
      showError("Le code doit contenir exactement 9 chiffres");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      await simulateConnection(inputCode);
    } catch (error) {
      showError(error?.message || "Erreur de connexion inconnue");
    }
  };

  const simulateConnection = async (inputCode) => {
    const steps = [
      { message: "Recherche de l'appareil...", duration: 2000 },
    ];

    for (let step of steps) {
      setConnectionStep(step.message);
      await new Promise((resolve) => setTimeout(resolve, step.duration));
    }
    socket.emit("connect-tv-code", {
      code: inputCode,
      userId: user?.id,
    });
  };

  const showError = (message) => {
    setIsConnecting(false);
    setConnectionStatus("error");
    setErrorMessage(message);
    Vibration?.vibrate([200, 100, 200]);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        disabled={connectionStatus === "connecting"}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Connecter TV</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderCodeInput = () => (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>Code d'Appairage</Text>
      <Text style={styles.inputSubtitle}>
        Entrez le code à 9 chiffres affiché sur votre TV
      </Text>

      <View style={[
        styles.codeInputContainer,
        connectionStatus === "error" && styles.codeInputError,
      ]}>
        <View style={styles.digitInputs}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <View
              key={index}
              style={[
                styles.digitInput,
                code.length > index && styles.digitInputFilled,
                connectionStatus === "error" && styles.digitInputErrorState,
              ]}
            >
              <Text
                style={[
                  styles.digitText,
                  code.length > index && styles.digitTextFilled,
                ]}
              >
                {code[index] || ""}
              </Text>
            </View>
          ))}
        </View>

        <TextInput
          ref={codeInputRef}
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="numeric"
          maxLength={9}
          style={styles.hiddenInput}
          autoFocus={true}
          editable={connectionStatus !== "connecting"}
        />
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderConnecting = () => (
    <View style={styles.connectingSection}>
      <View style={styles.connectingIconContainer}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>

      <Text style={styles.connectingTitle}>Connexion en cours...</Text>
      <Text style={styles.connectingStep}>{connectionStep}</Text>

      <View style={styles.connectingProgress}>
        <Text style={styles.progressText}>Patientez quelques instants</Text>
      </View>

      <View style={styles.connectingTips}>
        <Text style={styles.tipsTitle}>💡 Astuces :</Text>
        <Text style={styles.tipsText}>• Gardez la TV allumée</Text>
        <Text style={styles.tipsText}>• Vérifiez votre connexion WiFi</Text>
        <Text style={styles.tipsText}>• Le code expire dans 5 minutes</Text>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successSection}>
      <View style={styles.successIconContainer}>
        <Text style={styles.successIcon}>✅</Text>
      </View>

      <Text style={styles.successTitle}>Connexion Réussie !</Text>
      <Text style={styles.successMessage}>
        Votre télévision a été connectée avec succès
      </Text>

      <View style={styles.deviceInfo}>
        <View style={styles.deviceDetail}>
          <Text style={styles.deviceLabel}>Nom :</Text>
          <Text style={styles.deviceValue}>{connectedDevice?.name}</Text>
        </View>
      </View>

      <Text style={styles.redirectMessage}>
        Redirection automatique dans 3 secondes...
      </Text>
    </View>
  );

  const renderActionButtons = () => {
    if (connectionStatus === "connecting" || connectionStatus === "success") {
      return null;
    }

    return (
      <View style={styles.actionButtons}>
        {code.length !== 9 && (
          <TouchableOpacity
            style={[styles.connectButton, styles.connectButtonDisabled]}
            disabled={true}
          >
            <Text style={styles.connectButtonTextDisabled}>
              Entrez le code complet
            </Text>
          </TouchableOpacity>
        )}

        {connectionStatus === "error" && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleConnect()}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHelp = () => (
    <View style={styles.helpSection}>
      <Text style={styles.helpTitle}>🆘 Besoin d'aide ?</Text>

      <View style={styles.helpItem}>
        <Text style={styles.helpQuestion}>Où trouver le code ?</Text>
        <Text style={styles.helpAnswer}>
          Le code s'affiche sur l'écran de votre TV dans l'application de
          connexion.
        </Text>
      </View>

      <View style={styles.helpItem}>
        <Text style={styles.helpQuestion}>Le code ne fonctionne pas ?</Text>
        <Text style={styles.helpAnswer}>
          Vérifiez que la TV et le téléphone sont connecté à internet.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{  ...styles.container}}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />

      <View style={styles.content}>
        {renderHeader()}

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {connectionStatus === "idle" || connectionStatus === "error" ? (
              <>
                {renderCodeInput()}
                {renderActionButtons()}
                {renderHelp()}
              </>
            ) : connectionStatus === "connecting" ? (
              renderConnecting()
            ) : connectionStatus === "success" ? (
              renderSuccess()
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1A1A1A",
    height: "100%"
  },

  content: {},

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  backIcon: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  headerSpacer: {
    width: 40,
  },

  // Keyboard
  keyboardView: {},

  scrollView: {},

  scrollContent: {
    paddingBottom: 50,
  },

  // Input Section
  inputSection: {
    padding: 25,
    alignItems: "center",
  },

  inputLabel: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },

  inputSubtitle: {
    fontSize: 16,
    color: "#B0BEC5",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  codeInputContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  codeInputError: {
    borderColor: "#FF5722",
  },

  digitInputs: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  digitInput: {
    width: (width - 80) / 9 - 8,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  digitInputFilled: {
    backgroundColor: "rgba(0,229,255,0.2)",
    borderColor: "#00E5FF",
  },

  digitInputErrorState: {
    backgroundColor: "rgba(255,87,34,0.2)",
    borderColor: "#FF5722",
  },

  digitText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#666",
  },

  digitTextFilled: {
    color: "#FFFFFF",
  },

  hiddenInput: {
    position: "absolute",
    left: -9999,
    opacity: 0,
  },

  // Error
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,87,34,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FF5722",
    marginTop: 20,
    width: "100%",
  },

  errorIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },

  // Connecting
  connectingSection: {
    flex: 1,
    padding: 25,
    justifyContent: "center",
    alignItems: "center",
    minHeight: height * 0.7,
  },

  connectingIconContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,229,255,0.2)",
    borderRadius: 50,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#00E5FF",
  },

  connectingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 15,
    textAlign: "center",
  },

  connectingStep: {
    fontSize: 16,
    color: "#00E5FF",
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "600",
  },

  connectingProgress: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },

  progressText: {
    fontSize: 14,
    color: "#B0BEC5",
    textAlign: "center",
  },

  connectingTips: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#00E5FF",
  },

  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 15,
  },

  tipsText: {
    fontSize: 14,
    color: "#B0BEC5",
    marginBottom: 8,
    lineHeight: 20,
  },

  // Success
  successSection: {
    flex: 1,
    padding: 25,
    justifyContent: "center",
    alignItems: "center",
    minHeight: height * 0.7,
  },

  successIconContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(76,175,80,0.2)",
    borderRadius: 60,
    marginBottom: 30,
    borderWidth: 3,
    borderColor: "#4CAF50",
  },

  successIcon: {
    fontSize: 60,
  },

  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 15,
    textAlign: "center",
  },

  successMessage: {
    fontSize: 16,
    color: "#B0BEC5",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  deviceInfo: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  deviceDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  deviceLabel: {
    fontSize: 14,
    color: "#90A4AE",
    fontWeight: "500",
  },

  deviceValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },

  redirectMessage: {
    fontSize: 14,
    color: "#00E5FF",
    textAlign: "center",
    fontStyle: "italic",
  },

  // Action Buttons
  actionButtons: {
    paddingHorizontal: 25,
    gap: 15,
  },

  connectButton: {
    backgroundColor: "#00E5FF",
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
  },

  connectButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  connectButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  connectButtonTextDisabled: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },

  retryButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },

  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Help Section
  helpSection: {
    margin: 25,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 25,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  helpTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },

  helpItem: {
    marginBottom: 20,
  },

  helpQuestion: {
    fontSize: 15,
    fontWeight: "600",
    color: "#00E5FF",
    marginBottom: 8,
  },

  helpAnswer: {
    fontSize: 14,
    color: "#B0BEC5",
    lineHeight: 20,
  },
});

export default TVConnectScreen;
