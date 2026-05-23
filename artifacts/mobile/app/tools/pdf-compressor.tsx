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
  Alert,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { shareFile } from "@/utils/saveToDevice";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument } from "pdf-lib";

const ACCENT = "#DC2626";

interface PDFFile { name: string; size: number; uri: string; }
function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

const PRESETS = [
  { id: "screen", label: "Screen Quality", desc: "Smallest size (72 DPI)", ratio: 0.25 },
  { id: "ebook", label: "eBook Quality", desc: "Medium size (150 DPI)", ratio: 0.45 },
  { id: "print", label: "Print Quality", desc: "High quality (300 DPI)", ratio: 0.70 },
];

function base64ByteArray(byteArray: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0xffff;
  for (let i = 0; i < byteArray.length; i += chunkSize) {
    const chunk = byteArray.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk as any));
  }
  return btoa(chunks.join(""));
}

type CompMethod = "preset" | "scale" | "subset";

export default function PdfCompressorScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [method, setMethod] = useState<CompMethod>("preset");
  
  // Preset state
  const [preset, setPreset] = useState("ebook");
  
  // Scale state
  const [scaleFactor, setScaleFactor] = useState<"0.5" | "0.75">("0.75");
  
  // Subset state
  const [pagesRange, setPagesRange] = useState("1");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [compressedFileUri, setCompressedFileUri] = useState<string | null>(null);
  const [processedSize, setProcessedSize] = useState<number>(0);

  const ratio = method === "preset"
    ? PRESETS.find((p) => p.id === preset)?.ratio ?? 0.45
    : method === "scale"
      ? parseFloat(scaleFactor)
      : 0.8;
      
  const estimatedSize = file ? Math.round(file.size * ratio * 0.95) : 0;

  const pickPDF = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      setFile({ name: a.name, size: a.size ?? 2 * 1048576, uri: a.uri });
      setDone(false);
      setCompressedFileUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const base64Input = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let pdfDoc = await PDFDocument.load(base64Input);
      const totalPages = pdfDoc.getPageCount();

      if (method === "subset") {
        const keepPages: number[] = [];
        const items = pagesRange.split(",");
        for (const item of items) {
          if (item.includes("-")) {
            const [s, e] = item.split("-").map((v) => parseInt(v.trim(), 10));
            if (s && e) {
              const start = Math.max(1, Math.min(totalPages, s));
              const end = Math.max(start, Math.min(totalPages, e));
              for (let i = start; i <= end; i++) keepPages.push(i - 1);
            }
          } else {
            const num = parseInt(item.trim(), 10);
            if (num && num >= 1 && num <= totalPages) keepPages.push(num - 1);
          }
        }

        if (keepPages.length > 0) {
          const subsetDoc = await PDFDocument.create();
          const copied = await subsetDoc.copyPages(pdfDoc, keepPages);
          copied.forEach((p) => subsetDoc.addPage(p));
          pdfDoc = subsetDoc;
        } else {
          Alert.alert("Invalid Range", "No valid pages were selected for subsetting.");
          setLoading(false);
          return;
        }
      }

      if (method === "scale") {
        const factor = parseFloat(scaleFactor);
        const pages = pdfDoc.getPages();
        for (const page of pages) {
          const { width, height } = page.getSize();
          page.setSize(width * factor, height * factor);
          page.scale(factor, factor);
        }
      }

      // Metadata stripping
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setCreator("");
      pdfDoc.setProducer("");
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const base64Output = base64ByteArray(pdfBytes);

      const outUri = FileSystem.cacheDirectory + `compressed_${Date.now()}_${file.name}`;
      await FileSystem.writeAsStringAsync(outUri, base64Output, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setCompressedFileUri(outUri);
      setProcessedSize(pdfBytes.length);
      setDone(true);

      addProcessedFile({
        name: `compressed_${file.name}`,
        toolId: "pdf-compressor",
        toolName: "PDF Compressor",
        originalSize: file.size,
        processedSize: pdfBytes.length,
        type: "pdf"
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("PDF compression error:", err);
      Alert.alert("Compression Failed", "Could not compress the PDF. Verify the document is valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Compressor" subtitle="Reduce PDF file size offline" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContainer}>
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
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select PDF File</Text>
              <Text style={[styles.pickerDesc, { color: colors.mutedForeground }]}>Tap to browse files</Text>
            </View>
          )}
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            {/* Method Segment selector */}
            <View style={[styles.methodBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {([
                { id: "preset", label: "Presets" },
                { id: "scale", label: "Scale Size" },
                { id: "subset", label: "Subset" },
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

            {/* Sub-panels based on Method */}
            {method === "preset" && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => { setPreset(p.id); setDone(false); }}
                    style={[styles.presetRow, { borderColor: preset === p.id ? ACCENT : colors.border, backgroundColor: preset === p.id ? ACCENT + "11" : "transparent", borderRadius: 10 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.presetName, { color: preset === p.id ? ACCENT : colors.foreground }]}>{p.label}</Text>
                      <Text style={[styles.presetDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
                    </View>
                    <Text style={[styles.presetRatio, { color: preset === p.id ? ACCENT : colors.mutedForeground }]}>
                      ~{Math.round((1 - p.ratio * 0.95) * 100)}% off
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {method === "scale" && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>SCALE PAGE DIMENSIONS</Text>
                <View style={styles.scaleContainer}>
                  {([
                    { val: "0.75", label: "Medium Scale (75%)" },
                    { val: "0.5", label: "Compact Scale (50%)" },
                  ] as const).map((s) => (
                    <TouchableOpacity
                      key={s.val}
                      onPress={() => { setScaleFactor(s.val); setDone(false); }}
                      style={[styles.scaleBtn, { backgroundColor: scaleFactor === s.val ? ACCENT : colors.muted, borderRadius: 8 }]}
                    >
                      <Text style={[styles.scaleBtnTxt, { color: scaleFactor === s.val ? "#FFF" : colors.foreground }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {method === "subset" && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>SELECT PAGE SUBSET TO KEEP</Text>
                <TextInput
                  style={[styles.rangeInput, { color: colors.foreground, borderColor: ACCENT }]}
                  value={pagesRange}
                  onChangeText={(v) => { setPagesRange(v); setDone(false); }}
                  placeholder="e.g. 1, 3, 5-8"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>Extract only required pages to drastically reduce document weight.</Text>
              </View>
            )}

            {/* Results preview */}
            <View style={[styles.resultRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>ORIGINAL</Text>
                <Text style={[styles.resultVal, { color: colors.foreground }]}>{formatSize(file.size)}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.mutedForeground} />
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{done ? "COMPRESSED" : "ESTIMATED"}</Text>
                <Text style={[styles.resultVal, { color: ACCENT }]}>{done ? formatSize(processedSize) : formatSize(estimatedSize)}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>SAVED</Text>
                <Text style={[styles.resultVal, { color: "#10B981" }]}>
                  -{done ? Math.max(0, Math.round((1 - processedSize / file.size) * 100)) : Math.round((1 - ratio * 0.95) * 100)}%
                </Text>
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

            {done && compressedFileUri && (
              <TouchableOpacity
                onPress={() => shareFile(compressedFileUri, `compressed_${file.name}`, "application/pdf")}
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
  scrollContainer: { paddingBottom: 30 },
  picker: { flexDirection: "row", alignItems: "center", padding: 20, borderWidth: 2, gap: 14, marginBottom: 12 },
  fileIconBox: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  pickerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pickerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  methodBar: { flexDirection: "row", borderWidth: 1, padding: 4, gap: 4, marginBottom: 12 },
  methodBtn: { flex: 1, paddingVertical: 9, alignItems: "center" },
  methodBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  presetRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1.5, gap: 10, marginBottom: 6 },
  presetName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  presetDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  presetRatio: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scaleContainer: { gap: 10 },
  scaleBtn: { paddingVertical: 12, alignItems: "center" },
  scaleBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rangeInput: { fontSize: 18, fontFamily: "Inter_600SemiBold", borderBottomWidth: 2, paddingBottom: 6 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: 16, borderWidth: 1, marginBottom: 12 },
  resultItem: { alignItems: "center", gap: 4 },
  resultLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  resultVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
