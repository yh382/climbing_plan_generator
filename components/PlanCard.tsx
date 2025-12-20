// src/components/PlanCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');
// [调整] 卡片高度从 180 压缩到 140
const CARD_HEIGHT = 140;

export interface PlanProps {
  id: string;
  title: string;
  author: string;
  level: string;
  duration: string;
  users: number;
  type: string;     // e.g. 'Strength', 'Boulder'
  rating: number;
  image: string;
  color: string;    // Tag color
}

interface Props {
  item: PlanProps;
  onPress: () => void;
}

export default function PlanCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <ImageBackground source={{ uri: item.image }} style={styles.bg} imageStyle={{ borderRadius: 12 }}>
         <View style={styles.overlay} />
         
         <View style={styles.content}>
             {/* Top Row: Tags & Rating */}
             <View style={styles.topRow}>
                 <View style={[styles.tag, { backgroundColor: item.color }]}>
                     <Text style={styles.tagText}>{item.type}</Text>
                 </View>
                 <View style={styles.ratingBadge}>
                     <Ionicons name="star" size={10} color="#FBBF24" />
                     <Text style={styles.ratingText}>{item.rating}</Text>
                 </View>
             </View>

             {/* Bottom Row: Info */}
             <View>
                 <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                 <Text style={styles.author}>by {item.author}</Text>
                 
                 <View style={styles.metaRow}>
                     <MetaItem icon="calendar-outline" text={item.duration} />
                     <View style={styles.divider} />
                     <MetaItem icon="barbell-outline" text={item.level} />
                     <View style={styles.divider} />
                     <MetaItem icon="people-outline" text={item.users.toString()} />
                 </View>
             </View>
         </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const MetaItem = ({ icon, text }: { icon: any, text: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={11} color="#E5E7EB" />
        <Text style={{ color: '#E5E7EB', fontSize: 11, fontWeight: '500' }}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
  card: { 
    height: CARD_HEIGHT, 
    width: '100%', 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: {width:0, height:3}, elevation: 3 
  },
  bg: { flex: 1, justifyContent: 'space-between' }, // 改为 space-between 让内容撑开两端
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12 },
  
  content: { flex: 1, padding: 12, justifyContent: 'space-between' }, // 内部也两端对齐
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  tagText: { fontSize: 9, fontWeight: '800', color: '#FFF', textTransform: 'uppercase' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  ratingText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  title: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  author: { fontSize: 12, color: '#D1D5DB', marginBottom: 6 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 }
});