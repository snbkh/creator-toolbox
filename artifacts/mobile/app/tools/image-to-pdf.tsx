import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument } from "pdf-lib";
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

const ACCENT = "#7C3AED"; // Purple accent color for Image category

interface SelectedImage {
  id: string;
  uri: string;
  width: number;
  height: number;
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

export default function ImageToPdfScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addProcessedFile } = useApp();

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "fit">("fit");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState<"none" | "small" | "large">("small");

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [outputPdfUri, setOutputPdfUri] = useState<string | null>(null);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant photo library access to convert images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => ({
        id: Math.random().toString(36).substring(7),
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      }));
      setImages((prev) => [...prev, ...newImages]);
      setOutputPdfUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setOutputPdfUri(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const moveImageUp = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1]!;
      copy[index - 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1]!;
      copy[index + 1] = copy[index]!;
      copy[index] = temp;
      return copy;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setLoading(true);

    try {
      setLoadingStep("Processing images...");
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        setLoadingStep(`Embedding image ${i + 1} of ${images.length}...`);

        const imgBase64 = await FileSystem.readAsStringAsync(img.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to bytes
        const binaryStr = atob(imgBase64);
        const len = binaryStr.length;
        const imgBytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          imgBytes[j] = binaryStr.charCodeAt(j);
        }

        let pdfImg;
        if (img.uri.toLowerCase().endsWith(".png")) {
          pdfImg = await pdfDoc.embedPng(imgBytes);
        } else {
          pdfImg = await pdfDoc.embedJpg(imgBytes);
        }

        let pageW = img.width;
        let pageH = img.height;

        if (pageSize === "a4") {
          pageW = orientation === "portrait" ? 595.28 : 841.89;
          pageH = orientation === "portrait" ? 841.89 : 595.28;
        } else if (pageSize === "letter") {
          pageW = orientation === "portrait" ? 612 : 792;
          pageH = orientation === "portrait" ? 792 : 612;
        }

        const page = pdfDoc.addPage([pageW, pageH]);

        let marginSize = 0;
        if (margin === "small") marginSize = 20;
        else if (margin === "large") marginSize = 40;

        const availableW = pageW - marginSize * 2;
        const availableH = pageH - marginSize * 2;

        const imgDims = pdfImg.scaleToFit(availableW, availableH);

        const x = marginSize + (availableW - imgDims.width) / 2;
        const y = marginSize + (availableH - imgDims.height) / 2;

        page.drawImage(pdfImg, {
          x,
          y,
          width: imgDims.width,
          height: imgDims.height,
        });
      }

      setLoadingStep("Compiling PDF binary...");
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const base64Output = base64ByteArray(pdfBytes);

      const outUri = FileSystem.cacheDirectory + `images_to_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(outUri, base64Output, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setOutputPdfUri(outUri);

      addProcessedFile({
        name: `images_to_${Date.now()}.pdf`,
        toolId: "image-to-pdf",
        toolName: "Image to PDF",
        originalSize: images.length * 450 * 1024,
        processedSize: pdfBytes.length,
        type: "pdf",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      Alert.alert("Conversion Failed", "An error occurred during conversion.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!outputPdfUri) return;
    const res = await shareFile(outputPdfUri, `converted_${Date.now()}.pdf`, "application/pdf");
    if (res === "shared") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Image to PDF"
        subtitle="Convert your photos into PDF documents"
        accentColor={ACCENT}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Layout Options Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>CONVERSION SETTINGS</Text>

          {/* Page Size */}
          <View style={styles.optionRow}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Page Size</Text>
            <View style={styles.optionSegment}>
              {([
                { id: "fit", label: "Fit Image" },
                { id: "a4", label: "A4" },
                { id: "letter", label: "Letter" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setPageSize(opt.id)}
                  style={[styles.segBtn, pageSize === opt.id && { backgroundColor: ACCENT }, { borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.segBtnText, { color: pageSize === opt.id ? "#FFF" : colors.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Orientation */}
          <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Orientation</Text>
            <View style={styles.optionSegment}>
              {([
                { id: "portrait", label: "Portrait" },
                { id: "landscape", label: "Landscape" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setOrientation(opt.id)}
                  style={[styles.segBtn, orientation === opt.id && { backgroundColor: ACCENT }, { borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.segBtnText, { color: orientation === opt.id ? "#FFF" : colors.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Margins */}
          <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Margins</Text>
            <View style={styles.optionSegment}>
              {([
                { id: "none", label: "None" },
                { id: "small", label: "Small" },
                { id: "large", label: "Large" },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setMargin(opt.id)}
                  style={[styles.segBtn, margin === opt.id && { backgroundColor: ACCENT }, { borderRadius: colors.radius - 4 }]}
                >
                  <Text style={[styles.segBtnText, { color: margin === opt.id ? "#FFF" : colors.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {images.length === 0 ? (
          <TouchableOpacity
            onPress={pickImages}
            style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius }]}
          >
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "15", borderRadius: 16 }]}>
              <MaterialCommunityIcons name="file-image-outline" size={36} color={ACCENT} />
            </View>
            <Text style={[styles.dropTitle, { color: colors.foreground }]}>Select Images</Text>
            <Text style={[styles.dropDesc, { color: colors.mutedForeground }]}>
              Select one or multiple photos to merge into a single PDF
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Selected Files Header */}
            <View style={styles.listHeader}>
              <Text style={[styles.listCount, { color: colors.foreground }]}>
                Selected Images ({images.length})
              </Text>
              <TouchableOpacity onPress={pickImages} style={styles.addMoreBtn}>
                <Ionicons name="add-circle-outline" size={18} color={ACCENT} />
                <Text style={[styles.addMoreText, { color: ACCENT }]}>Add More</Text>
              </TouchableOpacity>
            </View>

            {/* List of images */}
            <View style={{ gap: 10 }}>
              {images.map((img, idx) => (
                <View
                  key={img.id}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                >
                  <Image source={{ uri: img.uri }} style={styles.thumbnail} contentFit="cover" />
                  
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                      Page {idx + 1} - Image_{img.id}.jpg
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                      {img.width} x {img.height} px
                    </Text>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => moveImageUp(idx)} disabled={idx === 0} style={styles.arrowBtn}>
                      <Ionicons name="arrow-up" size={16} color={idx === 0 ? colors.muted : colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveImageDown(idx)} disabled={idx === images.length - 1} style={styles.arrowBtn}>
                      <Ionicons name="arrow-down" size={16} color={idx === images.length - 1 ? colors.muted : colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeImage(img.id)} style={styles.removeBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Convert / Save Button Container */}
            <View style={{ gap: 10, marginTop: 12 }}>
              {!outputPdfUri ? (
                <TouchableOpacity
                  onPress={convertToPdf}
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
                      <Ionicons name="cog-outline" size={20} color="#FFF" />
                      <Text style={styles.btnTxt}>Convert to PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius }]}
                  >
                    <Ionicons name="download-outline" size={20} color="#FFF" />
                    <Text style={styles.btnTxt}>Save / Download PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setImages([]);
                      setOutputPdfUri(null);
                    }}
                    style={[styles.btnSec, { borderColor: colors.border, borderRadius: colors.radius }]}
                  >
                    <Ionicons name="refresh-outline" size={20} color={colors.foreground} />
                    <Text style={[styles.btnSecTxt, { color: colors.foreground }]}>Clear and Reset</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
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
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listCount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  addMoreBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addMoreText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  itemCard: { flexDirection: "row", padding: 10, borderWidth: 1, alignItems: "center", gap: 10 },
  thumbnail: { width: 44, height: 44, borderRadius: 6 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  itemMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  arrowBtn: { padding: 4 },
  removeBtn: { padding: 4 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  btnSec: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderWidth: 1, gap: 8 },
  btnSecTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
