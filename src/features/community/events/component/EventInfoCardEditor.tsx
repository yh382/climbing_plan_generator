// src/features/community/events/component/EventInfoCardEditor.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventInfoCardModel, EventListItem } from "../data/types";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

type Styles = {
  wrap: ViewStyle;

  headerRow: ViewStyle;
  titleInput: TextStyle;
  trashBtn: ViewStyle;

  switchRow: ViewStyle;
  switchLabel: TextStyle;

  itemsWrap: ViewStyle;
  itemRow: ViewStyle;
  itemMainCol: ViewStyle;
  itemSubRow: ViewStyle;

  input: TextStyle;
  inputSecondary: TextStyle;
  inputTrailing: TextStyle;

  delItemBtn: ViewStyle;

  addItemBtn: ViewStyle;
  addItemText: TextStyle;
};

export default function EventInfoCardEditor({
  card,
  onChange,
  onDelete,
}: {
  card: EventInfoCardModel;
  onChange: (next: EventInfoCardModel) => void;
  onDelete: () => void;
}) {
  function setTitle(v: string) {
    onChange({ ...card, title: v });
  }

  function setShowRank(v: boolean) {
    onChange({ ...card, showRank: v });
  }

  function addItem() {
    const next: EventListItem = { id: uid("it"), primary: "New item" };
    onChange({ ...card, items: [...(card.items ?? []), next] });
  }

  function updateItem(id: string, patch: Partial<EventListItem>) {
    const items = (card.items ?? []).map((it) => (it.id === id ? { ...it, ...patch } : it));
    onChange({ ...card, items });
  }

  function deleteItem(id: string) {
    const items = (card.items ?? []).filter((it) => it.id !== id);
    onChange({ ...card, items });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <TextInput
          value={card.title}
          onChangeText={setTitle}
          style={styles.titleInput}
          placeholder="Card title"
          placeholderTextColor="#9CA3AF"
        />

        <TouchableOpacity onPress={onDelete} activeOpacity={0.8} style={styles.trashBtn}>
          <Ionicons name="trash-outline" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Show rank</Text>
        <Switch value={!!card.showRank} onValueChange={setShowRank} />
      </View>

      <View style={styles.itemsWrap}>
        {(card.items ?? []).map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={styles.itemMainCol}>
              <TextInput
                value={it.primary}
                onChangeText={(v) => updateItem(it.id, { primary: v })}
                style={styles.input}
                placeholder="Primary"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.itemSubRow}>
                <TextInput
                  value={it.secondary ?? ""}
                  onChangeText={(v) => updateItem(it.id, { secondary: v })}
                  style={styles.inputSecondary}
                  placeholder="Secondary (optional)"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  value={it.trailing ?? ""}
                  onChangeText={(v) => updateItem(it.id, { trailing: v })}
                  style={styles.inputTrailing}
                  placeholder="Trailing"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <TouchableOpacity onPress={() => deleteItem(it.id)} activeOpacity={0.85} style={styles.delItemBtn}>
              <Ionicons name="close" size={16} color="#111" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={addItem} activeOpacity={0.85} style={styles.addItemBtn}>
        <Ionicons name="add" size={18} color="#111" />
        <Text style={styles.addItemText}>Add item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  wrap: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleInput: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "900", // ✅ no "950"
    color: "#111",
    marginRight: 10, // ✅ replace gap
  },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  switchRow: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { fontSize: 13, fontWeight: "900", color: "#111827" },

  itemsWrap: {
    marginTop: 10,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  itemMainCol: {
    flex: 1,
    marginRight: 10,
  },
  itemSubRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  input: {
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
  },
  inputSecondary: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    marginRight: 10,
  },
  inputTrailing: {
    width: 110,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
  },

  delItemBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  addItemBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addItemText: { marginLeft: 6, fontSize: 12, fontWeight: "900", color: "#111" },
});
