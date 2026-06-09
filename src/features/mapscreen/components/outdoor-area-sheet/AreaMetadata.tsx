// src/features/mapscreen/components/outdoor-area-sheet/AreaMetadata.tsx
// CA Phase 4a — approach text + BS-P1-γ location audit pill + source UUID.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import type { LocationAudit } from '../../../outdoor/types';
import { sheetLabels, type ThemeColors } from './shared';

type Props = {
  approach?: string | null;
  description?: string | null;
  locationAudit?: LocationAudit | null;
  sourceExternalId?: string | null;
  source?: string | null;
};

export function AreaMetadata({
  approach, description, locationAudit, sourceExternalId, source,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // LocationAudit.source ∈ 'user' | 'admin' | 'import' | 'osm' | 'derived' | null.
  // Show "approximate" warning for everything except explicit user/admin entries.
  const showApproximate =
    locationAudit?.source &&
    locationAudit.source !== 'user' &&
    locationAudit.source !== 'admin';

  if (!approach && !description && !showApproximate && !sourceExternalId) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.textPrimary }]}>
        {sheetLabels.metadata(tr)}
      </Text>

      {showApproximate ? (
        <View style={[styles.audit, { backgroundColor: colors.warningTint }]}>
          <Ionicons
            name="locate-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.auditText, { color: colors.textPrimary }]}>
            {sheetLabels.approximateLocation(tr)}
          </Text>
        </View>
      ) : null}

      {description ? (
        <Text style={[styles.body, { color: colors.textPrimary }]}>
          {description}
        </Text>
      ) : null}

      {approach ? (
        <View style={styles.subBlock}>
          <Text style={[styles.subHeading, { color: colors.textSecondary }]}>
            {sheetLabels.approach(tr)}
          </Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            {approach}
          </Text>
        </View>
      ) : null}

      {sourceExternalId ? (
        <View style={styles.subBlock}>
          <Text style={[styles.subHeading, { color: colors.textSecondary }]}>
            {sheetLabels.source(tr)}
          </Text>
          <Text style={[styles.codeText, { color: colors.textSecondary }]}>
            {(source ?? 'openbeta').toUpperCase()} · {sourceExternalId}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 18,
    gap: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  subBlock: { gap: 4 },
  audit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  auditText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'DMMono_400Regular',
  },
});
