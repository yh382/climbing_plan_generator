import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Circle, Line, Text as SvgText } from "react-native-svg";
import type { CSMState, CSMHistoryPoint } from "../../services/stats/csmAnalyzer";

const CHART_SIZE = 260;
const PAD = 32; // padding for axis labels
const PLOT = CHART_SIZE - PAD * 2;

// Quadrant background colours (very light)
const Q_COLORS = {
  push: "#DCFCE7",      // green
  challenge: "#FEF3C7", // amber
  develop: "#DBEAFE",   // blue
  rebuild: "#FEE2E2",   // red
};

const CURRENT_COLOR = "#4F46E5";
const HISTORY_COLOR = "#94A3B8";

function toXY(lp: number, ss: number) {
  return {
    x: PAD + lp * PLOT,
    y: PAD + (1 - ss) * PLOT, // Y flipped (0 at bottom)
  };
}

interface Props {
  current: CSMState | null;
  history: CSMHistoryPoint[];
}

export default function ClimbStateMap({ current, history }: Props) {
  const mid = PLOT / 2 + PAD;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Climb State Map</Text>

      <View style={styles.chartWrap}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          {/* Quadrant backgrounds */}
          <Rect x={PAD} y={PAD} width={PLOT / 2} height={PLOT / 2} fill={Q_COLORS.develop} />
          <Rect x={mid} y={PAD} width={PLOT / 2} height={PLOT / 2} fill={Q_COLORS.push} />
          <Rect x={PAD} y={mid} width={PLOT / 2} height={PLOT / 2} fill={Q_COLORS.rebuild} />
          <Rect x={mid} y={mid} width={PLOT / 2} height={PLOT / 2} fill={Q_COLORS.challenge} />

          {/* Grid lines (center cross) */}
          <Line x1={mid} y1={PAD} x2={mid} y2={PAD + PLOT} stroke="#D1D5DB" strokeWidth={1} strokeDasharray="4,3" />
          <Line x1={PAD} y1={mid} x2={PAD + PLOT} y2={mid} stroke="#D1D5DB" strokeWidth={1} strokeDasharray="4,3" />

          {/* Border */}
          <Rect x={PAD} y={PAD} width={PLOT} height={PLOT} fill="none" stroke="#E5E7EB" strokeWidth={1} rx={4} />

          {/* Quadrant labels */}
          <SvgText x={PAD + PLOT * 0.25} y={PAD + 14} fontSize={9} fill="#64748B" fontWeight="600" textAnchor="middle">Develop</SvgText>
          <SvgText x={PAD + PLOT * 0.75} y={PAD + 14} fontSize={9} fill="#64748B" fontWeight="600" textAnchor="middle">Push</SvgText>
          <SvgText x={PAD + PLOT * 0.25} y={PAD + PLOT - 6} fontSize={9} fill="#64748B" fontWeight="600" textAnchor="middle">Rebuild</SvgText>
          <SvgText x={PAD + PLOT * 0.75} y={PAD + PLOT - 6} fontSize={9} fill="#64748B" fontWeight="600" textAnchor="middle">Challenge</SvgText>

          {/* Axis labels */}
          <SvgText x={CHART_SIZE / 2} y={CHART_SIZE - 4} fontSize={10} fill="#64748B" fontWeight="600" textAnchor="middle">LP</SvgText>
          <SvgText x={8} y={CHART_SIZE / 2} fontSize={10} fill="#64748B" fontWeight="600" textAnchor="middle" rotation={-90} originX={8} originY={CHART_SIZE / 2}>SS</SvgText>

          {/* Axis tick labels */}
          <SvgText x={PAD} y={PAD + PLOT + 14} fontSize={8} fill="#9CA3AF" textAnchor="middle">0</SvgText>
          <SvgText x={mid} y={PAD + PLOT + 14} fontSize={8} fill="#9CA3AF" textAnchor="middle">0.5</SvgText>
          <SvgText x={PAD + PLOT} y={PAD + PLOT + 14} fontSize={8} fill="#9CA3AF" textAnchor="middle">1</SvgText>

          {/* History trajectory */}
          {history.map((pt, i) => {
            const { x, y } = toXY(pt.lp, pt.ss);
            const next = history[i + 1];
            return (
              <React.Fragment key={i}>
                {next && (
                  <Line
                    x1={x}
                    y1={y}
                    x2={toXY(next.lp, next.ss).x}
                    y2={toXY(next.lp, next.ss).y}
                    stroke={HISTORY_COLOR}
                    strokeWidth={1.5}
                    strokeDasharray="3,2"
                  />
                )}
                <Circle cx={x} cy={y} r={3} fill={HISTORY_COLOR} opacity={0.5 + (i / history.length) * 0.5} />
              </React.Fragment>
            );
          })}

          {/* Current position */}
          {current && (
            <>
              <Circle
                cx={toXY(current.lp, current.ss).x}
                cy={toXY(current.lp, current.ss).y}
                r={10}
                fill={CURRENT_COLOR}
                opacity={0.15}
              />
              <Circle
                cx={toXY(current.lp, current.ss).x}
                cy={toXY(current.lp, current.ss).y}
                r={6}
                fill={CURRENT_COLOR}
              />
            </>
          )}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CURRENT_COLOR }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: HISTORY_COLOR }]} />
          <Text style={styles.legendText}>History</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  chartWrap: {
    alignItems: "center",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
});
