// src/features/mapscreen/components/ReportsSheet.tsx
// Stacked sheet launched from AreaMenuSheet's "Reports" entry. MVP shell:
// lists user's past reports (always empty via stub) + "Report a new issue"
// CTA that alerts "Coming soon". Backend endpoints + create-report sub-sheet
// land in a later window.

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { reportsApi, type Report } from '../../outdoor/reportsApi';

export interface ReportsSheetHandle {
  present: () => void;
  dismiss: () => void;
}

const ReportsSheet = forwardRef<ReportsSheetHandle>((_, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const sheetRef = useRef<TrueSheet>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reportsApi.listMine();
      setReports(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    present: () => {
      sheetRef.current?.present().catch(() => {});
      loadReports();
    },
    dismiss: () => {
      sheetRef.current?.dismiss().catch(() => {});
    },
  }));

  const handleReportNew = () => {
    Alert.alert(
      tr('即将推出', 'Coming soon'),
      tr(
        '未来此处可以报告错误信息、断螺栓、通行问题等。',
        "You'll be able to flag incorrect info, broken bolts, access issues, etc.",
      ),
    );
  };

  return (
    <TrueSheet
      ref={sheetRef}
      name="crag-reports-sheet"
      detents={[1.0]}
      dimmed
      dismissible
      grabber
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{tr('我的报告', 'My Reports')}</Text>
      </View>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowSubject} numberOfLines={1}>
              {item.subject_name}
            </Text>
            <Text style={styles.rowDesc} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {tr('暂无报告', 'No reports yet')}
              </Text>
            </View>
          )
        }
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={handleReportNew}
          activeOpacity={0.7}
        >
          <Text style={styles.reportBtnText}>
            {tr('报告新问题', 'Report a new issue')}
          </Text>
        </TouchableOpacity>
      </View>
    </TrueSheet>
  );
});

ReportsSheet.displayName = 'ReportsSheet';

export default ReportsSheet;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      color: c.textPrimary,
    },
    listContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 24,
      flexGrow: 1,
    },
    row: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowSubject: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: c.textPrimary,
    },
    rowDesc: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
    },
    footer: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 12,
      paddingBottom: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    reportBtn: {
      backgroundColor: c.cardDark,
      borderRadius: 20,
      paddingVertical: 14,
      alignItems: 'center',
    },
    reportBtnText: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: '#FFFFFF',
    },
  });
