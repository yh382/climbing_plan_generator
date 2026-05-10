// src/features/community/components/PlanSelectorModal.tsx

import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 模拟用户拥有的计划库
const MY_PLANS = [
  { id: 'p1', title: 'Winter Power Endurance', duration: '8 Weeks', level: 'V4-V6' },
  { id: 'p2', title: 'Finger Strength 101', duration: '4 Weeks', level: 'Any' },
  { id: 'p3', title: 'Core Blaster', duration: 'Single Session', level: 'Hard' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (plan: any) => void;
}

export default function PlanSelectorModal({ visible, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select a Plan to Share</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={MY_PLANS}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.item}
                onPress={() => onSelect(item)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name="flash" size={20} color="#4F46E5" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>{item.duration} · {item.level}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '50%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  iconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  itemSub: { fontSize: 12, color: '#6B7280' }
});