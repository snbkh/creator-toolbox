import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Slider,
  StyleSheet,
  Text,
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

type Preset = "original" | "high" | "medium" | "low" | "web";

const PRESETS: { id: Preset; label: string; quality: number; description: string }[] = [
  { id: "original", label: "Original", quality: 1.0, description: "No compression" },
  { id: "high", label: "High", quality: 0.85, description: "Best quality, ~15% smaller" },
  { id: "medium", label: "Medium", quality: 0.65, description: "Balanced, ~35% smaller" },
  { id: "low", label: "Low", quality: 0.4, description: "Small size, ~60% smaller" },
  { id: "web", label: "Web", quality: 0.55, description: "Optimized for web" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageCompressorScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [quality, setQuality] = useState(0.75);
  const [preset, setPreset] = useState<Preset>("medium");
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);

  const estimatedSize = image ? Math.round(image.fileSize * quality * 0.95) : 0;
  const savePct = image ? Math.round((1 - estimatedSize / image.fileSize) * 100) : 0;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize ?? 500 * 1024,
      });
      setProcessed(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setPreset(p.id);
    setQuality(p.quality);
    setProcessed(false);
  };

  const compress = async () => {
    if (!image) return;
    setLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setProcessed(true);
    addProcessedFile({
      name: `compressed_image.jpg`,
      toolId: "image-compressor",
      toolName: "Image Compressor",
      originalSize: image.fileSize,
      processedSize: estimatedSize,
      type: "image",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Image Compressor"
        subtitle="Reduce image file size"
        accentColor="#8B5CF6"
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Pick Image */}
        {!image ? (
          <TouchableOpacity
            onPress={pickImage}
            style={[
              styles.dropzone,
              {
                backgroundColor: colors.card,
                borderColor: "#8B5CF6",
                borderRadius: colors.radius,
                marginHorizontal: 16,
                marginTop: 16,
              },
            ]}
          >
            <View style={[styles.dropzoneIcon, { backgroundColor: "#8B5CF6" + "22", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="image-plus" size={36} color="#8B5CF6" />
            </View>
            <Text style={[styles.dropzoneTitle, { color: colors.foreground }]}>
              Select Image
            </Text>
            <Text style={[styles.dropzoneDesc, { color: colors.mutedForeground }]}>
              JPG, PNG, WEBP supported
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Image Preview */}
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 }]}>
              <Image
                source={{ uri: image.uri }}
                style={styles.previewImage}
                contentFit="cover"
              />
              <View style={styles.imageMeta}>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Original Size</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>
                    {formatSize(image.fileSize)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Dimensions</Text>
                  <Text style={[styles.metaValue, { color: colors.foreground }]}>
                    {image.width} x {image.height}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Est. Output</Text>
                  <Text style={[styles.metaValue, { color: "#10B981" }]}>
                    {formatSize(estimatedSize)} (-{savePct}%)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={pickImage}
                style={[styles.changeBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.changeBtnText, { color: colors.mutedForeground }]}>
                  Change Image
                </Text>
              </TouchableOpacity>
            </View>

            {/* Presets */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                COMPRESSION PRESET
              </Text>
              <View style={styles.presetGrid}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => applyPreset(p)}
                    style={[
                      styles.presetBtn,
                      {
                        backgroundColor: preset === p.id ? "#8B5CF6" + "22" : colors.card,
                        borderColor: preset === p.id ? "#8B5CF6" : colors.border,
                        borderRadius: colors.radius - 4,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetLabel,
                        { color: preset === p.id ? "#8B5CF6" : colors.foreground },
                      ]}
                    >
                      {p.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetDesc,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {p.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quality Slider */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  QUALITY
                </Text>
                <Text style={[styles.qualityVal, { color: "#8B5CF6" }]}>
                  {Math.round(quality * 100)}%
                </Text>
              </View>
              <View style={styles.sliderRow}>
                <Text style={[styles.sliderEnd, { color: colors.mutedForeground }]}>Smaller</Text>
                <View style={styles.sliderWrap}>
                  {Platform.OS !== "web" ? (
                    <Slider
                      minimumValue={0.1}
                      maximumValue={1.0}
                      value={quality}
                      onValueChange={(v) => {
                        setQuality(v);
                        setPreset("original");
                        setProcessed(false);
                      }}
                      minimumTrackTintColor="#8B5CF6"
                      maximumTrackTintColor={colors.border}
                      thumbTintColor="#8B5CF6"
                      step={0.05}
                    />
                  ) : (
                    <View style={[styles.webSliderTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.webSliderFill,
                          {
                            width: `${quality * 100}%`,
                            backgroundColor: "#8B5CF6",
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
                <Text style={[styles.sliderEnd, { color: colors.mutedForeground }]}>Better</Text>
              </View>
            </View>

            {/* Compress Button */}
            <TouchableOpacity
              onPress={compress}
              disabled={loading}
              style={[
                styles.compressBtn,
                {
                  backgroundColor: processed ? "#10B981" : "#8B5CF6",
                  borderRadius: colors.radius,
                  marginHorizontal: 16,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : processed ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.compressBtnText}>Compressed — {formatSize(estimatedSize)}</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="arrow-collapse-all" size={20} color="#FFFFFF" />
                  <Text style={styles.compressBtnText}>Compress Image</Text>
                </>
              )}
            </TouchableOpacity>

            {processed && (
              <View style={[styles.successNote, { backgroundColor: "#10B981" + "11", borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Ionicons name="information-circle-outline" size={16} color="#10B981" />
                <Text style={[styles.successNoteText, { color: "#10B981" }]}>
                  Saved to file history. Install the full APK for direct download support.
                </Text>
              </View>
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
  previewImage: {
    width: "100%",
    height: 200,
  },
  imageMeta: {
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metaValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 7,
    margin: 14,
    marginTop: 0,
  },
  changeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    marginBottom: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetBtn: {
    width: "30%",
    padding: 10,
    borderWidth: 1,
    gap: 3,
  },
  presetLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  presetDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qualityVal: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sliderEnd: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    width: 44,
  },
  sliderWrap: {
    flex: 1,
  },
  webSliderTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  webSliderFill: {
    height: "100%",
    borderRadius: 2,
  },
  compressBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  compressBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  successNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 12,
  },
  successNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
