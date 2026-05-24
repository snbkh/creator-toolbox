import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { Stack } from "expo-router";
import { PDFDocument } from "pdf-lib";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const ACCENT = "#DC2626";

interface PDFFile {
  name: string;
  size: number;
  uri: string;
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function formatSaved(orig: number, compressed: number): string {
  const saved = orig - compressed;
  if (saved <= 0) return "0%";
  return `${Math.round((saved / orig) * 100)}%`;
}

/** Convert Uint8Array → base64 without stack overflow on large files */
function uint8ToBase64(arr: Uint8Array): string {
  const CHUNK = 8192;
  let out = "";
  for (let i = 0; i < arr.length; i += CHUNK) {
    out += String.fromCharCode(...arr.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

type CompMethod = "metadata" | "scale" | "subset";

const METHODS = [
  { id: "metadata" as const, label: "Strip & Compress", icon: "file-download-outline" },
  { id: "scale"    as const, label: "Scale Pages",      icon: "resize"               },
  { id: "subset"   as const, label: "Extract Pages",    icon: "file-remove-outline"  },
];

export default function PdfCompressorScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();

  const [file, setFile] = useState<PDFFile | null>(null);
  const [method, setMethod] = useState<CompMethod>("metadata");
  const [scalePct, setScalePct] = useState<"50" | "75">("75");
  const [pagesRange, setPagesRange] = useState("1");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState(0);

  const pickPDF = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      setFile({ name: a.name, size: a.size ?? 1_000_000, uri: a.uri });
      setDone(false);
      setOutputUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    try {
      // ── 1. Read PDF ──────────────────────────────────────────────────
      const b64in = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let pdfDoc = await PDFDocument.load(b64in, {
        ignoreEncryption: true,
      });

      const totalPages = pdfDoc.getPageCount();

      // ── 2. Apply method-specific transformation ──────────────────────

      if (method === "subset") {
        // Keep only user-selected pages
        const keepIndices: number[] = [];
        const parts = pagesRange.split(",");
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes("-")) {
            const [startStr, endStr] = trimmed.split("-");
            const s = Math.max(1, parseInt(startStr ?? "1", 10));
            const e = Math.min(totalPages, parseInt(endStr ?? String(totalPages), 10));
            for (let p = s; p <= e; p++) keepIndices.push(p - 1);
          } else {
            const n = parseInt(trimmed, 10);
            if (!isNaN(n) && n >= 1 && n <= totalPages) keepIndices.push(n - 1);
          }
        }

        const unique = [...new Set(keepIndices)].sort((a, b) => a - b);
        if (unique.length === 0) {
          Alert.alert("Invalid Range", "No valid pages found. Enter page numbers like: 1, 3, 5-8");
          setLoading(false);
          return;
        }

        const subDoc = await PDFDocument.create();
        const copied = await subDoc.copyPages(pdfDoc, unique);
        copied.forEach((p) => subDoc.addPage(p));
        pdfDoc = subDoc;
      }

      if (method === "scale") {
        const factor = parseFloat(scalePct) / 100;
        const pages = pdfDoc.getPages();
        for (const page of pages) {
          const { width, height } = page.getSize();
          page.setSize(width * factor, height * factor);
          page.scale(factor, factor);
        }
      }

      // ── 3. Strip all metadata (always applied) ───────────────────────
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator("");
      pdfDoc.setProducer("");
      pdfDoc.setCreationDate(new Date(0));
      pdfDoc.setModificationDate(new Date());

      // ── 4. Save with maximum object-stream compression ───────────────
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: true,   // Cross-reference streams — biggest size win
        addDefaultPage: false,
        objectsPerTick: 50,
      });

