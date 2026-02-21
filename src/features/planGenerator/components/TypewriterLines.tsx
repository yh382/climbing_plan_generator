// src/feature/planGenerator/components/TypewriterLines.tsx
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

export function TypewriterLines({
  lines,
  charInterval = 18,
  linePause = 260,
  onDone,
  textStyle,
  lineStyle,
}: {
  lines: string[];
  charInterval?: number;
  linePause?: number;
  onDone?: () => void;
  textStyle?: any;
  lineStyle?: any;
}) {
  const [doneLines, setDoneLines] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setDoneLines([]);
    setCurrent("");
    setIdx(0);
  }, [JSON.stringify(lines)]);

  useEffect(() => {
    if (!lines || idx >= lines.length) {
      onDone?.();
      return;
    }
    const target = lines[idx] ?? "";

    let char = 0;
    const timer = setInterval(() => {
      char++;
      setCurrent(target.slice(0, char));
      if (char >= target.length) {
        clearInterval(timer);
        setTimeout(() => {
          setDoneLines((prev) => [...prev, target]);
          setCurrent("");
          setIdx((n) => n + 1);
        }, linePause);
      }
    }, Math.max(1, charInterval));

    return () => clearInterval(timer);
  }, [idx, lines, charInterval, linePause, onDone]);

  return (
    <View>
      {doneLines.map((ln, i) => (
        <Text
          key={`ln-${i}`}
          style={[{ color: "#374151", lineHeight: 20, marginBottom: 4 }, textStyle, lineStyle]}
        >
          {ln}
        </Text>
      ))}
      {idx < lines.length && (
        <Text style={[{ color: "#374151", lineHeight: 20, marginBottom: 4 }, textStyle, lineStyle]}>
          {current}
          <Text style={{ opacity: 0.5 }}>▋</Text>
        </Text>
      )}
    </View>
  );
}
