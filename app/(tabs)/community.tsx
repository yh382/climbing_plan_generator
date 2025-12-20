// app/(tabs)/community.tsx

import React, { useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Text, TextInput, KeyboardAvoidingView, Platform, Share, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar"; 
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import FeedPost from "../../src/features/community/components/FeedPost";
import { useCommunityStore } from "../../src/store/useCommunityStore";
import SmartBottomSheet from "../../src/features/community/components/SmartBottomSheet"; 

const MOCK_COMMENTS = [
  { id: 'c1', user: 'Mike', text: 'Insane strength! 💪', time: '10m' },
  { id: 'c2', user: 'Sarah', text: 'Can I get the full plan?', time: '2h' },
];

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, toggleLike } = useCommunityStore();
  const [refreshing, setRefreshing] = useState(false);
  
  // UI State
  const [feedTab, setFeedTab] = useState<'Following' | 'For You' | 'Nearby'>('For You');
  
  // Sheet State
  const [activeSheet, setActiveSheet] = useState<'comment' | 'share' | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handlePressUser = (userId: string) => router.push(`/community/u/${userId}`);
  
  const handleOpenComments = (postId: string) => {
    setSelectedPostId(postId);
    setActiveSheet('comment');
  };

  const handleNativeShare = async () => {
     try {
       await Share.share({ message: `Check out this climbing post on ClimMate!` });
       setActiveSheet(null);
     } catch (error) {}
  };

  const FeedToggle = () => (
    <View style={styles.navToggleContainer}>
        {['Following', 'For You', 'Nearby'].map((tab) => {
            const isActive = feedTab === tab;
            return (
                <TouchableOpacity 
                    key={tab} 
                    onPress={() => setFeedTab(tab as any)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                    <Text style={[
                        styles.navText, 
                        isActive ? styles.navTextActive : styles.navTextInactive
                    ]}>
                        {tab}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
        <View style={{ marginTop: 12, marginBottom: 12 }}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. Plans Library */}
                <TouchableOpacity 
                    style={styles.scrollCard} 
                    onPress={() => router.push("/library/plans")} 
                >
                    <View style={[styles.columnIcon, { backgroundColor: '#EEF2FF' }]}>
                       <Ionicons name="flash" size={16} color="#4F46E5" />
                    </View>
                    <View>
                        <Text style={styles.columnTitle}>Plans</Text>
                        <Text style={styles.columnSub}>Library</Text>
                    </View>
                </TouchableOpacity>
                
                {/* 2. Challenges */}
                <TouchableOpacity 
                    style={styles.scrollCard} 
                    onPress={() => router.push("/community/challenges")}
                >
                    <View style={[styles.columnIcon, { backgroundColor: '#FFF7ED' }]}>
                       <Ionicons name="trophy" size={16} color="#D97706" />
                    </View>
                    <View>
                        <Text style={styles.columnTitle}>Challenges</Text>
                        <Text style={styles.columnSub}>Monthly Goals</Text>
                    </View>
                </TouchableOpacity>

                {/* 3. Events */}
                <TouchableOpacity 
                    style={styles.scrollCard} 
                    onPress={() => router.push("/community/activities")}
                >
                    <View style={[styles.columnIcon, { backgroundColor: '#F0FDF4' }]}>
                       <MaterialCommunityIcons name="ticket-confirmation" size={16} color="#16A34A" />
                    </View>
                    <View>
                        <Text style={styles.columnTitle}>Events</Text>
                        <Text style={styles.columnSub}>Local Meets</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ backgroundColor: '#FFF', paddingTop: insets.top }}>
        <TopBar 
            routeName="community"
            centerControl={<FeedToggle />} 
            useSafeArea={false}
            
            leftAccessory={
                <TouchableOpacity onPress={() => router.push("/community/search")} style={{ marginLeft: 4 }}>
                    <Ionicons name="search" size={24} color="#111" />
                </TouchableOpacity>
            }

            rightAccessory={
                <TouchableOpacity onPress={() => router.push("/community/notifications")} style={{ marginRight: 4 }}>
                    <Ionicons name="notifications-outline" size={24} color="#111" />
                </TouchableOpacity>
            }
        />
      </View>

      <FlatList
        data={posts}
        ListHeaderComponent={ListHeader}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <FeedPost 
                post={item} 
                onLike={(id) => toggleLike(id)}
                onPress={(id) => handlePressUser(item.user.id)} 
                onPressComment={(id) => handleOpenComments(item.id)}
                onPressAttachment={(post) => {
                    if (post.attachment?.type === 'shared_plan') {
                        router.push({
                            pathname: "/library/plan-overview",
                            params: { planId: post.attachment.id, source: 'market' }
                        });
                    }
                }}
            />
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      
      {/* 评论 Sheet */}
      <SmartBottomSheet 
        visible={activeSheet === 'comment'} 
        onClose={() => setActiveSheet(null)} 
        mode="list" 
        title="Comments"
      >
         <View style={{flex: 1}}>
             <FlatList
                data={MOCK_COMMENTS}
                keyExtractor={item => item.id}
                contentContainerStyle={{padding: 16}}
                renderItem={({item}) => (
                    <View style={{marginBottom: 16, flexDirection: 'row', gap: 12}}>
                        <View style={{width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6'}} />
                        <View>
                            <Text style={{fontWeight: '700', fontSize: 13}}>{item.user} <Text style={{fontWeight:'400', color:'#6B7280'}}>{item.time}</Text></Text>
                            <Text style={{fontSize: 14, marginTop: 2}}>{item.text}</Text>
                        </View>
                    </View>
                )}
             />
             <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                 <View style={{borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 12, paddingBottom: 30, flexDirection: 'row', gap: 12, alignItems: 'center'}}>
                     <TextInput 
                        style={{flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, height: 40}}
                        placeholder="Add a comment..."
                        value={commentText}
                        onChangeText={setCommentText}
                     />
                     <TouchableOpacity disabled={!commentText}>
                         <Text style={{color: commentText ? '#4F46E5' : '#9CA3AF', fontWeight: '700'}}>Post</Text>
                     </TouchableOpacity>
                 </View>
             </KeyboardAvoidingView>
         </View>
      </SmartBottomSheet>

      {/* 分享 Sheet */}
      <SmartBottomSheet 
        visible={activeSheet === 'share'} 
        onClose={() => setActiveSheet(null)} 
        mode="menu"
      >
         <View style={{flexDirection: 'row', justifyContent: 'space-around', paddingTop: 20}}>
             <TouchableOpacity style={{alignItems:'center', gap: 8}} onPress={handleNativeShare}>
                 <View style={{width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', alignItems:'center', justifyContent:'center'}}>
                     <Ionicons name="share-outline" size={24} color="#111" />
                 </View>
                 <Text style={{fontSize: 12}}>Share via...</Text>
             </TouchableOpacity>
             <TouchableOpacity style={{alignItems:'center', gap: 8}} onPress={() => setActiveSheet(null)}>
                 <View style={{width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', alignItems:'center', justifyContent:'center'}}>
                     <Ionicons name="link-outline" size={24} color="#111" />
                 </View>
                 <Text style={{fontSize: 12}}>Copy Link</Text>
             </TouchableOpacity>
         </View>
      </SmartBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  listHeader: { paddingBottom: 8 },
  navToggleContainer: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  navText: { fontSize: 15 },
  navTextActive: { fontWeight: '800', color: '#111' },
  navTextInactive: { fontWeight: '500', color: '#9CA3AF' },
  
  scrollContent: {
      paddingHorizontal: 16, 
      gap: 12, 
  },
  scrollCard: { 
      width: 135, // 稍微加宽一点，确保 Challenges 标题不挤
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#F9FAFB', 
      paddingHorizontal: 10, 
      paddingVertical: 12, 
      borderRadius: 12, 
      gap: 8, // 减小图标和文字间距
      borderWidth: 1, 
      borderColor: '#F3F4F6' 
  },
  
  // 图标容器变小
  columnIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  columnTitle: { fontSize: 13, fontWeight: '700', color: '#111' },
  columnSub: { fontSize: 11, color: '#6B7280' }
});