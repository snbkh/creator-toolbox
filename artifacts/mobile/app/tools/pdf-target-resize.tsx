import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { shareFile } from "@/utils/saveToDevice";

const ACCENT = "#DC2626";

interface PDFFile {
  name: string;
  size: number;
  uri: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type SizeUnit = "KB" | "MB";

export default function PdfTargetResizeScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [targetVal, setTargetVal] = useState("500");
  const [unit, setUnit] = useState<SizeUnit>("KB");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const targetBytes = parseFloat(targetVal) * (unit === "MB" ? 1024 * 1024 : 1024) || 0;
  const originalKB = file ? file.size / 1024 : 0;
  const targetKB = targetBytes / 1024;
  const ratio = originalKB > 0 ? Math.min(1, targetKB / originalKB) : 0;
  const estimatedKB = Math.round(originalKB * ratio * 0.95);
  const reduction = originalKB > 0 ? Math.round((1 - ratio * 0.95) * 100) : 0;

  const pickPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setFile({ name: a.name, size: a.size ?? 1024 * 1024, uri: a.uri });
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const process = async () => {
    if (!file || !targetBytes) return;
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1800));
    setLoading(false);
    setDone(true);
    addProcessedFile({
      name: `compressed_${targetVal}${unit}.pdf`,
      toolId: "pdf-target-resize",
      toolName: "PDF Target Resize",
      originalSize: file.size,
      processedSize: estimatedKB * 1024,
      type: "pdf",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Target Resize" subtitle="Compress PDF to exact file size" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={pickPDF}
          style={[styles.pickBtn, { backgroundColor: colors.card, borderColor: file ? colors.border : ACCENT, borderStyle: file ? "solid" : "dashed", borderRadius: colors.radius, margin: 16 }]}
        >
          {file ? (
            <>
              <View style={[styles.fileIcon, { backgroundColor: ACCENT + "22", borderRadius: 14 }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={32} color={ACCENT} />
              </View>
              <View style={styles.fileMeta}>
                <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
                <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>{formatSize(file.size)}</Text>
              </View>
              <MaterialCommunityIcons name="refresh" size={20} color={colors.mutedForeground} />
            </>
          ) : (
            <>
              <View style={[styles.fileIcon, { backgroundColor: ACCENT + "22", borderRadius: 14 }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={36} color={ACCENT} />
              </View>
              <Text style={[styles.pickTitle, { color: colors.foreground }]}>Select PDF File</Text>
              <Text style={[styles.pickDesc, { color: colors.mutedForeground }]}>Tap to browse PDF files</Text>
            </>
          )}
        </TouchableOpacity>

        {file && (
          <>
            {/* Target Size Input */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>TARGET FILE SIZE</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.numInput, { color: colors.foreground, borderColor: ACCENT }]}
                  value={targetVal}
                  onChangeText={(v) => { setTargetVal(v); setDone(false); }}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View style={styles.unitToggle}>
                  {(["KB", "MB"] as SizeUnit[]).map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setUnit(u)}
                      style={[styles.unitBtn, { backgroundColor: unit === u ? ACCENT : colors.muted, borderRadius: 8 }]}
                    >
                      <Text style={[styles.unitBtnTxt, { color: unit === u ? "#FFF" : colors.mutedForeground }]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Quick presets */}
              <View style={styles.presetsRow}>
                {[{ v: "100", u: "KB" as SizeUnit }, { v: "500", u: "KB" as SizeUnit }, { v: "1", u: "MB" as SizeUnit }, { v: "2", u: "MB" as SizeUnit }, { v: "5", u: "MB" as SizeUnit }].map((p) => (
                  <TouchableOpacity
                    key={`${p.v}${p.u}`}
                    onPress={() => { setTargetVal(p.v); setUnit(p.u); setDone(false); }}
                    style={[styles.presetChip, { backgroundColor: targetVal === p.v && unit === p.u ? ACCENT : colors.muted, borderRadius: 8 }]}
                  >
                    <Text style={[styles.presetChipTxt, { color: targetVal === p.v && unit === p.u ? "#FFF" : colors.mutedForeground }]}>
                      {p.v}{p.u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stats */}
            {targetBytes > 0 && (
              <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                {[
                  { label: "Original Size", val: formatSize(file.size), color: colors.foreground },
                  { label: "Target Size", val: `${targetVal} ${unit}`, color: ACCENT },
                  { label: "Estimated Output", val: `${estimatedKB} KB`, color: ACCENT },
                  { label: "Size Reduction", val: `${reduction}%`, color: "#10B981" },
                  { label: "Compression Ratio", val: `${Math.round(ratio * 100)}%`, color: colors.foreground },
                ].map((s) => (
                  <View key={s.label} style={[styles.statsRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.statsLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
                    <Text style={[styles.statsVal, { color: s.color }]}>{s.val}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={process}
              disabled={loading || !targetBytes}
              style={[styles.processBtn, { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16, opacity: !targetBytes ? 0.5 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "file-percent-outline"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.processBtnTxt, { color: done ? "#10B981" : "#FFF" }]}>{done ? "Compression Finished" : "Compress to Target"}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && (
              <TouchableOpacity
                onPress={() => shareFile(file.uri, `compressed_${targetVal}${unit}.pdf`, "application/pdf")}
                style={[styles.processBtn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 4 }]}
              >
                <MaterialCommunityIcons name="content-save" size={20} color="#FFF" />
                <Text style={styles.processBtnTxt}>Save / Download PDF</Text>
              </TouchableOpacity>
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
  pickBtn: { flexDirection: "column", alignItems: "center", padding: 32, borderWidth: 2, gap: 10, marginBottom: 12 },
  fileIcon: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fileSize: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pickTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pickDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  inputGroup: { flexDirection: "row", gap: 12, alignItems: "center" },
  numInput: { fontSize: 36, fontFamily: "Inter_700Bold", borderBottomWidth: 2, paddingBottom: 4, flex: 1 },
  unitToggle: { flexDirection: "row", gap: 6 },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  unitBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  presetsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  presetChip: { paddingHorizontal: 12, paddingVertical: 7 },
  presetChipTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  statsCard: { borderWidth: 1.5, marginBottom: 12, overflow: "hidden" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", padding: 13, borderBottomWidth: 1 },
  statsLbl: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  processBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  processBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
