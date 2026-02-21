import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  dateKey: string;
  gymName?: string;
  totalSends?: number;
  onEdit?: () => void;
  onShareToCommunity?: () => void;
  onShareLongScreenshot?: () => Promise<void> | void;
};

export default function LogDetailMoreMenu({
  dateKey,
  gymName,
  totalSends,
  onEdit,
  onShareToCommunity,
  onShareLongScreenshot,
}: Props) {
  const [open, setOpen] = useState(false);

  const subtitle = useMemo(() => {
    const parts = [];
    if (dateKey) parts.push(dateKey);
    if (gymName) parts.push(gymName);
    if (typeof totalSends === "number") parts.push(`${totalSends} sends`);
    return parts.join(" • ");
  }, [dateKey, gymName, totalSends]);

  const close = () => setOpen(false);

  const handleEdit = () => {
    close();
    onEdit?.();
  };

  const handleShareCommunity = () => {
    close();
    onShareToCommunity?.();
  };

  const handleShareLong = async () => {
    close();
    try {
      await onShareLongScreenshot?.();
    } catch (e: any) {
      Alert.alert("Share failed", e?.message || "Please try again.");
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="More actions"
      >
        <Ionicons name="ellipsis-horizontal" size={22} color="#111" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity activeOpacity={1} onPress={close} style={styles.backdrop}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Daily Log</Text>
              {subtitle ? <Text style={styles.sheetSub}>{subtitle}</Text> : null}
            </View>

            <View style={styles.divider} />

            <ActionRow icon="create-outline" title="Edit" onPress={handleEdit} />
            <ActionRow icon="paper-plane-outline" title="Share to Community" onPress={handleShareCommunity} />
            <ActionRow
              icon={Platform.OS === "ios" ? "share-outline" : "share-social-outline"}
              title="Share as Image"
              onPress={handleShareLong}
            />

            <View style={styles.divider} />

            <TouchableOpacity activeOpacity={0.85} onPress={close} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ActionRow({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color="#111" />
        </View>
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  sheetHeader: { paddingHorizontal: 6, paddingBottom: 10 },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  sheetSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },

  row: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "800", color: "#111" },

  cancelBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 6,
  },
  cancelText: { fontSize: 14, fontWeight: "900", color: "#111" },
});
