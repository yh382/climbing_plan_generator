// Stacked sheet spawned from the indoor map's hamburger button. Mirrors
// AreaMenuSheet — header card → tools → user actions → sign-in CTA.

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';

import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useUserStore } from '../../../store/useUserStore';
import GymInfoSheet, {
  type GymInfoSheetHandle,
} from './GymInfoSheet';
import GymRoutesLibrarySheet, {
  type GymRoutesLibrarySheetHandle,
} from './GymRoutesLibrarySheet';
import type { Gym, WallSection } from '../../gymsCatalog/types';

export interface GymMenuSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  gym: Gym | null;
  wallSections: WallSection[];
  /** require()-result for mock floor plan; falls back to gym.floor_plan_url. */
  floorPlanSource?: number;
  onSelectRoute?: (routeId: string) => void;
  onPressMySends?: () => void;
  onPressAddRoute?: () => void;
  onPressReports?: () => void;
}

const GymMenuSheet = forwardRef<GymMenuSheetHandle, Props>((props, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const sheetRef = useRef<TrueSheet>(null);
  const gymInfoSheetRef = useRef<GymInfoSheetHandle>(null);
  const routesLibrarySheetRef = useRef<GymRoutesLibrarySheetHandle>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useImperativeHandle(ref, () => ({
    present: () => {
      sheetRef.current?.present().catch(() => {});
    },
    dismiss: () => {
      sheetRef.current?.dismiss().catch(() => {});
    },
  }));

  const dismiss = () => sheetRef.current?.dismiss().catch(() => {});

  const comingSoon = () =>
    Alert.alert(
      tr('即将开放', 'Coming Soon'),
      tr('敬请期待下一个版本', 'Ships in the next update.'),
    );

  const goLogin = () => {
    dismiss();
    router.push('/(auth)/login' as any);
  };

  const withAuth = (fn: (() => void) | undefined) => () => {
    if (!user) {
      goLogin();
      return;
    }
    if (fn) fn();
    else comingSoon();
  };

  const totalRoutes = props.wallSections.reduce(
    (sum, w) => sum + w.route_count,
    0,
  );

  return (
    <>
      <TrueSheet
        ref={sheetRef}
        name="gym-menu-sheet"
        detents={[0.9]}
        dimmed
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Header card */}
          {props.gym ? (
            <Pressable
              style={styles.headerCard}
              onPress={() => gymInfoSheetRef.current?.present()}
            >
              {props.floorPlanSource || props.gym.floor_plan_url ? (
                <Image
                  source={
                    props.floorPlanSource ??
                    { uri: props.gym.floor_plan_url ?? '' }
                  }
                  style={styles.headerCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.headerCover, styles.headerCoverFallback]}>
                  <Text style={styles.headerCoverFallbackText}>
                    {props.gym.name}
                  </Text>
                </View>
              )}
              <View style={styles.headerTextBlock}>
                <View style={styles.headerNameRow}>
                  <Text style={styles.headerName} numberOfLines={2}>
                    {props.gym.name}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                </View>
                <Text style={styles.headerMeta} numberOfLines={1}>
                  {props.wallSections.length}{' '}
                  {tr(
                    '面墙',
                    props.wallSections.length === 1 ? 'wall' : 'walls',
                  )}
                  {'  ·  '}
                  {totalRoutes}{' '}
                  {tr('路线', totalRoutes === 1 ? 'route' : 'routes')}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* Tools */}
          <SectionLabel colors={colors}>
            {tr('岩馆工具', 'Gym Tools')}
          </SectionLabel>
          <MenuRow
            icon="information-circle-outline"
            label={tr('岩馆信息 & 营业时间', 'Gym Info & Hours')}
            onPress={() => gymInfoSheetRef.current?.present()}
            colors={colors}
          />
          <MenuRow
            icon="book-outline"
            label={tr('路线库', 'Routes Library')}
            onPress={() => routesLibrarySheetRef.current?.present()}
            colors={colors}
          />

          {/* User tools */}
          <SectionLabel colors={colors}>
            {tr('我的工具', 'My Tools')}
          </SectionLabel>
          <MenuRow
            icon="checkmark-done-circle-outline"
            label={tr('我的攀完', 'My Sends in this Gym')}
            onPress={withAuth(props.onPressMySends)}
            colors={colors}
          />
          <MenuRow
            icon="add-circle-outline"
            label={tr('添加路线', 'Add a Route')}
            onPress={withAuth(props.onPressAddRoute)}
            colors={colors}
          />
          <MenuRow
            icon="flag-outline"
            label={tr('报告', 'Reports')}
            onPress={withAuth(props.onPressReports)}
            colors={colors}
          />

          {/* Sign-in CTA */}
          {!user ? (
            <View style={styles.authCta}>
              <Text style={styles.authTitle}>
                {tr('登录以查看更多', 'Sign in for more')}
              </Text>
              <Text style={styles.authSubtitle}>
                {tr(
                  '登录后访问你的攀完、报告、提交路线等功能',
                  'Access sends, reports, and route submissions after signing in.',
                )}
              </Text>
              <TouchableOpacity
                style={styles.authButton}
                onPress={goLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.authButtonText}>
                  {tr('登录', 'Sign In')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </TrueSheet>

      {/* Stacked sheets */}
      <GymInfoSheet
        ref={gymInfoSheetRef}
        gym={props.gym}
        wallSections={props.wallSections}
        floorPlanSource={props.floorPlanSource}
        context="menu"
      />
      {props.gym ? (
        <GymRoutesLibrarySheet
          ref={routesLibrarySheetRef}
          gymId={props.gym.id}
          wallSections={props.wallSections}
          onSelectRoute={props.onSelectRoute}
        />
      ) : null}
    </>
  );
});

GymMenuSheet.displayName = 'GymMenuSheet';
export default GymMenuSheet;

function SectionLabel({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Text
      style={{
        fontFamily: theme.fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 18,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
      }}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Ionicons name={icon} size={22} color={colors.textPrimary} />
      <Text
        style={{
          flex: 1,
          fontFamily: theme.fonts.medium,
          fontSize: 16,
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 0,
      paddingBottom: 32,
    },
    headerCard: {
      marginHorizontal: -theme.spacing.screenPadding,
    },
    headerCover: {
      width: '100%',
      height: 160,
    },
    headerCoverFallback: {
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCoverFallbackText: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textSecondary,
    },
    headerTextBlock: {
      paddingTop: 12,
      paddingBottom: 4,
      paddingHorizontal: theme.spacing.screenPadding,
    },
    headerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerName: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      color: c.textPrimary,
    },
    headerMeta: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    authCta: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 8,
      marginTop: 16,
    },
    authTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      marginBottom: 8,
    },
    authSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    authButton: {
      backgroundColor: c.accent,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.pill,
    },
    authButtonText: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: '#fff',
    },
  });
