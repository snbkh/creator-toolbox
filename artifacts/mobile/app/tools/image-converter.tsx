import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
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
import { saveImageToDevice } from "@/utils/saveToDevice";

const ACCENT = "#06B6D4";

type Format = "JPG" | "PNG" | "WEBP" | "BMP" | "TIFF";

const FORMATS: { id: Format; desc: string; lossy: boolean; typical: string }[] = [
  { id: "JPG", desc: "Best for photos, smallest size", lossy: true, typical: "50-200 KB" },
  { id: "PNG", desc: "Lossless, supports transparency", lossy: false, typical: "200-800 KB" },
  { id: "WEBP", desc: "Modern format, great compression", lossy: true, typical: "30-150 KB" },
  { id: "BMP", desc: "Uncompressed bitmap, large file", lossy: false, typical: "1-10 MB" },
  { id: "TIFF", desc: "High quality, used in print", lossy: false, typical: "5-20 MB" },
];

interface ImageInfo { uri: string; width: number; height: number; fileSize: number; }

export default function ImageConverterScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [toFormat, setToFormat] = useState<Format>("WEBP");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [convertedUri, setConvertedUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Please allow photo library access."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      setImage({ uri: a.uri, width: a.width, height: a.height, fileSize: a.fileSize ?? 400 * 1024 });
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const convert = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const formatMap: Record<string, ImageManipulator.SaveFormat> = {
        JPG: ImageManipulator.SaveFormat.JPEG,
        PNG: ImageManipulator.SaveFormat.PNG,
        WEBP: ImageManipulator.SaveFormat.WEBP,
        BMP: ImageManipulator.SaveFormat.JPEG, // fallback
        TIFF: ImageManipulator.SaveFormat.JPEG, // fallback
      };
      const quality = { JPG: 0.85, PNG: 1, WEBP: 0.8, BMP: 1, TIFF: 1 }[toFormat] ?? 0.9;
      const result = await ImageManipulator.manipulateAsync(
        image.uri, [],
        { compress: quality, format: formatMap[toFormat] ?? ImageManipulator.SaveFormat.JPEG }
      );
      setConvertedUri(result.uri);
      setDone(true);
      const sizeMultiplier = { JPG: 0.4, PNG: 0.9, WEBP: 0.3, BMP: 3, TIFF: 5 }[toFormat];
      addProcessedFile({ name: `converted.${toFormat.toLowerCase()}`, toolId: "image-converter", toolName: "Image Converter", originalSize: image.fileSize, processedSize: Math.round(image.fileSize * sizeMultiplier), type: "image" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Convert Failed", "Could not convert the image."); }
    finally { setLoading(false); }
  };

  const saveConverted = async () => {
    if (!convertedUri) return;
    setSaving(true);
    const ext = toFormat === "PNG" ? "png" : toFormat === "WEBP" ? "webp" : "jpg";
    const r = await saveImageToDevice(convertedUri, `converted.${ext}`);
    setSaving(false);
    if (r === "saved") Alert.alert("✅ Saved!", `Image saved as ${toFormat} to 'Creator Toolbox' album.`);
  };

  const fmt = FORMATS.find((f) => f.id === toFormat)!;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Image Converter" subtitle="Convert between image formats" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {!image ? (
          <TouchableOpacity onPress={pick} style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}>
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "22", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={40} color={ACCENT} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Select Image</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>JPG, PNG, WEBP, BMP, TIFF</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
              <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
              <View style={styles.previewMeta}>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{image.width}×{image.height}px · {(image.fileSize / 1024).toFixed(1)} KB</Text>
                <TouchableOpacity onPress={pick}><MaterialCommunityIcons name="refresh" size={18} color={colors.primary} /></TouchableOpacity>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>CONVERT TO</Text>
              <View style={styles.formatGrid}>
                {FORMATS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => { setToFormat(f.id); setDone(false); }}
                    style={[styles.formatBtn, { backgroundColor: toFormat === f.id ? ACCENT + "22" : colors.muted, borderColor: toFormat === f.id ? ACCENT : "transparent", borderRadius: 10 }]}
                  >
                    <Text style={[styles.formatId, { color: toFormat === f.id ? ACCENT : colors.foreground }]}>{f.id}</Text>
                    <Text style={[styles.formatDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{f.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: ACCENT + "11", borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <MaterialCommunityIcons name="information-outline" size={18} color={ACCENT} />
              <View>
                <Text style={[styles.infoText, { color: ACCENT }]}>Output: {fmt.id} — {fmt.lossy ? "Lossy" : "Lossless"}</Text>
                <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>Typical size: {fmt.typical}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={convert} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "swap-horizontal"} size={20} color="#FFF" />
                  <Text style={styles.btnTxt}>{done ? `Converted to ${toFormat}` : `Convert to ${toFormat}`}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && convertedUri && (
              <TouchableOpacity onPress={saveConverted} disabled={saving} style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16 }]}>
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name="download" size={20} color="#FFF" />
                    <Text style={styles.btnTxt}>Save to Gallery</Text>
                  </>
                )}
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
  previewCard: { borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  preview: { width: "100%", height: 160 },
  previewMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 12 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  formatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formatBtn: { width: "30%", padding: 10, borderWidth: 1.5, gap: 4 },
  formatId: { fontSize: 14, fontFamily: "Inter_700Bold" },
  formatDesc: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14 },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  infoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
