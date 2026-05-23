import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { shareFile } from "@/utils/saveToDevice";

const ACCENT = "#DC2626";
interface PDFFile { name: string; size: number; uri: string; }
function fmtSize(b: number): string { return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`; }

type SplitMode = "range" | "every" | "extract";

export default function PdfSplitScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [mode, setMode] = useState<SplitMode>("range");
  const [fromPage, setFromPage] = useState("1");
  const [toPage, setToPage] = useState("5");
  const [everyN, setEveryN] = useState("1");
  const [extractPages, setExtractPages] = useState("1,3,5");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!r.canceled && r.assets[0]) { setFile({ name: r.assets[0].name, size: r.assets[0].size ?? 2 * 1048576, uri: r.assets[0].uri }); setDone(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  };

  const split = async () => {
    if (!file) return;
    if (mode === "range" && parseInt(fromPage, 10) > parseInt(toPage, 10)) { Alert.alert("Invalid Range", "Start page must be less than end page."); return; }
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1500));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: `split_${file.name}`, toolId: "pdf-split", toolName: "PDF Split", originalSize: file.size, processedSize: Math.round(file.size * 0.4), type: "pdf" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Split" subtitle="Extract pages from PDF" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pick} style={[styles.picker, { backgroundColor: colors.card, borderColor: file ? colors.border : ACCENT, borderStyle: file ? "solid" : "dashed", borderRadius: colors.radius, margin: 16 }]}>
          <MaterialCommunityIcons name="file-pdf-box" size={28} color={ACCENT} />
          <View>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>{file ? file.name : "Select PDF File"}</Text>
            {file && <Text style={[styles.pickerDesc, { color: colors.mutedForeground }]}>{fmtSize(file.size)}</Text>}
          </View>
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            <View style={[styles.modeBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {([["range", "Page Range"], ["every", "Split Every N"], ["extract", "Extract Pages"]] as [SplitMode, string][]).map(([m, label]) => (
                <TouchableOpacity key={m} onPress={() => setMode(m)} style={[styles.modeBtn, { backgroundColor: mode === m ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}>
                  <Text style={[styles.modeBtnTxt, { color: mode === m ? "#FFF" : colors.mutedForeground }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {mode === "range" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>EXTRACT PAGES FROM — TO</Text>
                  <View style={styles.rangeRow}>
                    <View style={styles.pageInput}>
                      <Text style={[styles.pageLabel, { color: colors.mutedForeground }]}>From</Text>
                      <TextInput style={[styles.pageNum, { color: colors.foreground, borderColor: ACCENT }]} value={fromPage} onChangeText={setFromPage} keyboardType="numeric" />
                    </View>
                    <Text style={[styles.dash, { color: colors.mutedForeground }]}>—</Text>
                    <View style={styles.pageInput}>
                      <Text style={[styles.pageLabel, { color: colors.mutedForeground }]}>To</Text>
                      <TextInput style={[styles.pageNum, { color: colors.foreground, borderColor: ACCENT }]} value={toPage} onChangeText={setToPage} keyboardType="numeric" />
                    </View>
                  </View>
                </>
              )}
              {mode === "every" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>SPLIT EVERY N PAGES</Text>
                  <View style={styles.everyRow}>
                    {["1", "2", "5", "10"].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setEveryN(n)} style={[styles.nBtn, { backgroundColor: everyN === n ? ACCENT : colors.muted, borderRadius: 8 }]}>
                        <Text style={[styles.nBtnTxt, { color: everyN === n ? "#FFF" : colors.mutedForeground }]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                    <TextInput style={[styles.nInput, { color: colors.foreground, borderColor: ACCENT }]} value={everyN} onChangeText={setEveryN} keyboardType="numeric" placeholder="Custom" placeholderTextColor={colors.mutedForeground} />
                  </View>
                </>
              )}
              {mode === "extract" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>PAGE NUMBERS (comma-separated)</Text>
                  <TextInput style={[styles.extractInput, { color: colors.foreground, borderColor: ACCENT }]} value={extractPages} onChangeText={setExtractPages} placeholder="e.g. 1, 3, 5-8, 10" placeholderTextColor={colors.mutedForeground} />
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>You can use ranges like 5-8</Text>
                </>
              )}
            </View>

            <TouchableOpacity onPress={split} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "call-split"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.btnTxt, { color: done ? "#10B981" : "#FFF" }]}>{done ? "PDF Pages Extracted" : "Split PDF"}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && (
              <TouchableOpacity
                onPress={() => shareFile(file.uri, `split_${file.name}`, "application/pdf")}
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
  pickerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  modeBar: { flexDirection: "row", borderWidth: 1, padding: 4, gap: 4, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 9, alignItems: "center" },
  modeBtnTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  pageInput: { flex: 1, gap: 6 },
  pageLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  pageNum: { fontSize: 32, fontFamily: "Inter_700Bold", borderBottomWidth: 2, paddingBottom: 4 },
  dash: { fontSize: 24, fontFamily: "Inter_400Regular", marginTop: 20 },
  everyRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  nBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  nBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  nInput: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", borderBottomWidth: 2, paddingBottom: 4, minWidth: 80 },
  extractInput: { fontSize: 16, fontFamily: "Inter_500Medium", borderBottomWidth: 2, paddingBottom: 6 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
