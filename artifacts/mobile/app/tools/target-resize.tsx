import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
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
import * as ImageManipulator from "expo-image-manipulator";
import { saveImageToDevice } from "@/utils/saveToDevice";

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ACCENT = "#EC4899";

export default function TargetResizeScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [targetKB, setTargetKB] = useState("100");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resizedUri, setResizedUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const originalKB = image ? image.fileSize / 1024 : 0;
  const targetKBNum = parseFloat(targetKB) || 0;
  const neededQuality = targetKBNum > 0 && originalKB > 0
    ? Math.min(1, Math.max(0.05, targetKBNum / (originalKB * 0.95)))
    : 0;
  const estimatedKB = Math.round(originalKB * neededQuality * 0.95);
  const compressionRatio = originalKB > 0 ? Math.round((1 - neededQuality * 0.95) * 100) : 0;
  const isDownsizing = targetKBNum < originalKB;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, width: a.width, height: a.height, fileSize: a.fileSize ?? 500 * 1024 });
      setDone(false);
      setResizedUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const process = async () => {
    if (!image || !targetKBNum) return;
    setLoading(true);
    try {
      // Real quality target compression using expo-image-manipulator
      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        [], // no resize, just compress
        { compress: neededQuality, format: ImageManipulator.SaveFormat.JPEG }
      );
      setResizedUri(result.uri);
      setDone(true);
      addProcessedFile({
        name: `target_${targetKBNum}KB.jpg`,
        toolId: "target-resize",
        toolName: "Target File Size Resize",
        originalSize: image.fileSize,
        processedSize: estimatedKB * 1024,
        type: "image",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Resize Failed", "Could not compress image to target size.");
    } finally {
      setLoading(false);
    }
  };

  const saveResized = async () => {
    if (!resizedUri) return;
    setSaving(true);
    const result = await saveImageToDevice(resizedUri, `target_${targetKBNum}KB.jpg`);
    setSaving(false);
    if (result === "saved") {
      Alert.alert("✅ Saved!", "Image saved to your gallery in 'Creator Toolbox' album.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Target File Size" subtitle="Resize image to exact KB" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!image ? (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}
          >
            <View style={[styles.dropIcon, { backgroundColor: ACCENT + "22", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="target" size={40} color={ACCENT} />
            </View>
            <Text style={[styles.dropTitle, { color: colors.foreground }]}>Pick Image</Text>
            <Text style={[styles.dropDesc, { color: colors.mutedForeground }]}>JPG, PNG, WEBP</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
              <Image source={{ uri: image.uri }} style={styles.previewImg} contentFit="cover" />
              <View style={styles.sizeRow}>
                <View style={styles.sizeBlock}>
                  <Text style={[styles.sizeLabel, { color: colors.mutedForeground }]}>ORIGINAL</Text>
                  <Text style={[styles.sizeVal, { color: colors.foreground }]}>{formatSize(image.fileSize)}</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.mutedForeground} />
                <View style={styles.sizeBlock}>
                  <Text style={[styles.sizeLabel, { color: colors.mutedForeground }]}>TARGET</Text>
                  <Text style={[styles.sizeVal, { color: ACCENT }]}>{targetKBNum > 0 ? `${targetKBNum} KB` : "—"}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={pickImage} style={[styles.changeBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                <Text style={[styles.changeBtnTxt, { color: colors.mutedForeground }]}>Change Image</Text>
              </TouchableOpacity>
            </View>

            {/* Target KB Input */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>TARGET SIZE (KB)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.kbInput, { color: colors.foreground, borderColor: ACCENT }]}
                  value={targetKB}
                  onChangeText={(v) => { setTargetKB(v); setDone(false); }}
                  keyboardType="numeric"
                  placeholder="e.g. 100"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.kbUnit, { color: colors.mutedForeground }]}>KB</Text>
              </View>
              {/* Quick presets */}
              <View style={styles.presetRow}>
                {[20, 50, 100, 200, 500].map((kb) => (
                  <TouchableOpacity
                    key={kb}
                    onPress={() => { setTargetKB(String(kb)); setDone(false); }}
                    style={[styles.presetChip, {
                      backgroundColor: targetKB === String(kb) ? ACCENT : colors.muted,
                      borderRadius: 8,
                    }]}
                  >
                    <Text style={[styles.presetChipTxt, { color: targetKB === String(kb) ? "#FFF" : colors.mutedForeground }]}>
                      {kb}KB
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stats */}
            {targetKBNum > 0 && (
              <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: isDownsizing ? ACCENT : "#10B981", borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <View style={styles.statsRow}>
                  <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>Estimated Output</Text>
                  <Text style={[styles.statsVal, { color: ACCENT }]}>{estimatedKB} KB</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>Quality Applied</Text>
                  <Text style={[styles.statsVal, { color: colors.foreground }]}>{Math.round(neededQuality * 100)}%</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>Size Reduction</Text>
                  <Text style={[styles.statsVal, { color: "#10B981" }]}>-{compressionRatio}%</Text>
                </View>
                {neededQuality <= 0.15 && (
                  <View style={[styles.warnBox, { backgroundColor: "#F59E0B" + "22", borderRadius: 8 }]}>
                    <Text style={[styles.warnTxt, { color: "#F59E0B" }]}>
                      Low quality needed — image may look pixelated at this target size.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={process}
              disabled={loading || !targetKBNum}
              style={[styles.processBtn, {
                backgroundColor: done ? "#10B981" + "22" : ACCENT,
                borderColor: done ? "#10B981" : "transparent",
                borderWidth: done ? 1 : 0,
                borderRadius: colors.radius,
                marginHorizontal: 16,
                opacity: !targetKBNum ? 0.5 : 1,
              }]}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "target"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.processBtnTxt, { color: done ? "#10B981" : "#FFF" }]}>{done ? `Done — ~${estimatedKB} KB` : "Resize to Target"}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && resizedUri && (
              <TouchableOpacity
                onPress={saveResized}
                disabled={saving}
                style={[styles.processBtn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 4 }]}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name="content-save" size={20} color="#FFF" />
                    <Text style={styles.processBtnTxt}>Save to Gallery</Text>
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
  dropzone: { alignItems: "center", justifyContent: "center", padding: 48, borderWidth: 2, borderStyle: "dashed", gap: 12, marginBottom: 16 },
  dropIcon: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  dropTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  dropDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  previewCard: { borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  previewImg: { width: "100%", height: 180 },
  sizeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: 14 },
  sizeBlock: { alignItems: "center", gap: 4 },
  sizeLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  sizeVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  changeBtn: { alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 7, margin: 12, marginTop: 0 },
  changeBtnTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  kbInput: { fontSize: 36, fontFamily: "Inter_700Bold", borderBottomWidth: 2, paddingBottom: 4, flex: 1 },
  kbUnit: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  presetRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  presetChip: { paddingHorizontal: 12, paddingVertical: 7 },
  presetChipTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  statsCard: { borderWidth: 1.5, padding: 16, marginBottom: 12, gap: 10 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statsLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  warnBox: { padding: 10, marginTop: 4 },
  warnTxt: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  processBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  processBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
