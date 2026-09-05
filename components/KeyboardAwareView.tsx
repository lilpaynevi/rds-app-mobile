import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * Remonte le contenu au-dessus du clavier.
 *
 * `behavior` n'est renseigné que sur iOS, volontairement : Android redimensionne
 * déjà la fenêtre (`adjustResize`, le défaut d'Expo). Y ajouter un comportement
 * provoque un double décalage — le contenu remonte deux fois trop haut et laisse
 * un vide sous le clavier.
 *
 * `keyboardVerticalOffset` sert aux écrans dont l'en-tête est fixe : sans lui,
 * la hauteur de cet en-tête est comptée deux fois et le champ visé reste caché.
 */
export function KeyboardAwareView({
  children,
  style,
  offset = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: number;
}) {
  return (
    <KeyboardAvoidingView
      style={[styles.fill, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default KeyboardAwareView;
