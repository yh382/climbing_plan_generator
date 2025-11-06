import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

// ---- 本地定义一个日对象类型（兼容不同版本的类型声明）----
type DayObj = {
  dateString: string; // "YYYY-MM-DD"
  day: number;        // 1-31
  month: number;      // 1-12
  year: number;       // 4-digit
  timestamp?: number; // 可选
};

// ---- 语言配置（不要包含 today 字段，否则 TS 报错）----
if (!LocaleConfig.locales["zh-CN"]) {
  LocaleConfig.locales["zh-CN"] = {
    monthNames: ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],
    monthNamesShort: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    dayNames: ["周日","周一","周二","周三","周四","周五","周六"],
    dayNamesShort: ["日","一","二","三","四","五","六"],
  };
}
if (!LocaleConfig.locales["en-US"]) {
  LocaleConfig.locales["en-US"] = {
    monthNames: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    monthNamesShort: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    dayNames: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    dayNamesShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  };
}

type Props = {
  visible: boolean;                 // 是否展开
  onClose: () => void;              // 关闭（点遮罩/选完日期）
  date: Date;                       // 当前所选日期
  onSelect: (d: Date) => void;      // 选择回调
  lang?: "zh" | "en";               // 默认 zh
  firstDay?: 0 | 1;                 // 周日/周一，默认 1
  topOffset?: number;               // 距顶部偏移，默认 56（TopDateHeader 高度）
  renderDayExtra?: (date: Date) => React.ReactNode;  // ✅ 新增
  onMonthChange?: (anyDayInMonth: Date) => void;  
};

const CARD_H = 460; // 月历卡片高度

export default function CollapsibleCalendarOverlay({
  visible,
  onClose,
  date,
  onSelect,
  lang = "zh",
  firstDay = 1,
  topOffset = -1000,
  renderDayExtra,
  onMonthChange,
}: Props) {
  LocaleConfig.defaultLocale = lang === "zh" ? "zh-CN" : "en-US";

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const selectedStr = fmt(date);

  const marked = useMemo(
    () => ({
      [selectedStr]: {
        selected: true,
        selectedColor: "#2563EB",
        selectedTextColor: "#FFFFFF",
      },
    }),
    [selectedStr]
  );

  // 动画
  const a = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true, // 只做位移/透明度，可以用原生驱动
    }).start();
  }, [visible, a]);

  const backdropStyle = {
    opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] }),
  };
  const cardStyle = {
    transform: [
      {
        translateY: a.interpolate({
          inputRange: [0, 1],
          outputRange: [-24, 0], // ⬅️ 打开时自上而下滑入
        }),
      },
    ],
    opacity: a, // 如果你原来有别的 opacity 逻辑，可保留
  };

  return (
    // 绝对定位：覆盖日期栏下方到屏幕底部
    <View
      pointerEvents={visible ? "auto" : "none"}
      style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
    >
      {/* 遮罩：低亮并阻断交互 */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      {/* 月历卡片（覆盖在页面上，不推内容） */}
      <Animated.View style={[styles.cardWrap, { top: topOffset }, cardStyle]} pointerEvents="auto">
        <View style={styles.card}>
        <Calendar
          current={selectedStr}
          firstDay={firstDay}
          enableSwipeMonths
          // ✅ 切月时回传该月 1 号作为锚点，外部据此重建本月 Map
          onMonthChange={(m) => onMonthChange?.(new Date(m.year, m.month - 1, 1))}
          // ✅ 保留选中态（供 dayComponent 引用）
          markedDates={marked as any}
          // ✅ 自定义日期格子：数字 + 右上角叠加渲染（小环）
          dayComponent={(params) => {
            const d = params?.date;
            const state = params?.state;
            if (!d) return <View style={{ width: 48, height: 60 }} />;

            const isSelected = !!(marked as any)?.[d.dateString];
            const disabled = state === "disabled";
            const dt = new Date(d.year, d.month - 1, d.day);

            return (
              <TouchableWithoutFeedback onPress={() => onSelect(dt)}>
                <View
                  style={{
                    // ✅ 更高更宽，给上方“环”留空间
                    width: 48,
                    height: 60,
                    alignItems: "center",
                    justifyContent: "flex-start",
                  }}
                >
                  {/* ✅ 上方：渲染来自外部的环（居中显示，不再右上角） */}
                  <View style={{ marginTop: 4, marginBottom: 2 }}>
                    {renderDayExtra?.(dt)}
                  </View>

                  {/* 下方：日期数字（用 26×26 的容器包裹，蓝色圆居中对齐） */}
                  <View style={{ marginTop: 2 }}>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {isSelected && (
                        <View
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: "#2563EB",
                          }}
                        />
                      )}
                      <Animated.Text
                        style={{
                          fontSize: 14,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected ? "#FFFFFF" : disabled ? "#9CA3AF" : "#111827",
                        }}
                      >
                        {d.day}
                      </Animated.Text>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            );
          }}

          theme={{
            todayTextColor: "#2563EB",
            selectedDayBackgroundColor: "#2563EB",
            selectedDayTextColor: "#FFFFFF",
            textSectionTitleColor: "#6B7280",
            monthTextColor: "#111827",
            textMonthFontWeight: "600",
            arrowColor: "#111827",
          }}
          style={{ borderRadius: 12, height: CARD_H }}
        />

        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  cardWrap: {
    position: "absolute",      // ← 新增：卡片绝对定位
    left: 0,                   // ← 代替 marginHorizontal
    right: 0,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    // 保留下边圆角（可以按需调大/调小）
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
