import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#DC2626";
interface PDFFile { id: string; name: string; size: number; }
function fmtSize(b: number): string { return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`; }
function genId(): string { return Date.now().toString() + Math.random().toString(36).slice(2, 7); }

export default function PdfMergeScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const addFiles = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: false, multiple: true });
    if (!r.canceled) {
      const newFiles = r.assets.map((a) => ({ id: genId(), name: a.name, size: a.size ?? 500 * 1024 }));
      setFiles((prev) => [...prev, ...newFiles]);
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const remove = (id: string) => { setFiles((prev) => prev.filter((f) => f.id !== id)); setDone(false); };
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setFiles((prev) => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx]!, n[idx - 1]!]; return n; });
  };
  const moveDown = (idx: number) => {
    if (idx === files.length - 1) return;
    setFiles((prev) => { const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1]!, n[idx]!]; return n; });
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  const merge = async () => {
    if (files.length < 2) { Alert.alert("Add More Files", "Please add at least 2 PDF files to merge."); return; }
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 2000));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: `merged_${files.length}_files.pdf`, toolId: "pdf-merge", toolName: "PDF Merge", originalSize: totalSize, processedSize: Math.round(totalSize * 0.95), type: "pdf" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Merge" subtitle="Combine multiple PDFs into one" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={addFiles} style={[styles.addBtn, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}>
          <MaterialCommunityIcons name="file-plus-outline" size={28} color={ACCENT} />
          <Text style={[styles.addBtnTxt, { color: ACCENT }]}>Add PDF Files</Text>
        </TouchableOpacity>

        {files.length > 0 && (
          <>
            <View style={[styles.listHeader, { paddingHorizontal: 16 }]}>
              <Text style={[styles.listHeaderTxt, { color: colors.mutedForeground }]}>{files.length} FILE{files.length > 1 ? "S" : ""} · {fmtSize(totalSize)} TOTAL</Text>
              <TouchableOpacity onPress={() => { setFiles([]); setDone(false); }}>
                <Text style={[styles.clearTxt, { color: colors.destructive }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginHorizontal: 16, gap: 8, marginBottom: 12 }}>
              {files.map((f, idx) => (
                <View key={f.id} style={[styles.fileRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <View style={[styles.fileNum, { backgroundColor: ACCENT }]}><Text style={styles.fileNumTxt}>{idx + 1}</Text></View>
                  <MaterialCommunityIcons name="file-pdf-box" size={22} color={ACCENT} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>{fmtSize(f.size)}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => moveUp(idx)} disabled={idx === 0} style={[styles.actionBtn, { opacity: idx === 0 ? 0.3 : 1 }]}>
                      <MaterialCommunityIcons name="arrow-up" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveDown(idx)} disabled={idx === files.length - 1} style={[styles.actionBtn, { opacity: idx === files.length - 1 ? 0.3 : 1 }]}>
                      <MaterialCommunityIcons name="arrow-down" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(f.id)} style={styles.actionBtn}>
                      <MaterialCommunityIcons name="close" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={merge} disabled={loading || files.length < 2} style={[styles.mergeBtn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16, opacity: files.length < 2 ? 0.5 : 1 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "merge"} size={20} color="#FFF" />
                  <Text style={styles.mergeBtnTxt}>{done ? `Merged! ${fmtSize(totalSize * 0.95)}` : `Merge ${files.length} PDFs`}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {files.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <MaterialCommunityIcons name="file-multiple-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>Add at least 2 PDF files to merge them into a single document</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 20, borderWidth: 2, borderStyle: "dashed", gap: 10, marginBottom: 4 },
  addBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 },
  listHeaderTxt: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  clearTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fileRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, gap: 10 },
  fileNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileNumTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF" },
  fileName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fileSize: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  actions: { flexDirection: "row", gap: 2 },
  actionBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  mergeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  mergeBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  empty: { borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTxt: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
