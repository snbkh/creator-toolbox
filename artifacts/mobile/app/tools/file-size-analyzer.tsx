import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#0EA5E9";

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function formatTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000) return "Just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function FileSizeAnalyzerScreen() {
  const colors = useColors();
  const { processedFiles } = useApp();

  const stats = useMemo(() => {
    const totalOriginal = processedFiles.reduce((s, f) => s + f.originalSize, 0);
    const totalProcessed = processedFiles.reduce((s, f) => s + f.processedSize, 0);
    const totalSaved = totalOriginal - totalProcessed;
    const byType = processedFiles.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] ?? 0) + f.originalSize;
      return acc;
    }, {} as Record<string, number>);
    const biggest = [...processedFiles].sort((a, b) => b.originalSize - a.originalSize).slice(0, 3);
    return { totalOriginal, totalProcessed, totalSaved, byType, biggest, count: processedFiles.length };
  }, [processedFiles]);

  const typeColors: Record<string, string> = { image: "#8B5CF6", pdf: "#DC2626", text: "#0EA5E9", other: "#6B7280" };
  const typeIcons: Record<string, string> = { image: "image-outline", pdf: "file-pdf-box", text: "document-text-outline", other: "cube-outline" };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="File Size Analyzer" subtitle="Storage analytics for your files" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {processedFiles.length === 0 ? (
          <View style={[styles.empty, { margin: 16 }]}>
            <MaterialCommunityIcons name="chart-pie-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No files processed yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Use any image or PDF tool to process files. They'll appear here with detailed size analytics.</Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              {[
                { label: "Files Processed", val: stats.count.toString(), color: ACCENT, icon: "file-multiple-outline" },
                { label: "Total Original", val: fmtSize(stats.totalOriginal), color: "#8B5CF6", icon: "database-outline" },
                { label: "Space Saved", val: fmtSize(Math.max(0, stats.totalSaved)), color: "#10B981", icon: "arrow-collapse-down" },
                { label: "Avg Reduction", val: stats.count > 0 ? `${Math.round((1 - stats.totalProcessed / stats.totalOriginal) * 100)}%` : "0%", color: "#F59E0B", icon: "percent-outline" },
              ].map((s) => (
                <View key={s.label} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <MaterialCommunityIcons name={s.icon as never} size={20} color={s.color} />
                  <Text style={[styles.summaryVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* By Type */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>BY FILE TYPE</Text>
              {Object.entries(stats.byType).map(([type, size]) => {
                const pct = stats.totalOriginal > 0 ? (size / stats.totalOriginal) * 100 : 0;
                const color = typeColors[type] ?? "#6B7280";
                return (
                  <View key={type} style={styles.typeRow}>
                    <MaterialCommunityIcons name={(typeIcons[type] ?? "cube-outline") as never} size={18} color={color} />
                    <Text style={[styles.typeName, { color: colors.foreground }]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.bar, { width: `${pct}%`, backgroundColor: color, borderRadius: 4 }]} />
                    </View>
                    <Text style={[styles.typeSize, { color: color }]}>{fmtSize(size)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Biggest Files */}
            {stats.biggest.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>LARGEST FILES PROCESSED</Text>
                {stats.biggest.map((f) => (
                  <View key={f.id} style={[styles.fileRow, { borderBottomColor: colors.border }]}>
                    <MaterialCommunityIcons name={(typeIcons[f.type] ?? "cube-outline") as never} size={18} color={typeColors[f.type] ?? "#6B7280"} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{f.name}</Text>
                      <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>{formatTime(f.timestamp)}</Text>
                    </View>
                    <View style={styles.fileSizes}>
                      <Text style={[styles.fileOriginal, { color: colors.mutedForeground }]}>{fmtSize(f.originalSize)}</Text>
                      <MaterialCommunityIcons name="arrow-right" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.fileProcessed, { color: "#10B981" }]}>{fmtSize(f.processedSize)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 10 },
  summaryCard: { width: "47%", padding: 16, borderWidth: 1, gap: 6 },
  summaryVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeName: { fontSize: 13, fontFamily: "Inter_500Medium", width: 48 },
  barContainer: { flex: 1, height: 8, backgroundColor: "#00000011", borderRadius: 4, overflow: "hidden" },
  bar: { height: "100%" },
  typeSize: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 64, textAlign: "right" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  fileName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fileMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  fileSizes: { flexDirection: "row", alignItems: "center", gap: 4 },
  fileOriginal: { fontSize: 11, fontFamily: "Inter_500Medium" },
  fileProcessed: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
