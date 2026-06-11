// src/features/mapscreen/components/outdoor-area-sheet/BrowseSortMenu.tsx
// CB — combined glass sort + Routes sub-filter menu (replaces the separate
// sort MenuPill + Sport/Trad chips). ONE native UIMenu (iOS-26 glass): a Sort
// section (Classic / Grade) + a Type section (Sport / Trad, only for Routes).
// menuActionDismissBehavior=disabled so multi-toggling the sub-filter keeps
// the menu open. The pill label reflects the sort (+ narrowed discipline).

import { Host, Menu, Button, Section, HStack, Text, Image } from '@expo/ui/swift-ui';
import {
  fixedSize,
  foregroundStyle,
  glassEffect,
  menuActionDismissBehavior,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import type { RouteDiscipline, RouteSortKey } from './BrowseFilterBar';

type Props = {
  sortKey: RouteSortKey;
  onSortKey: (k: RouteSortKey) => void;
  discipline: RouteDiscipline;
  subSport: boolean;
  subTrad: boolean;
  onToggleSub: (k: 'sport' | 'trad') => void;
};

export function BrowseSortMenu({
  sortKey,
  onSortKey,
  discipline,
  subSport,
  subTrad,
  onToggleSub,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();

  const sortLabels: Record<RouteSortKey, string> = {
    classic: tr('经典', 'Classic'),
    grade: tr('难度', 'Grade'),
  };
  let label = sortLabels[sortKey];
  if (discipline === 'rope' && subSport !== subTrad) {
    label += ` · ${subSport ? tr('运动', 'Sport') : tr('传统', 'Trad')}`;
  }

  return (
    <Host matchContents>
      <Menu
        modifiers={[menuActionDismissBehavior('disabled')] as any}
        label={
          <HStack
            spacing={4}
            modifiers={[
              fixedSize(),
              padding({ horizontal: 12, vertical: 6 }),
              glassEffect({
                glass: { variant: 'regular', interactive: true },
                shape: 'capsule',
              }),
            ]}
          >
            <Text modifiers={[foregroundStyle(colors.textPrimary as string)]}>
              {label}
            </Text>
            <Image systemName="chevron.down" size={11} color={colors.textPrimary} />
          </HStack>
        }
      >
        <Section title={tr('排序', 'Sort')}>
          <Button
            label={sortLabels.classic}
            systemImage={sortKey === 'classic' ? 'checkmark' : undefined}
            onPress={() => onSortKey('classic')}
          />
          <Button
            label={sortLabels.grade}
            systemImage={sortKey === 'grade' ? 'checkmark' : undefined}
            onPress={() => onSortKey('grade')}
          />
        </Section>
        {discipline === 'rope' ? (
          <Section title={tr('类型', 'Type')}>
            <Button
              label={tr('运动', 'Sport')}
              systemImage={subSport ? 'checkmark' : undefined}
              onPress={() => onToggleSub('sport')}
            />
            <Button
              label={tr('传统', 'Trad')}
              systemImage={subTrad ? 'checkmark' : undefined}
              onPress={() => onToggleSub('trad')}
            />
          </Section>
        ) : null}
      </Menu>
    </Host>
  );
}
