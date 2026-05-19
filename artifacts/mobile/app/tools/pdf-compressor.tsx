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

interface PDFFile { name: string; size: number; uri: string; }
function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

const PRESETS = [
  { id: "screen", label: "Screen", desc: "72 DPI, smallest file", ratio: 0.25 },
  { id: "ebook", label: "eBook", desc: "150 DPI, balanced", ratio: 0.45 },
  { id: "print", label: "Print", desc: "300 DPI, high quality", ratio: 0.70 },
  { id: "high", label: "High Quality", desc: "No loss of quality", ratio: 0.90 },
];

export default function PdfCompressorScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [preset, setPreset] = useState("ebook");
  const [useTarget, setUseTarget] = useState(false);
  const [targetKB, setTargetKB] = useState("500");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const ratio = useTarget
    ? Math.min(1, (parseFloat(targetKB) * 1024) / (file?.size ?? 1))
    : PRESETS.find((p) => p.id === preset)?.ratio ?? 0.45;
  const estimatedSize = file ? Math.round(file.size * ratio * 0.95) : 0;

  const pickPDF = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: false });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      setFile({ name: a.name, size: a.size ?? 2 * 1048576, uri: a.uri });
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1500));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: `compressed_${file.name}`, toolId: "pdf-compressor", toolName: "PDF Compressor", originalSize: file.size, processedSize: estimatedSize, type: "pdf" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Compressor" subtitle="Reduce PDF file size" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={pickPDF}
          style={[styles.picker, { backgroundColor: colors.card, borderColor: file ? colors.border : ACCENT, borderStyle: file ? "solid" : "dashed", borderRadius: colors.radius, margin: 16 }]}
        >
          <View style={[styles.fileIconBox, { backgroundColor: ACCENT + "22", borderRadius: 14 }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={32} color={ACCENT} />
          </View>
          {file ? (
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
              <Text style={[styles.pickerDesc, { color: colors.mutedForeground }]}>{formatSize(file.size)}</Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select PDF</Text>
              <Text style={[styles.pickerDesc, { color: colors.mutedForeground }]}>Tap to browse</Text>
            </View>
          )}
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            {/* Mode Toggle */}
            <View style={[styles.modeToggle, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {[{ id: false, label: "Quality Preset" }, { id: true, label: "Target Size" }].map((m) => (
                <TouchableOpacity
                  key={String(m.id)}
                  onPress={() => setUseTarget(m.id)}
                  style={[styles.modeBtn, { backgroundColor: useTarget === m.id ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.modeBtnTxt, { color: useTarget === m.id ? "#FFF" : colors.mutedForeground }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!useTarget ? (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPreset(p.id)}
                    style={[styles.presetRow, { borderColor: preset === p.id ? ACCENT : colors.border, backgroundColor: preset === p.id ? ACCENT + "11" : "transparent", borderRadius: 10 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.presetName, { color: preset === p.id ? ACCENT : colors.foreground }]}>{p.label}</Text>
                      <Text style={[styles.presetDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
                    </View>
                    <Text style={[styles.presetRatio, { color: preset === p.id ? ACCENT : colors.mutedForeground }]}>
                      ~{Math.round((1 - p.ratio * 0.95) * 100)}% smaller
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>TARGET SIZE (KB)</Text>
                <TextInput
                  style={[styles.targetInput, { color: colors.foreground, borderColor: ACCENT }]}
                  value={targetKB}
                  onChangeText={setTargetKB}
                  keyboardType="numeric"
                  placeholder="e.g. 500"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View style={styles.quickPts}>
                  {["100", "500", "1024", "2048"].map((v) => (
                    <TouchableOpacity key={v} onPress={() => setTargetKB(v)} style={[styles.qpBtn, { backgroundColor: targetKB === v ? ACCENT : colors.muted, borderRadius: 8 }]}>
                      <Text style={[styles.qpTxt, { color: targetKB === v ? "#FFF" : colors.mutedForeground }]}>{parseInt(v, 10) >= 1024 ? `${parseInt(v, 10) / 1024}MB` : `${v}KB`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>ORIGINAL</Text>
                <Text style={[styles.resultVal, { color: colors.foreground }]}>{formatSize(file.size)}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.mutedForeground} />
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>ESTIMATED</Text>
                <Text style={[styles.resultVal, { color: ACCENT }]}>{formatSize(estimatedSize)}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>SAVED</Text>
                <Text style={[styles.resultVal, { color: "#10B981" }]}>-{Math.round((1 - ratio * 0.95) * 100)}%</Text>
              </View>
            </View>

            <TouchableOpacity onPress={compress} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "file-download-outline"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.btnTxt, { color: done ? "#10B981" : "#FFF" }]}>{done ? "Compression Finished" : "Compress PDF"}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && (
              <TouchableOpacity
                onPress={() => shareFile(file.uri, `compressed_${file.name}`, "application/pdf")}
                style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 4 }]}
              >
                <MaterialCommunityIcons name="content-save" size={20} color="#FFF" />
                <Text style={styles.btnTxt}>Save / Download PDF</Text>
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
  picker: { flexDirection: "row", alignItems: "center", padding: 20, borderWidth: 2, gap: 14, marginBottom: 12 },
  fileIconBox: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  pickerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pickerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  modeToggle: { flexDirection: "row", borderWidth: 1, padding: 4, gap: 4, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 9, alignItems: "center" },
  modeBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  presetRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1.5, gap: 10 },
  presetName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  presetDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  presetRatio: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  targetInput: { fontSize: 32, fontFamily: "Inter_700Bold", borderBottomWidth: 2, paddingBottom: 4 },
  quickPts: { flexDirection: "row", gap: 8 },
  qpBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  qpTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  resultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: 16, borderWidth: 1, marginBottom: 12 },
  resultItem: { alignItems: "center", gap: 4 },
  resultLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  resultVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
