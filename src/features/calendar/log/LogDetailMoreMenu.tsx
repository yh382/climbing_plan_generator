import { Platform, StyleSheet, Alert } from "react-native";
import { Host, ContextMenu, Button } from "@expo/ui/swift-ui";

type Props = {
  dateKey: string;
  gymName?: string;
  totalSends?: number;
  onEdit?: () => void;
  onShareToCommunity?: () => void;
  onShareLongScreenshot?: () => Promise<void> | void;
};

export default function LogDetailMoreMenu({
  onEdit,
  onShareToCommunity,
  onShareLongScreenshot,
}: Props) {
  if (Platform.OS !== "ios") return null;

  const handleShareLong = async () => {
    try {
      await onShareLongScreenshot?.();
    } catch (e: any) {
      Alert.alert("Share failed", e?.message || "Please try again.");
    }
  };

  return (
    <Host matchContents style={styles.iconBtn}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <Button systemImage="ellipsis" label="" />
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          {onEdit && <Button systemImage="pencil" onPress={onEdit} label="Edit" />}
          {onShareToCommunity && <Button systemImage="paperplane" onPress={onShareToCommunity} label="Share to Community" />}
          {onShareLongScreenshot && <Button systemImage="photo" onPress={handleShareLong} label="Share as Image" />}
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
