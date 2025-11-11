import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  StatusBar,
  TouchableOpacity,
  Vibration,
  BackHandler,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const AddTVModal = ({ onClose }) => {
  const [registrationCode, setRegistrationCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState('idle');
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [isLoading, setIsLoading] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const codeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Timer ref
  const timerRef = useRef(null);
  const pairingCheckRef = useRef(null);

  useEffect(() => {
    // Auto-start pairing process
    initializePairing();
    
    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      clearTimers();
      backHandler.remove();
    };
  }, []);

  const handleBackPress = () => {
    if (pairingStatus === 'waiting') {
      // Show confirmation before closing during pairing
      handleClose();
      return true;
    }
    handleClose();
    return true;
  };

  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (pairingCheckRef.current) {
      clearInterval(pairingCheckRef.current);
    }
  };

  const initializePairing = async () => {
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    await generatePairingCode();
  };

  // Fonction pour générer ou récupérer le code persistant
  const generatePersistentCode = async () => {
    try {
      // Vérifier s'il existe déjà un code pour cet appareil
      const existingCode = await AsyncStorage.getItem('device_pairing_code');
      
      if (existingCode && existingCode.length === 9) {
        console.log('Code existant trouvé:', existingCode);
        return existingCode;
      }
      
      // Générer un nouveau code à 9 chiffres
      const newCode = Math.floor(100000000 + Math.random() * 900000000).toString();
      
      // Sauvegarder le code
      await AsyncStorage.setItem('device_pairing_code', newCode);
      console.log('Nouveau code généré et sauvegardé:', newCode);
      
      return newCode;
      
    } catch (error) {
      console.error('Erreur lors de la gestion du code:', error);
      // Fallback - générer un code temporaire
      return Math.floor(100000000 + Math.random() * 900000000).toString();
    }
  };

  const generatePairingCode = async () => {
    setIsLoading(true);
    
    try {
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Récupérer ou générer le code persistant
      const code = await generatePersistentCode();
      setRegistrationCode(code);
      
      // Animation de révélation du code
      Animated.spring(codeAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      setIsLoading(false);
      setPairingStatus('waiting');
      
      startCountdown();
      startPairingCheck(code);
      startPulseAnimation();
      
    } catch (error) {
      console.error('Erreur lors de la génération du code:', error);
      setPairingStatus('error');
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    setTimeRemaining(300);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPairingStatus('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPairingCheck = (code) => {
    pairingCheckRef.current = setInterval(async () => {
      try {
        // Simuler la vérification du statut d'appairage
        const shouldComplete = Math.random() > 0.95; // 5% de chance à chaque vérification
        
        // if (shouldComplete) {
        //   clearTimers();
        //   setPairingStatus('success');
          
        //   if (Vibration) {
        //     Vibration.vibrate([100, 50, 100]);
        //   }
          
        //   // Fermeture automatique après succès
        //   setTimeout(() => {
        //     handleClose(true);
        //   }, 3000);
        // }
      } catch (error) {
        console.error('Erreur lors de la vérification d\'appairage:', error);
      }
    }, 2000);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleClose = (success = false) => {
    clearTimers();
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose && onClose(success);
    });
  };

  const handleRetry = () => {
    clearTimers();
    setRegistrationCode('');
    setTimeRemaining(300);
    Animated.setValue(codeAnim, 0);
    generatePairingCode();
  };

  // Fonction pour réinitialiser le code (utile pour les tests)
  const resetDeviceCode = async () => {
    try {
      await AsyncStorage.removeItem('device_pairing_code');
      console.log('Code d\'appareil réinitialisé');
      handleRetry();
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderGenerating = () => (
    <View style={styles.loadingSection}>
      <View style={styles.loadingSpinner}>
        <ActivityIndicator size={50} color="#00E5FF" />
      </View>
      <Text style={styles.loadingTitle}>Génération du Code d'Appairage</Text>
      <Text style={styles.loadingSubtitle}>
        Création d'une connexion sécurisée...
      </Text>
    </View>
  );

  const renderWaiting = () => (
    <>
      <View style={styles.instructionSection}>
        <Text style={styles.instructionTitle}>
          Entrez ce code sur votre TV
        </Text>
        <Text style={styles.instructionSubtitle}>
          Ouvrez l'application RDS Screen sur votre application et saisissez ce code d'appairage
        </Text>
      </View>

      <Animated.View 
        style={[
          styles.codeContainer,
          { 
            opacity: codeAnim,
            transform: [{ scale: codeAnim }]
          }
        ]}
      >
        <View style={styles.codeDisplay}>
          {registrationCode.split('').map((digit, index) => (
           
              <Text style={styles.digit}>{digit}</Text>
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.copyButton}
          onPress={() => {
            // Logique de copie dans le presse-papiers
            if (Vibration) {
              Vibration.vibrate(50);
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.copyButtonText}>📋 Copier le Code</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.statusSection}>
        <View style={styles.waitingIndicator}>
          <ActivityIndicator size={24} color="#00E5FF" />
          <Text style={styles.waitingText}>En attente de connexion TV...</Text>
        </View>
      </View>

      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Besoin d'Aide ?</Text>
        <Text style={styles.helpText}>
          • Assurez-vous que votre TV est connectée au même WiFi{'\n'}
          • Ouvrez l'app DisplayCast sur votre TV{'\n'}
          • Sélectionnez "Connecter un Appareil" et entrez le code ci-dessus{'\n'}
          • Ce code est unique à votre téléphone
        </Text>
        
        {/* Bouton de développement pour réinitialiser le code */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.devResetButton}
            onPress={resetDeviceCode}
            activeOpacity={0.7}
          >
            <Text style={styles.devResetText}>🔄 Réinitialiser Code (DEV)</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderSuccess = () => (
    <View style={styles.successSection}>
      <Animated.View 
        style={[
          styles.successIcon,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Text style={styles.successIconText}>✓</Text>
      </Animated.View>
      
      <Text style={styles.successTitle}>Connexion Réussie !</Text>
      <Text style={styles.successMessage}>
        Votre TV a été ajoutée à vos appareils.{'\n'}
        Vous pouvez maintenant diffuser du contenu.
      </Text>
      
      <View style={styles.successDetails}>
        <View style={styles.successDetailItem}>
          <Text style={styles.successDetailLabel}>Nom de l'Appareil</Text>
          <Text style={styles.successDetailValue}>TV Salon</Text>
        </View>
        <View style={styles.successDetailItem}>
          <Text style={styles.successDetailLabel}>Connexion</Text>
          <Text style={styles.successDetailValue}>Sécurisée (WPA2)</Text>
        </View>
        <View style={styles.successDetailItem}>
          <Text style={styles.successDetailLabel}>Code d'Appareil</Text>
          <Text style={styles.successDetailValue}>{registrationCode}</Text>
        </View>
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorSection}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Échec de la Connexion</Text>
      <Text style={styles.errorMessage}>
        Impossible de générer le code d'appairage.{'\n'}
        Vérifiez votre connexion internet et réessayez.
      </Text>
      
      <View style={styles.errorActions}>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => handleClose(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTimeout = () => (
    <View style={styles.timeoutSection}>
      <Text style={styles.timeoutIcon}>⏰</Text>
      <Text style={styles.timeoutTitle}>Code Expiré</Text>
      <Text style={styles.timeoutMessage}>
        Le code d'appairage a expiré pour des raisons de sécurité.{'\n'}
        Votre code personnel reste le même : {registrationCode}
      </Text>
      
      <TouchableOpacity 
        style={styles.generateButton}
        onPress={handleRetry}
        activeOpacity={0.8}
      >
        <Text style={styles.generateButtonText}>Relancer la Session</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />
      
      <Animated.View 
        style={[
          styles.modalContent,
          { opacity: fadeAnim }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.navigate('/auth/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.modalTitle}>Connecter la TV</Text>
            <Text style={styles.modalSubtitle}>
              Appairage sécurisé avec votre télévision
            </Text>
          </View>
          
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* {pairingStatus === 'generating' && renderGenerating()} */}
          {pairingStatus === 'waiting' && renderWaiting()}
          {/* {pairingStatus === 'success' && renderSuccess()} */}
          {pairingStatus === 'error' && renderError()}
          {pairingStatus === 'timeout' && renderTimeout()}
        </View>
      </Animated.View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (tous les styles existants restent identiques)
  container: {
    flex: 1,
    backgroundColor: '#1A237E',
  },
  
  modalContent: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  
  headerInfo: {
    alignItems: 'center',
  },
  
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  
  modalSubtitle: {
    fontSize: 14,
    color: '#B0BEC5',
    marginTop: 4,
  },
  
  placeholder: {
    width: 44,
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  
  // Loading
  loadingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  
  loadingSpinner: {
    marginBottom: 30,
  },
  
  loadingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  
  loadingSubtitle: {
    fontSize: 16,
    color: '#B0BEC5',
    textAlign: 'center',
  },
  
  // Instructions
  instructionSection: {
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 50,
  },
  
  instructionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  
  instructionSubtitle: {
    fontSize: 16,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  
  // Code - Ajusté pour 9 chiffres
  codeContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  
  codeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 25,
    flexWrap: 'wrap', // Pour gérer l'affichage sur petits écrans
  },
  
  digitBox: {
    width: 36, // Réduit pour 9 chiffres
    height: 55,
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    marginVertical: 2,
    borderWidth: 2,
    borderColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  
  digit: {
    fontSize: 24, // Réduit pour s'adapter
    fontWeight: '700',
    color: '#00E5FF',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  
  copyButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  copyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  
  // Status
  statusSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  
  waitingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  waitingText: {
    fontSize: 16,
    color: '#E0E0E0',
    marginLeft: 12,
    fontWeight: '500',
  },
  
  timerSection: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  timerLabel: {
    fontSize: 12,
    color: '#90A4AE',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  timerValue: {
    fontSize: 18,
    color: '#FFB74D',
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Help
  helpSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  
  helpText: {
    fontSize: 14,
    color: '#B0BEC5',
    lineHeight: 20,
  },
  
  // Bouton de développement
  devResetButton: {
    backgroundColor: 'rgba(255,87,34,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#FF5722',
    alignSelf: 'center',
  },
  
  devResetText: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: '500',
  },
  
  // Success
  successSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(76,175,80,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  
  successIconText: {
    fontSize: 50,
    color: '#4CAF50',
    fontWeight: '600',
  },
  
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  
  successMessage: {
    fontSize: 16,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 30,
  },
  
  successDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  successDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  
  successDetailLabel: {
    fontSize: 14,
    color: '#90A4AE',
    fontWeight: '500',
  },
  
  successDetailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Error
  errorSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  
  errorIcon: {
    fontSize: 80,
    marginBottom: 30,
  },
  
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  
  errorMessage: {
    fontSize: 16,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 30,
  },
  
  errorActions: {
    width: '100%',
    gap: 15,
  },
  
  retryButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  retryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertically: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  
  // Timeout
  timeoutSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  
  timeoutIcon: {
    fontSize: 80,
    marginBottom: 30,
  },
  
  timeoutTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  
  timeoutMessage: {
    fontSize: 16,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 30,
  },
  
  generateButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  generateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AddTVModal;
