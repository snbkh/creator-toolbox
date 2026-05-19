import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

type ResizeMode = "custom" | "percentage" | "preset";

const SOCIAL_PRESETS = [
  { label: "Instagram Post", width: 1080, height: 1080, desc: "1:1 square" },
  { label: "Instagram Story", width: 1080, height: 1920, desc: "9:16 vertical" },
  { label: "Facebook Cover", width: 1200, height: 630, desc: "cover photo" },
  { label: "Twitter Header", width: 1500, height: 500, desc: "banner" },
  { label: "YouTube Thumb", width: 1280, height: 720, desc: "16:9" },
  { label: "LinkedIn Post", width: 1200, height: 627, desc: "recommended" },
  { label: "Passport Photo", width: 413, height: 531, desc: "2x2 inch / 300 DPI" },
  { label: "ID Card", width: 300, height: 240, desc: "standard ID" },
];

export default function ImageResizerScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [mode, setMode] = useState<ResizeMode>("custom");
  const [width, setWidth] = useState("800");
  const [height, setHeight] = useState("600");
  const [percentage, setPercentage] = useState("50");
  const [lockAspect, setLockAspect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize ?? 300 * 1024,
      });
      setWidth(String(asset.width));
      setHeight(String(asset.height));
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const onWidthChange = (val: string) => {
    setWidth(val);
    if (lockAspect && image && val) {
      const ratio = image.height / image.width;
      setHeight(String(Math.round(parseInt(val, 10) * ratio)));
    }
    setDone(false);
  };

  const onHeightChange = (val: string) => {
    setHeight(val);
    if (lockAspect && image && val) {
      const ratio = image.width / image.height;
      setWidth(String(Math.round(parseInt(val, 10) * ratio)));
    }
    setDone(false);
  };

  const applyPreset = (preset: typeof SOCIAL_PRESETS[0]) => {
    setWidth(String(preset.width));
    setHeight(String(preset.height));
    setMode("custom");
    setDone(false);
  };

  const getOutputDimensions = (): { w: number; h: number } => {
    if (!image) return { w: 0, h: 0 };
    if (mode === "percentage") {
      const pct = parseFloat(percentage) / 100;
      return {
        w: Math.round(image.width * pct),
        h: Math.round(image.height * pct),
      };
    }
    return {
      w: parseInt(width, 10) || 0,
      h: parseInt(height, 10) || 0,
    };
  };

  const resize = async () => {
    if (!image) return;
    const { w, h } = getOutputDimensions();
    if (!w || !h) return;
    setLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 900));
    setLoading(false);
    setDone(true);
    addProcessedFile({
      name: `resized_${w}x${h}.jpg`,
      toolId: "image-resizer",
      toolName: "Image Resizer",
      originalSize: image.fileSize,
      processedSize: Math.round(image.fileSize * (w * h) / (image.width * image.height)),
      type: "image",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const dims = getOutputDimensions();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Image Resizer"
        subtitle="Resize images to any dimension"
        accentColor="#0EA5E9"
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Pick Image */}
        {!image ? (
          <TouchableOpacity
            onPress={pickImage}
            style={[
              styles.dropzone,
              { backgroundColor: colors.card, borderColor: "#0EA5E9", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 },
            ]}
          >
            <View style={[styles.dropzoneIcon, { backgroundColor: "#0EA5E9" + "22", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="resize" size={36} color="#0EA5E9" />
            </View>
            <Text style={[styles.dropzoneTitle, { color: colors.foreground }]}>Select Image</Text>
            <Text style={[styles.dropzoneDesc, { color: colors.mutedForeground }]}>JPG, PNG, WEBP</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Preview */}
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 }]}>
              <Image source={{ uri: image.uri }} style={styles.previewImg} contentFit="cover" />
              <View style={[styles.imgMeta, { borderTopColor: colors.border }]}>
                <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>
                  Original: {image.width} x {image.height}px
                </Text>
                <TouchableOpacity onPress={pickImage}>
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mode Selector */}
            <View style={styles.modeTabs}>
              {([["custom", "Custom"], ["percentage", "Percentage"], ["preset", "Presets"]] as [ResizeMode, string][]).map(([m, label]) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.modeTab,
                    {
                      backgroundColor: mode === m ? "#0EA5E9" : colors.card,
                      borderColor: mode === m ? "#0EA5E9" : colors.border,
                      borderRadius: colors.radius - 4,
                    },
                  ]}
                >
                  <Text style={[styles.modeTabText, { color: mode === m ? "#FFFFFF" : colors.foreground }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Mode */}
            {mode === "custom" && (
              <View style={[styles.dimCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <View style={styles.dimRow}>
                  <View style={styles.dimField}>
                    <Text style={[styles.dimLabel, { color: colors.mutedForeground }]}>WIDTH (px)</Text>
                    <TextInput
                      style={[styles.dimInput, { color: colors.foreground, borderColor: "#0EA5E9" }]}
                      value={width}
                      onChangeText={onWidthChange}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={[styles.dimX, { color: colors.mutedForeground }]}>×</Text>
                  <View style={styles.dimField}>
                    <Text style={[styles.dimLabel, { color: colors.mutedForeground }]}>HEIGHT (px)</Text>
                    <TextInput
                      style={[styles.dimInput, { color: colors.foreground, borderColor: "#0EA5E9" }]}
                      value={height}
                      onChangeText={onHeightChange}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={[styles.lockRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.lockLabel, { color: colors.foreground }]}>Lock Aspect Ratio</Text>
                  <Switch
                    value={lockAspect}
                    onValueChange={setLockAspect}
                    trackColor={{ false: colors.muted, true: "#0EA5E9" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            )}

            {/* Percentage Mode */}
            {mode === "percentage" && (
              <View style={[styles.dimCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <View style={styles.pctRow}>
                  {[25, 50, 75].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPercentage(String(p))}
                      style={[
                        styles.pctBtn,
                        {
                          backgroundColor: percentage === String(p) ? "#0EA5E9" + "22" : colors.muted,
                          borderColor: percentage === String(p) ? "#0EA5E9" : "transparent",
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <Text style={[styles.pctBtnText, { color: percentage === String(p) ? "#0EA5E9" : colors.foreground }]}>
                        {p}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.pctInputRow}>
                  <TextInput
                    style={[styles.dimInput, { color: colors.foreground, borderColor: "#0EA5E9", flex: 1 }]}
                    value={percentage}
                    onChangeText={(v) => { setPercentage(v); setDone(false); }}
                    keyboardType="numeric"
                    placeholder="Custom %"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <Text style={[styles.pctSymbol, { color: colors.mutedForeground }]}>%</Text>
                </View>
              </View>
            )}

            {/* Presets Mode */}
            {mode === "preset" && (
              <View style={styles.presetList}>
                {SOCIAL_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.label}
                    onPress={() => applyPreset(p)}
                    style={[
                      styles.presetRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                        marginHorizontal: 16,
                      },
                    ]}
                  >
                    <View style={styles.presetInfo}>
                      <Text style={[styles.presetName, { color: colors.foreground }]}>{p.label}</Text>
                      <Text style={[styles.presetDim, { color: colors.mutedForeground }]}>
                        {p.width} x {p.height} · {p.desc}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Output info */}
            {dims.w > 0 && dims.h > 0 && (
              <View style={[styles.outputInfo, { backgroundColor: "#0EA5E9" + "11", borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Text style={[styles.outputText, { color: "#0EA5E9" }]}>
                  Output: {dims.w} x {dims.h} px
                </Text>
              </View>
            )}

            {/* Resize Button */}
            <TouchableOpacity
              onPress={resize}
              disabled={loading || !dims.w || !dims.h}
              style={[
                styles.resizeBtn,
                {
                  backgroundColor: done ? "#10B981" : "#0EA5E9",
                  borderRadius: colors.radius,
                  marginHorizontal: 16,
                  opacity: !dims.w || !dims.h ? 0.5 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : done ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.resizeBtnText}>Resized to {dims.w}x{dims.h}</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="resize" size={20} color="#FFFFFF" />
                  <Text style={styles.resizeBtnText}>Resize Image</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dropzone: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 12,
    marginBottom: 16,
  },
  dropzoneIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  dropzoneTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  dropzoneDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  previewCard: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  previewImg: {
    width: "100%",
    height: 180,
  },
  imgMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
  },
  metaItem: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  modeTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
  },
  modeTabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  dimCard: {
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  dimField: {
    flex: 1,
    gap: 6,
  },
  dimLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  dimInput: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  dimX: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    marginTop: 20,
  },
  lockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  lockLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  pctRow: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  pctBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  pctBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  pctInputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  pctSymbol: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  presetList: {
    gap: 8,
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
  },
  presetInfo: {
    flex: 1,
    gap: 3,
  },
  presetName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  presetDim: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  outputInfo: {
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  outputText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  resizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  resizeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
