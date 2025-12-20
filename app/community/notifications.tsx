// app/community/notifications.tsx

import React from "react";
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar"; 
import { Ionicons } from "@expo/vector-icons";

// Mock Data based on your screenshot
const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    user: { name: 'Sarah Climb', avatar: 'https://i.pravatar.cc/150?u=sc' },
    action: 'liked your post.',
    time: '2h ago',
    type: 'like',
    thumbnail: true
  },
  {
    id: 'n2',
    user: { name: 'Adam Ondra', avatar: 'https://i.pravatar.cc/150?u=ao' },
    action: 'commented: "Strong move!"',
    time: '5h ago',
    type: 'comment',
    thumbnail: true
  },
  {
    id: 'n3',
    user: { name: 'ClimMate', avatar: null }, // System notification
    action: 'Welcome to the community!',
    time: '1d ago',
    type: 'system',
    thumbnail: true
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.itemContainer} activeOpacity={0.7}>
        {/* Avatar */}
        {item.user.avatar ? (
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        ) : (
            <View style={[styles.avatar, styles.systemAvatar]}>
                <Text style={styles.systemAvatarText}>C</Text>
            </View>
        )}

        {/* Text Content */}
        <View style={styles.content}>
            <Text style={styles.text} numberOfLines={2}>
                <Text style={styles.boldName}>{item.user.name}</Text> {item.action}
            </Text>
            <Text style={styles.time}>{item.time}</Text>
        </View>

        {/* Right Thumbnail (Post preview) */}
        {item.thumbnail && (
            <View style={styles.thumbnail} />
        )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* 修复：父级控制 padding，关闭 TopBar 内部 safeArea */}
      <View style={{ paddingTop: insets.top }}>
        <TopBar 
            routeName="notifications" 
            title="Notifications" 
            useSafeArea={false} // [核心修复]
            leftControls={{ mode: "back", onBack: () => router.back() }} 
        />
      </View>
      
      <FlatList 
        data={MOCK_NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        // borderBottomWidth: 1,      // 可选：如果需要分割线
        // borderBottomColor: '#F3F4F6'
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: '#F3F4F6'
    },
    systemAvatar: {
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center'
    },
    systemAvatarText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 18
    },
    content: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center'
    },
    text: {
        fontSize: 14,
        color: '#111',
        lineHeight: 20,
    },
    boldName: {
        fontWeight: '700',
    },
    time: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 4,
        backgroundColor: '#F3F4F6' // 灰色占位图，模拟截图中的样子
    }
});