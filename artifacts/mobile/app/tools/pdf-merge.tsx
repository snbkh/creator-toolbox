import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument } from "pdf-lib";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { shareFile } from "@/utils/saveToDevice";

const ACCENT = "#DC2626";
interface PDFFile { id: string; name: string; size: number; uri: string; }
function fmtSize(b: number): string { return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`; }
function genId(): string { return Date.now().toString() + Math.random().toString(36).slice(2, 7); }

function base64ByteArray(byteArray: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0xffff;
  for (let i = 0; i < byteArray.length; i += chunkSize) {
    const chunk = byteArray.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk as any));
  }
  return btoa(chunks.join(""));
}

type MergeMethod = "sequential" | "alternate";

export default function PdfMergeScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [method, setMethod] = useState<MergeMethod>("sequential");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [mergedFileUri, setMergedFileUri] = useState<string | null>(null);
  const [mergedSize, setMergedSize] = useState<number>(0);

  const addFiles = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", multiple: true });
    if (!r.canceled) {
      const newFiles = r.assets.map((a) => ({ id: genId(), name: a.name, size: a.size ?? 500 * 1024, uri: a.uri }));
      setFiles((prev) => [...prev, ...newFiles]);
      setDone(false);
      setMergedFileUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const remove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDone(false);
    setMergedFileUri(null);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setFiles((prev) => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx]!, n[idx - 1]!]; return n; });
    setDone(false);
    setMergedFileUri(null);
  };

  const moveDown = (idx: number) => {
    if (idx === files.length - 1) return;
    setFiles((prev) => { const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1]!, n[idx]!]; return n; });
    setDone(false);
    setMergedFileUri(null);
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  const merge = async () => {
    if (files.length < 2) { Alert.alert("Add More Files", "Please add at least 2 PDF files to merge."); return; }
    setLoading(true);
    try {
      const mergedDoc = await PDFDocument.create();
      
      const loadedDocs: PDFDocument[] = [];
      const docPageIndices: number[][] = [];
      let maxPages = 0;

      for (const f of files) {
        const base64Input = await FileSystem.readAsStringAsync(f.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const doc = await PDFDocument.load(base64Input);
        loadedDocs.push(doc);
        const indices = doc.getPageIndices();
        docPageIndices.push(indices);
        if (indices.length > maxPages) {
          maxPages = indices.length;
        }
      }

      if (method === "sequential") {
        for (let i = 0; i < loadedDocs.length; i++) {
          const doc = loadedDocs[i]!;
          const copiedPages = await mergedDoc.copyPages(doc, docPageIndices[i]!);
          copiedPages.forEach((page) => mergedDoc.addPage(page));
        }
      } else {
        // Alternating weave page-by-page
        for (let pIdx = 0; pIdx < maxPages; pIdx++) {
          for (let dIdx = 0; dIdx < loadedDocs.length; dIdx++) {
            const doc = loadedDocs[dIdx]!;
            const indices = docPageIndices[dIdx]!;
            if (pIdx < indices.length) {
              const copiedPages = await mergedDoc.copyPages(doc, [pIdx]);
              if (copiedPages[0]) {
                mergedDoc.addPage(copiedPages[0]);
              }
            }
          }
        }
      }
      
      const pdfBytes = await mergedDoc.save({ useObjectStreams: true });
      const base64Output = base64ByteArray(pdfBytes);
      
      const outUri = FileSystem.cacheDirectory + `merged_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(outUri, base64Output, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setMergedFileUri(outUri);
      setMergedSize(pdfBytes.length);
      setDone(true);
      
      addProcessedFile({
        name: `merged_${files.length}_files.pdf`,
        toolId: "pdf-merge",
        toolName: "PDF Merge",
        originalSize: totalSize,
        processedSize: pdfBytes.length,
        type: "pdf"
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("PDF merge error:", err);
      Alert.alert("Merge Failed", "Could not merge the PDFs offline. Make sure they are valid documents.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Merge" subtitle="Combine multiple PDFs into one" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity onPress={addFiles} style={[styles.addBtn, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}>
          <MaterialCommunityIcons name="file-plus-outline" size={28} color={ACCENT} />
          <Text style={[styles.addBtnTxt, { color: ACCENT }]}>Add PDF Files</Text>
        </TouchableOpacity>

        {files.length > 0 && (
          <>
            {/* Method bar selection */}
            <View style={[styles.methodBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginBottom: 12 }]}>
              {([
                { id: "sequential", label: "Sequential Merge" },
                { id: "alternate", label: "Alternating Weave" },
              ] as const).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { setMethod(m.id); setDone(false); }}
                  style={[styles.methodBtn, { backgroundColor: method === m.id ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.methodBtnTxt, { color: method === m.id ? "#FFF" : colors.mutedForeground }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.listHeader, { paddingHorizontal: 16 }]}>
              <Text style={[styles.listHeaderTxt, { color: colors.mutedForeground }]}>{files.length} FILE{files.length > 1 ? "S" : ""} · {fmtSize(totalSize)} TOTAL</Text>
              <TouchableOpacity onPress={() => { setFiles([]); setDone(false); setMergedFileUri(null); }}>
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

            <TouchableOpacity onPress={merge} disabled={loading || files.length < 2} style={[styles.mergeBtn, { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16, opacity: files.length < 2 ? 0.5 : 1 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "merge"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.mergeBtnTxt, { color: done ? "#10B981" : "#FFF" }]}>{done ? "Merge Finished" : `Merge ${files.length} PDFs`}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && mergedFileUri && (
              <TouchableOpacity
                onPress={() => shareFile(mergedFileUri, `merged_${files.length}_files.pdf`, "application/pdf")}
                style={[styles.mergeBtn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 4 }]}
              >
                <MaterialCommunityIcons name="content-save" size={20} color="#FFF" />
                <Text style={styles.mergeBtnTxt}>Save / Download PDF</Text>
              </TouchableOpacity>
            )}
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
  scrollContainer: { paddingBottom: 30 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 20, borderWidth: 2, borderStyle: "dashed", gap: 10, marginBottom: 4 },
  addBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  methodBar: { flexDirection: "row", borderWidth: 1, padding: 4, gap: 4 },
  methodBtn: { flex: 1, paddingVertical: 9, alignItems: "center" },
  methodBtnTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
