import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { shareFile } from "@/utils/saveToDevice";

const ACCENT = "#DC2626"; // Red accent for PDF category

interface DocFile {
  name: string;
  size: number;
  uri: string;
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
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

export default function DocToPdfScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [docFile, setDocFile] = useState<DocFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [done, setDone] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  const pickDocument = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/html", "text/markdown", "application/json"],
      });
      if (!r.canceled && r.assets[0]) {
        const a = r.assets[0];
        setDocFile({
          name: a.name,
          size: a.size ?? 1024,
          uri: a.uri,
        });
        setDone(false);
        setPdfUri(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Picker Error", "Could not pick document file.");
    }
  };

  const convertDocToPdf = async () => {
    if (!docFile) return;
    setLoading(true);
    try {
      setLoadingStep("Reading text content...");
      const text = await FileSystem.readAsStringAsync(docFile.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await new Promise((r) => setTimeout(r, 600));

      setLoadingStep("Initializing PDF Canvas...");
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.276, 841.89]); // A4 Dimensions
      const { width, height } = page.getSize();
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 11;
      const margin = 50;
      const maxLineWidth = width - margin * 2;
      const lineHeight = fontSize * 1.4;

      setLoadingStep("Formatting & wrapping layout...");
      await new Promise((r) => setTimeout(r, 600));

      // Draw document title header
      page.drawText(docFile.name, {
        x: margin,
        y: height - margin,
        size: 16,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      let currentY = height - margin - 40;

      // Wrap text
      const paragraphs = text.split(/\r?\n/);
      for (const para of paragraphs) {
        if (para.trim() === "") {
          currentY -= lineHeight;
          continue;
        }
        
        const words = para.split(" ");
        let currentLine = "";
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testLineWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (testLineWidth > maxLineWidth) {
            if (currentY < margin + lineHeight) {
              page = pdfDoc.addPage([595.276, 841.89]);
              currentY = height - margin;
            }
            page.drawText(currentLine, {
              x: margin,
              y: currentY,
              size: fontSize,
              font: font,
              color: rgb(0.15, 0.15, 0.15),
            });
            currentY -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          if (currentY < margin + lineHeight) {
            page = pdfDoc.addPage([595.276, 841.89]);
            currentY = height - margin;
          }
          page.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: fontSize,
            font: font,
            color: rgb(0.15, 0.15, 0.15),
          });
          currentY -= lineHeight;
        }
        
        currentY -= 6; // Paragraph spacing
      }

      setLoadingStep("Compiling PDF bytes...");
      const pdfBytes = await pdfDoc.save();
      const base64Out = base64ByteArray(pdfBytes);

      const outName = docFile.name.replace(/\.[^/.]+$/, "") + ".pdf";
      const outUri = FileSystem.cacheDirectory + outName;
      await FileSystem.writeAsStringAsync(outUri, base64Out, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setPdfUri(outUri);
      setDone(true);

      addProcessedFile({
        name: outName,
        toolId: "doc-to-pdf",
        toolName: "Document to PDF",
        originalSize: docFile.size,
        processedSize: pdfBytes.length,
        type: "pdf",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      Alert.alert("Conversion Failed", "Failed to compile document to PDF offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Document to PDF"
        subtitle="Convert text, HTML, or markdown files into PDF documents"
        accentColor={ACCENT}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {!docFile ? (
          <TouchableOpacity
            onPress={pickDocument}
            style={[
              styles.dropzone,
              { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 },
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "22", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="file-document-outline" size={40} color={ACCENT} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Select Document</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>TXT, HTML, MD, JSON supported</Text>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.pickerRow,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 },
            ]}
          >
            <View style={[styles.fileIcon, { backgroundColor: ACCENT + "22" }]}>
              <MaterialCommunityIcons name="file-document-outline" size={32} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]} numberOfLines={1}>
                {docFile.name}
              </Text>
              <Text style={[styles.pickerDesc, { color: colors.mutedForeground }]}>
                {formatSize(docFile.size)}
              </Text>
            </View>
            <TouchableOpacity onPress={pickDocument}>
              <MaterialCommunityIcons name="refresh" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {docFile && (
          <>
            <TouchableOpacity
              onPress={convertDocToPdf}
              disabled={loading}
              style={[
                styles.btn,
                { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16 },
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={styles.btnTxt}>{loadingStep}</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "cog-outline"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.btnTxt, { color: done ? "#10B981" : "#FFF" }]}>
                    {done ? "PDF Conversion Finished" : "Convert to PDF"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {done && pdfUri && (
              <TouchableOpacity
                onPress={() => shareFile(pdfUri, docFile.name.replace(/\.[^/.]+$/, "") + ".pdf", "application/pdf")}
                style={[
                  styles.btn,
                  { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 4 },
                ]}
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
  dropzone: { alignItems: "center", padding: 48, borderWidth: 2, borderStyle: "dashed", gap: 12, marginBottom: 16 },
  iconBox: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pickerRow: { flexDirection: "row", alignItems: "center", padding: 16, borderWidth: 1, gap: 12 },
  fileIcon: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pickerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
