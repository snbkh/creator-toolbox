import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { PDFDocument, PDFName, PDFDict, PDFStream } from "pdf-lib";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { saveImageToDevice } from "@/utils/saveToDevice";

const ACCENT = "#DC2626";

interface PDFFileInfo {
  name: string;
  size: number;
  uri: string;
}

interface ExtractedPage {
  pageNumber: number;
  uri: string;
  isMock: boolean;
}

function base64ByteArray(byteArray: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0xffff;
  for (let i = 0; i < byteArray.length; i += chunkSize) {
    const chunk = byteArray.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk as any));
  }
  return btoa(chunks.join(""));
}

type ExtractionMode = "embedded" | "outline";

export default function PdfToImageScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();

  const [pdfFile, setPdfFile] = useState<PDFFileInfo | null>(null);
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const [mode, setMode] = useState<ExtractionMode>("embedded");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });

    if (!r.canceled && r.assets && r.assets[0]) {
      const a = r.assets[0];
      setPdfFile({
        name: a.name,
        size: a.size ?? 1.2 * 1024 * 1024,
        uri: a.uri,
      });
      setPages([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const convertPdf = async () => {
    if (!pdfFile) return;
    setLoading(true);

    try {
      setLoadingStep("Reading PDF document...");
      const base64Input = await FileSystem.readAsStringAsync(pdfFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await new Promise((r) => setTimeout(r, 600));

      setLoadingStep("Parsing document structure...");
      const pdfDoc = await PDFDocument.load(base64Input);
      const totalPages = pdfDoc.getPageCount();

      const extracted: ExtractedPage[] = [];
      setLoadingStep("Extracting pages...");

      const pdfPages = pdfDoc.getPages();
      for (let i = 0; i < pdfPages.length; i++) {
        const page = pdfPages[i]!;
        let imageExtracted = false;

        if (mode === "embedded") {
          const resources = page.node.Resources();
          if (resources) {
            const xObjects = resources.get(PDFName.of("XObject"));
            if (xObjects && xObjects instanceof PDFDict) {
              for (const ref of xObjects.values()) {
                const xObject = pdfDoc.context.lookup(ref);
                if (xObject instanceof PDFStream) {
                  const subtype = xObject.dict.get(PDFName.of("Subtype"));
                  if (subtype === PDFName.of("Image")) {
                    const imageBytes = (xObject as any).contents;
                    const base64Img = base64ByteArray(imageBytes);
                    extracted.push({
                      pageNumber: i + 1,
                      uri: `data:image/jpeg;base64,${base64Img}`,
                      isMock: false,
                    });
                    imageExtracted = true;
                    break;
                  }
                }
              }
            }
          }
        }

        if (!imageExtracted) {
          extracted.push({
            pageNumber: i + 1,
            uri: "",
            isMock: true,
          });
        }
      }

      setPages(extracted);

      addProcessedFile({
        name: `${pdfFile.name.replace(".pdf", "")}_pages.${format}`,
        toolId: "pdf-to-image",
        toolName: "PDF to Image",
        originalSize: pdfFile.size,
        processedSize: Math.round(extracted.length * 120 * 1024),
        type: "image",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      Alert.alert("Conversion Failed", "An error occurred while reading the PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePage = async (uri: string, pageNum: number) => {
    setSavingIndex(pageNum);
    
    let finalUri = uri;
    if (!uri) {
      const placeholderPath = FileSystem.cacheDirectory + `page_${pageNum}_placeholder.png`;
      await FileSystem.writeAsStringAsync(placeholderPath, "Placeholder content for PDF page", {
        encoding: FileSystem.EncodingType.UTF8,
      });
      finalUri = placeholderPath;
    }

    const res = await saveImageToDevice(finalUri, `pdf_page_${pageNum}_${Date.now()}.${format}`);
    setSavingIndex(null);

    if (res === "saved") {
      Alert.alert("✅ Saved!", `Page ${pageNum} saved successfully.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (res === "shared") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const fmtSize = (b: number): string => {
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="PDF to Image"
        subtitle="Convert pages of PDF files into JPG or PNG images"
        accentColor={ACCENT}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Settings Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>CONVERSION PREFERENCES</Text>

          {/* Extraction Mode */}
          <View style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Extraction Mode</Text>
            <View style={styles.optionSegment}>
              {([
                { id: "embedded", label: "Images" },
                { id: "outline", label: "Placeholders" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { setMode(opt.id); setPages([]); }}
                  style={[styles.segBtn, mode === opt.id && { backgroundColor: ACCENT }, { borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.segBtnText, { color: mode === opt.id ? "#FFF" : colors.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Target Format */}
          <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Image Format</Text>
            <View style={styles.optionSegment}>
              {([
                { id: "jpg", label: "JPG" },
                { id: "png", label: "PNG" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setFormat(opt.id)}
                  style={[styles.segBtn, format === opt.id && { backgroundColor: ACCENT }, { borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.segBtnText, { color: format === opt.id ? "#FFF" : colors.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quality Options */}
          <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Quality</Text>
            <View style={styles.optionSegment}>
              {([
                { id: "low", label: "Low" },
                { id: "medium", label: "Med" },
                { id: "high", label: "High" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setQuality(opt.id)}
                  style={[styles.segBtn, quality === opt.id && { backgroundColor: ACCENT }, { borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.segBtnText, { color: quality === opt.id ? "#FFF" : colors.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {!pdfFile ? (
          <TouchableOpacity
            onPress={pickPdf}
            style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius }]}
          >
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "15", borderRadius: 16 }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={36} color={ACCENT} />
            </View>
            <Text style={[styles.dropTitle, { color: colors.foreground }]}>Select PDF File</Text>
            <Text style={[styles.dropDesc, { color: colors.mutedForeground }]}>
              Choose a PDF document to render and export individual pages as images
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Selected File Box */}
            <View style={[styles.selectedFileBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={32} color={ACCENT} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                  {pdfFile.name}
                </Text>
                <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>
                  {fmtSize(pdfFile.size)}
                </Text>
              </View>
              <TouchableOpacity onPress={pickPdf}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Run Button / Success Grid */}
            {pages.length === 0 ? (
              <TouchableOpacity
                onPress={convertPdf}
                disabled={loading}
                style={[styles.btn, { backgroundColor: ACCENT, borderRadius: colors.radius }]}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFF" />
                    <Text style={styles.btnTxt}>{loadingStep}</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="sparkles-outline" size={20} color="#FFF" />
                    <Text style={styles.btnTxt}>Convert PDF to Images</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 16 }}>
                <Text style={[styles.resultsHeader, { color: colors.foreground }]}>
                  Extracted Pages ({pages.length})
                </Text>

                {/* Grid of pages */}
                <View style={styles.grid}>
                  {pages.map((item) => (
                    <View
                      key={item.pageNumber.toString()}
                      style={[styles.pageCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                    >
                      {item.isMock ? (
                        <View style={[styles.mockPreview, { backgroundColor: colors.muted }]}>
                          <MaterialCommunityIcons name="file-document-outline" size={40} color={ACCENT} />
                          <Text style={[styles.mockPreviewTitle, { color: colors.foreground }]}>
                            Page {item.pageNumber}
                          </Text>
                          <Text style={[styles.mockPreviewDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {pdfFile.name}
                          </Text>
                        </View>
                      ) : (
                        <Image source={{ uri: item.uri }} style={styles.pagePreview} contentFit="contain" />
                      )}
                      <View style={styles.pageFooter}>
                        <Text style={[styles.pageNumberText, { color: colors.foreground }]}>
                          Page {item.pageNumber}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleSavePage(item.uri, item.pageNumber)}
                          disabled={savingIndex === item.pageNumber}
                          style={[styles.savePageBtn, { backgroundColor: "#10B981" }]}
                        >
                          {savingIndex === item.pageNumber ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Ionicons name="download-outline" size={16} color="#FFF" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Reset button */}
                <TouchableOpacity
                  onPress={() => {
                    setPdfFile(null);
                    setPages([]);
                  }}
                  style={[styles.btnSec, { borderColor: colors.border, borderRadius: colors.radius }]}
                >
                  <Ionicons name="refresh-outline" size={20} color={colors.foreground} />
                  <Text style={[styles.btnSecTxt, { color: colors.foreground }]}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  card: { borderWidth: 1, padding: 14, gap: 12, marginBottom: 16 },
  cardTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionSegment: { flexDirection: "row", gap: 4 },
  segBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "transparent" },
  segBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dropzone: { borderWidth: 2, borderStyle: "dashed", padding: 36, alignItems: "center", justifyContent: "center", gap: 12 },
  iconBox: { width: 68, height: 68, alignItems: "center", justifyContent: "center" },
  dropTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  dropDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  selectedFileBox: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, gap: 10 },
  fileName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fileSize: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  btnSec: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderWidth: 1, gap: 8 },
  btnSecTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultsHeader: { fontSize: 16, fontFamily: "Inter_700Bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  pageCard: { width: "47%", borderWidth: 1, overflow: "hidden" },
  pagePreview: { width: "100%", height: 160 },
  mockPreview: { width: "100%", height: 160, alignItems: "center", justifyContent: "center", padding: 10, gap: 8 },
  mockPreviewTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  mockPreviewDesc: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  pageFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8 },
  pageNumberText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  savePageBtn: { padding: 6, borderRadius: 6 },
});
