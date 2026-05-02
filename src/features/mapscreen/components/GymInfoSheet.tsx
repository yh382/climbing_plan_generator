// Stacked sheet — full gym detail (cover, hours, amenities,
// description). Mirrors AreaInfoSheet's role for outdoor but stays
// intentionally lighter: indoor doesn't need the
// approach/transport/accommodation block.

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import { TopFadeMaskView } from '../../../components/shared/TopFadeMaskView';
import type { Gym, WallSection } from '../../gymsCatalog/types';

export type GymInfoContext = 'main' | 'menu';

export interface GymInfoSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  gym: Gym | null;
  wallSections: WallSection[];
  /** require()-result for mock floor plan; falls back to gym.floor_plan_url. */
  floorPlanSource?: number;
  context: GymInfoContext;
}

const DAY_KEYS: Array<keyof NonNullable<Gym['hours']>> = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

function dayLabel(key: string, tr: (zh: string, en: string) => string): string {
  switch (key) {
    case 'mon':
      return tr('周一', 'Mon');
    case 'tue':
      return tr('周二', 'Tue');
    case 'wed':
      return tr('周三', 'Wed');
    case 'thu':
      return tr('周四', 'Thu');
    case 'fri':
      return tr('周五', 'Fri');
    case 'sat':
      return tr('周六', 'Sat');
    case 'sun':
      return tr('周日', 'Sun');
    default:
      return key;
  }
}

function todayKey(): keyof NonNullable<Gym['hours']> {
  // 0=Sun, 1=Mon ... 6=Sat
  return DAY_KEYS[(new Date().getDay() + 6) % 7];
}

const GymInfoSheet = forwardRef<GymInfoSheetHandle, Props>(
  ({ gym, wallSections, floorPlanSource, context }, ref) => {
    const colors = useThemeColors();
    const { tr } = useSettings();
    const sheetRef = useRef<TrueSheet>(null);
    const styles = useMemo(() => createStyles(colors), [colors]);

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present().catch(() => {});
      },
      dismiss: () => {
        sheetRef.current?.dismiss().catch(() => {});
      },
    }));

    const totalRoutes = wallSections.reduce(
      (sum, w) => sum + w.route_count,
      0,
    );
    const todaysHours = gym?.hours?.[todayKey()] ?? null;
    const detents =
      context === 'menu' ? ([0.9] as const) : ([0.5, 0.9] as const);

    return (
      <TrueSheet
        ref={sheetRef}
        name="gym-info-sheet"
        detents={[...detents]}
        dimmed
        dismissible
        scrollable
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      >
        <TopFadeMaskView topFadeRatio={0.08}>
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover (floor plan thumbnail) */}
          <View style={styles.coverWrap}>
            {floorPlanSource || gym?.floor_plan_url ? (
              <Image
                source={
                  floorPlanSource ?? { uri: gym?.floor_plan_url ?? '' }
                }
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[styles.cover, styles.coverFallback]}
              >
                <Text style={styles.coverFallbackText}>
                  {gym?.name ?? tr('未命名岩馆', 'Unnamed Gym')}
                </Text>
              </View>
            )}
          </View>

          {/* Title row */}
          <View style={styles.titleBlock}>
            <Text style={styles.gymName} numberOfLines={2}>
              {gym?.name ?? '—'}
            </Text>
            {gym?.partnership_status === 'active' ? (
              <Text style={styles.partnerTag}>
                {tr('合作岩馆', 'Partner Gym')}
              </Text>
            ) : null}
          </View>

          {/* Meta row */}
          <View style={styles.pillRow}>
            <Pill
              label={`${wallSections.length} ${tr('面墙', wallSections.length === 1 ? 'wall' : 'walls')}`}
              colors={colors}
            />
            <Pill
              label={`${totalRoutes} ${tr('路线', 'routes')}`}
              colors={colors}
            />
            {todaysHours ? (
              <Pill
                label={`${tr('今日', 'Today')} ${todaysHours}`}
                colors={colors}
              />
            ) : null}
          </View>

          {/* Hours */}
          {gym?.hours ? (
            <Section title={tr('营业时间', 'Hours')} colors={colors}>
              {DAY_KEYS.map((d) => (
                <View key={d} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{dayLabel(d, tr)}</Text>
                  <Text style={styles.hoursTime}>{gym.hours?.[d] ?? '—'}</Text>
                </View>
              ))}
            </Section>
          ) : null}

          {/* Amenities */}
          {gym?.amenities && gym.amenities.length > 0 ? (
            <Section title={tr('设施', 'Amenities')} colors={colors}>
              <View style={styles.amenityRow}>
                {gym.amenities.map((a) => (
                  <Text key={a} style={styles.amenityChip}>
                    {a}
                  </Text>
                ))}
              </View>
            </Section>
          ) : null}

          {/* Description */}
          {gym?.description ? (
            <Section title={tr('简介', 'About')} colors={colors}>
              <Text style={styles.description}>{gym.description}</Text>
            </Section>
          ) : null}
        </ScrollView>
        </TopFadeMaskView>
      </TrueSheet>
    );
  },
);

GymInfoSheet.displayName = 'GymInfoSheet';
export default GymInfoSheet;

function Pill({
  label,
  colors,
}: {
  label: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <Text
        style={{
          fontFamily: theme.fonts.medium,
          fontSize: 13,
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={{
          fontFamily: theme.fonts.medium,
          fontSize: 13,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 0,
      paddingBottom: 32,
    },
    coverWrap: {
      marginHorizontal: -theme.spacing.screenPadding,
      height: 160,
    },
    cover: {
      width: '100%',
      height: '100%',
    },
    coverFallback: {
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverFallbackText: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textSecondary,
    },
    titleBlock: {
      paddingTop: 12,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    gymName: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 22,
      color: c.textPrimary,
    },
    partnerTag: {
      fontFamily: theme.fonts.medium,
      fontSize: 11,
      color: c.accent,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: c.backgroundSecondary,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 10,
    },
    hoursRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    hoursDay: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
      color: c.textPrimary,
    },
    hoursTime: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
    },
    amenityRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    amenityChip: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textPrimary,
      backgroundColor: c.backgroundSecondary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    description: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 20,
    },
  });
