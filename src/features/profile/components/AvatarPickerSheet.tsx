import React, { useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { theme } from "src/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

type Props = {
  visible: boolean;
  onClose: () => void;
  onChooseFromLibrary: () => void;
  onTakePhoto: () => void;
  title?: string;
};

export default function AvatarPickerSheet({
  visible,
  onClose,
  onChooseFromLibrary,
  onTakePhoto,
  title = "Change Profile Photo",
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);
  const pendingAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isPresented.current = false;
    onClose();
    if (pendingAction.current) {
      const action = pendingAction.current;
      pendingAction.current = null;
      setTimeout(action, 50);
    }
  }, [onClose]);

  const handleChooseLibrary = useCallback(() => {
    pendingAction.current = onChooseFromLibrary;
    sheetRef.current?.dismiss();
  }, [onChooseFromLibrary]);

  const handleTakePhoto = useCallback(() => {
    pendingAction.current = onTakePhoto;
    sheetRef.current?.dismiss();
  }, [onTakePhoto]);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={['auto']}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      dimmedDetentIndex={0}
      onDidDismiss={handleDismiss}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.75}
        onPress={handleChooseLibrary}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="images-outline" size={20} color={colors.textPrimary} />
        </View>
        <Text style={styles.rowText}>Choose from library</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.75}
        onPress={handleTakePhoto}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="camera-outline" size={20} color={colors.textPrimary} />
        </View>
        <Text style={styles.rowText}>Take photo</Text>
      </TouchableOpacity>
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: "600",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      textAlign: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 22,
      height: 54,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: {
      fontSize: 15,
      fontWeight: "500",
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
  });
