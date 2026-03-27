import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
  useColorScheme,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';                          // [ADAPTED] 原版用 useNavigation
import { useSidebar } from '../../contexts/SidebarContext';        // [ADAPTED] 原版用 @/context/（路径错误）
import { useAuthStore } from '@/store/useAuthStore';               // [ADAPTED] 新增，用于 Log Out
import { HeaderButton } from '../ui/HeaderButton';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDEBAR_W      = Math.min(SCREEN_W * 0.72, 300);
const CONTENT_SCALE  = 0.94;
const CONTENT_RADIUS = 20;
const CONTENT_DIM    = 0.50;

const tokens = {
  light: {
    bg:          '#F7F8F5',
    bgBottom:    '#F7F8F5',
    border:      '#E8EBE4',
    text:        '#1C2118',
    textSub:     '#6B7566',
    iconBg:      '#ECEEE8',
    accent:      '#4A7A52',
    destructive: '#C0392B',
    statusBar:   'dark-content'  as const,
  },
  dark: {
    bg:          '#1A1F17',
    bgBottom:    '#141813',
    border:      '#2A3126',
    text:        '#EDF0E8',
    textSub:     '#7A8A73',
    iconBg:      '#2A3126',
    accent:      '#7BBF7A',
    destructive: '#E05C4F',
    statusBar:   'light-content' as const,
  },
};

// [ADAPTED] route 全部改为项目实际路径
const NAV_ITEMS = [
  { key: 'plan',      label: 'Plan Library',     icon: 'clipboard-outline' as const,  route: '/library/plans' },
  { key: 'exercise',  label: 'Exercise Library',  icon: 'barbell-outline'   as const,  route: '/library/exercise-categories' },
  { key: 'blog',      label: 'Blog',              icon: 'reader-outline'    as const,  route: '/blog' },
  { key: 'challenge', label: 'Challenges',        icon: 'trophy-outline'    as const,  route: '/community/challenges' },
  { key: 'event',     label: 'Events',            icon: 'calendar-outline'  as const,  route: '/community/events' },
];

const BOTTOM_ITEMS = [
  { key: 'settings', label: 'Settings', icon: 'settings-outline'  as const, route: '/settings', destructive: false },
  { key: 'logout',   label: 'Log Out',  icon: 'log-out-outline'   as const, route: null,         destructive: true },
];

// ── SidebarLayout ─────────────────────────────────────────────────────────────
export const SidebarLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, closeSidebar } = useSidebar();
  const scheme = useColorScheme();
  const t = tokens[scheme === 'dark' ? 'dark' : 'light'];
  const progress = useRef(new Animated.Value(0)).current;
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) setAnimating(true);
    Animated.spring(progress, {
      toValue: isOpen ? 1 : 0,
      damping: 26,
      stiffness: 250,
      mass: 0.85,
      overshootClamping: false,
      useNativeDriver: true,
    }).start(() => {
      if (!isOpen) setAnimating(false);
    });
  }, [isOpen]);

  const scale   = progress.interpolate({ inputRange: [0, 1], outputRange: [1, CONTENT_SCALE] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, CONTENT_DIM] });
  const radius  = progress.interpolate({ inputRange: [0, 1], outputRange: [0, CONTENT_RADIUS] });
  const slideX  = progress.interpolate({ inputRange: [0, 1], outputRange: [-SIDEBAR_W, 0] });

  const active = isOpen || animating;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={t.statusBar} />

      <Animated.View
        style={[
          { flex: 1 },
          active && {
            transform: [{ scale }], opacity, borderRadius: radius, overflow: 'hidden',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
          },
        ]}
      >
        {children}
        {isOpen && (
          <TouchableWithoutFeedback onPress={closeSidebar}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        )}
      </Animated.View>

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.sidebar,
          { backgroundColor: t.bg, transform: [{ translateX: slideX }] },
        ]}
      >
        <SidebarContent theme={t} progress={progress} />
      </Animated.View>
    </View>
  );
};

// ── SidebarContent ────────────────────────────────────────────────────────────
const SidebarContent: React.FC<{
  theme: typeof tokens.light;
  progress: Animated.Value;
}> = ({ theme: t, progress }) => {
  const router = useRouter();                                      // [ADAPTED] 原版用 useNavigation
  const { closeSidebar } = useSidebar();
  const itemAnims = useRef(NAV_ITEMS.map(() => new Animated.Value(0))).current;
  const triggered = useRef(false);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      if (value > 0.6 && !triggered.current) {
        triggered.current = true;
        Animated.stagger(50, itemAnims.map(a =>
          Animated.spring(a, { toValue: 1, damping: 18, stiffness: 180, useNativeDriver: true })
        )).start();
      }
      if (value < 0.1) {
        triggered.current = false;
        itemAnims.forEach(a => a.setValue(0));
      }
    });
    return () => progress.removeListener(id);
  }, []);

  // [ADAPTED] 用 router.push 替代 navigation.navigate，Log Out 调 useAuthStore.logout()
  const handleNav = useCallback((route: string | null) => {
    closeSidebar();
    if (!route) {
      useAuthStore.getState().logout();
      return;
    }
    setTimeout(() => router.push(route as any), 120);
  }, [closeSidebar, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.titleRow}>
        <Text style={[styles.appTitle, { color: t.text }]}>Climmate</Text>
        <View style={[styles.titleDot, { backgroundColor: t.accent }]} />
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item, i) => (
          <Animated.View
            key={item.key}
            style={{
              opacity: itemAnims[i],
              transform: [{
                translateX: itemAnims[i].interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }),
              }],
            }}
          >
            <NavRow item={item} theme={t} onPress={() => handleNav(item.route)} />
          </Animated.View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.bottomSection}>
        <View style={[styles.divider, { backgroundColor: t.border }]} />
        {BOTTOM_ITEMS.map(item => (
          <NavRow
            key={item.key}
            item={item}
            theme={t}
            onPress={() => handleNav(item.route)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

// ── NavRow ─────────────────────────────────────────────────────────────────────
const NavRow: React.FC<{
  item: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; destructive?: boolean };
  theme: typeof tokens.light;
  onPress: () => void;
}> = ({ item, theme: t, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v: number) =>
    Animated.spring(scale, { toValue: v, damping: 20, stiffness: 400, useNativeDriver: true }).start();
  const color = item.destructive ? t.destructive : t.text;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.navRow}
        onPress={onPress}
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        activeOpacity={1}
      >
        <View style={[styles.navIconBox, { backgroundColor: item.destructive ? 'transparent' : t.iconBg }]}>
          <Ionicons name={item.icon} size={18} color={color} />
        </View>
        <Text style={[styles.navLabel, { color }]}>{item.label}</Text>
        <Text style={[styles.navChevron, { color: t.textSub }]}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── MenuButton ────────────────────────────────────────────────────────────────
export const MenuButton: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  return <HeaderButton icon="line.3.horizontal" onPress={toggleSidebar} />;
};

// ── useGestureLock ────────────────────────────────────────────────────────────
export function useGestureLock(): boolean {
  const { isOpen } = useSidebar();
  return !isOpen;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  // contentWrapper styles moved inline — shadow/transform breaks SwiftUI Host when always applied
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIDEBAR_W,
    height: '100%',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 16,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  navList: { paddingHorizontal: 10, gap: 2 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  navIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  navChevron: { fontSize: 20, lineHeight: 22, opacity: 0.45 },
  bottomSection: { paddingBottom: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginBottom: 4 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  bottomIcon: { width: 22, textAlign: 'center' },
  bottomLabel: { fontSize: 15, letterSpacing: -0.1 },
  menuBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