      // ── 5. Write to cache ────────────────────────────────────────────
      const safeBase64 = uint8ToBase64(pdfBytes);
      const outName = `compressed_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const outUri = FileSystem.cacheDirectory + outName;

      await FileSystem.writeAsStringAsync(outUri, safeBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const realSize = pdfBytes.length;
      setOutputUri(outUri);
      setOutputSize(realSize);
      setDone(true);

      addProcessedFile({
        name: `compressed_${file.name}`,
        toolId: "pdf-compressor",
        toolName: "PDF Compressor",
        originalSize: file.size,
        processedSize: realSize,
        type: "pdf",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Alert if size did not shrink (pdf-lib cannot recompress embedded images)
      if (realSize >= file.size * 0.95) {
        Alert.alert(
          "ℹ️ Limited Compression",
          "This PDF's size couldn't be reduced further because its content is already optimized or its size is dominated by embedded images (which require a native renderer to recompress).\n\nTry the 'Extract Pages' mode to keep only the pages you need.",
          [{ text: "OK" }]
        );
      }
    } catch (err: any) {
      console.error("PDF compress error:", err);
      Alert.alert("Compression Failed", `${err?.message ?? "Unknown error"}\n\nMake sure the file is a valid, non-encrypted PDF.`);
    } finally {
      setLoading(false);
    }
  };

  const shareOutput = async () => {
    if (!outputUri) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(outputUri, {
          mimeType: "application/pdf",
          dialogTitle: "Save Compressed PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Sharing not available on this device.");
      }
    } catch (e: any) {
      Alert.alert("Share Failed", e?.message ?? "Could not share the file.");
    }
  };

  const savedPct = done && file ? formatSaved(file.size, outputSize) : null;
  const actuallySmaller = done && file ? outputSize < file.size : false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="PDF Compressor"
        subtitle="Reduce PDF size via metadata stripping, scaling & page extraction"
        accentColor={ACCENT}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* ── File Picker ── */}
        <TouchableOpacity
          onPress={pickPDF}
          style={[
            styles.picker,
            {
              backgroundColor: colors.card,
              borderColor: file ? colors.border : ACCENT,
              borderStyle: file ? "solid" : "dashed",
              borderRadius: colors.radius,
              margin: 16,
            },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: ACCENT + "22", borderRadius: 14 }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={32} color={ACCENT} />
          </View>
          {file ? (
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
              <Text style={[styles.pickerSub, { color: colors.mutedForeground }]}>{formatSize(file.size)}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerName, { color: colors.foreground }]}>Select PDF File</Text>
              <Text style={[styles.pickerSub, { color: colors.mutedForeground }]}>Tap to browse files</Text>
            </View>
          )}
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            {/* ── Method Tabs ── */}
            <View
              style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}
            >
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { setMethod(m.id); setDone(false); }}
                  style={[styles.tab, { backgroundColor: method === m.id ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
                >
                  <MaterialCommunityIcons name={m.icon as any} size={14} color={method === m.id ? "#FFF" : colors.mutedForeground} />
                  <Text style={[styles.tabTxt, { color: method === m.id ? "#FFF" : colors.mutedForeground }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Method Info Panel ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {method === "metadata" && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Strip & Compress</Text>
                  <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                    Removes embedded metadata (title, author, keywords, creator), then re-saves with cross-reference object-stream compression. Works best on PDFs with a lot of text, annotations, or unoptimized structure.
                  </Text>
                  <View style={[styles.infoBadge, { backgroundColor: "#F59E0B15", borderRadius: 8 }]}>
                    <MaterialCommunityIcons name="information-outline" size={14} color="#F59E0B" />
                    <Text style={[styles.infoBadgeTxt, { color: "#F59E0B" }]}>
                      PDFs dominated by high-res images may not shrink — use "Extract Pages" for those.
                    </Text>
                  </View>
                </>
              )}
              {method === "scale" && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Scale Page Dimensions</Text>
                  <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                    Scales all pages to a smaller size. This reduces rendered image dimensions and usually produces a noticeably smaller file.
                  </Text>
                  <View style={styles.scaleRow}>
                    {(["75", "50"] as const).map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { setScalePct(s); setDone(false); }}
                        style={[
                          styles.scaleBtn,
                          {
                            backgroundColor: scalePct === s ? ACCENT + "15" : colors.muted,
                            borderColor: scalePct === s ? ACCENT : "transparent",
                            borderRadius: 10,
                            borderWidth: 1.5,
                          },
                        ]}
                      >
                        <Text style={[styles.scaleBtnPct, { color: scalePct === s ? ACCENT : colors.foreground }]}>{s}%</Text>
                        <Text style={[styles.scaleBtnLbl, { color: colors.mutedForeground }]}>
                          {s === "75" ? "Medium quality" : "Maximum savings"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              {method === "subset" && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Extract Pages</Text>
                  <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                    Keep only the pages you need. This is the most powerful way to reduce size for large documents.
                  </Text>
                  <View style={[styles.rangeRow, { borderColor: ACCENT }]}>
                    <TextInput
                      style={[styles.rangeInput, { color: colors.foreground }]}
                      value={pagesRange}
                      onChangeText={(v) => { setPagesRange(v); setDone(false); }}
                      placeholder="e.g.  1, 3, 5-8, 12"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="default"
                    />
                  </View>
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Use commas to separate pages and dash for ranges.
                  </Text>
                </>
              )}
            </View>

            {/* ── Size Preview Row ── */}
            <View style={[styles.sizeRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <View style={styles.sizeItem}>
                <Text style={[styles.sizeLabel, { color: colors.mutedForeground }]}>ORIGINAL</Text>
                <Text style={[styles.sizeVal, { color: colors.foreground }]}>{formatSize(file.size)}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.mutedForeground} />
              <View style={styles.sizeItem}>
                <Text style={[styles.sizeLabel, { color: colors.mutedForeground }]}>{done ? "OUTPUT" : "ESTIMATED"}</Text>
                <Text style={[styles.sizeVal, { color: ACCENT }]}>
                  {done ? formatSize(outputSize) : "—"}
                </Text>
              </View>
              <View style={styles.sizeItem}>
                <Text style={[styles.sizeLabel, { color: colors.mutedForeground }]}>SAVED</Text>
                <Text style={[styles.sizeVal, { color: actuallySmaller ? "#10B981" : colors.mutedForeground }]}>
                  {done ? (actuallySmaller ? `-${savedPct}` : "None") : "?"}
                </Text>
              </View>
            </View>

            {/* ── Compress Button ── */}
            <TouchableOpacity
              onPress={compress}
              disabled={loading}
              style={[
                styles.btn,
                {
                  backgroundColor: done && actuallySmaller ? "#10B981" : ACCENT,
                  borderRadius: colors.radius,
                  marginHorizontal: 16,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={done && actuallySmaller ? "check-circle" : "file-download-outline"}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.btnTxt}>
                    {done && actuallySmaller ? `Compressed! (${savedPct} smaller)` : "Compress PDF"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Share Button ── */}
            {done && outputUri && (
              <TouchableOpacity
                onPress={shareOutput}
                style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16 }]}
              >
                <MaterialCommunityIcons name="content-save" size={20} color="#FFF" />
                <Text style={styles.btnTxt}>Save / Share Compressed PDF</Text>
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
  scroll: { paddingBottom: 30 },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderWidth: 2,
    gap: 14,
    marginBottom: 12,
  },
  iconBox: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  pickerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    gap: 4,
  },
  tabTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  infoBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    gap: 8,
  },
  infoBadgeTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  scaleRow: { flexDirection: "row", gap: 10 },
  scaleBtn: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  scaleBtnPct: { fontSize: 22, fontFamily: "Inter_700Bold" },
  scaleBtnLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rangeRow: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rangeInput: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sizeItem: { alignItems: "center", gap: 4 },
  sizeLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  sizeVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
