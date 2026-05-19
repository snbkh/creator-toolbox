import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
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

const ACCENT = "#8B5CF6";

type AspectRatio = { label: string; w: number; h: number } | null;

const ASPECT_PRESETS: ({ label: string; w: number; h: number } | { label: string; w: null; h: null })[] = [
  { label: "Free", w: null, h: null },
  { label: "1:1", w: 1, h: 1 },
  { label: "4:3", w: 4, h: 3 },
  { label: "3:4", w: 3, h: 4 },
  { label: "16:9", w: 16, h: 9 },
  { label: "9:16", w: 9, h: 16 },
  { label: "2:3", w: 2, h: 3 },
  { label: "3:2", w: 3, h: 2 },
];

export default function ImageCropperScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [croppedUri, setCroppedUri] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<string>("Free");
  const [originalSize, setOriginalSize] = useState(0);

  const cropImage = async (aspectLabel: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Please allow photo library access."); return; }
    const preset = ASPECT_PRESETS.find((p) => p.label === aspectLabel);
    const hasAspect = preset && preset.w !== null;

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: hasAspect ? [preset.w as number, preset.h as number] : undefined,
      quality: 0.9,
    });

    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      setCroppedUri(a.uri);
      setOriginalSize(a.fileSize ?? 300 * 1024);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addProcessedFile({ name: `cropped_${aspectLabel.replace(":", "x")}.jpg`, toolId: "image-cropper", toolName: "Image Cropper", originalSize: a.fileSize ?? 500 * 1024, processedSize: a.fileSize ?? 300 * 1024, type: "image" });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Image Cropper" subtitle="Crop with aspect ratio presets" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Aspect Ratio Selector */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SELECT ASPECT RATIO THEN CROP</Text>
          <View style={styles.grid}>
            {ASPECT_PRESETS.map((p) => {
              const isActive = selectedAspect === p.label;
              return (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => setSelectedAspect(p.label)}
                  style={[styles.aspectBtn, {
                    backgroundColor: isActive ? ACCENT + "22" : colors.muted,
                    borderColor: isActive ? ACCENT : "transparent",
                    borderRadius: 10,
                  }]}
                >
                  {p.w !== null ? (
                    <View style={[styles.ratioVisual, {
                      width: 28 * (p.w / Math.max(p.w, p.h)),
                      height: 28 * (p.h / Math.max(p.w, p.h)),
                      borderColor: isActive ? ACCENT : colors.mutedForeground,
                    }]} />
                  ) : (
                    <MaterialCommunityIcons name="crop-free" size={20} color={isActive ? ACCENT : colors.mutedForeground} />
                  )}
                  <Text style={[styles.aspectLabel, { color: isActive ? ACCENT : colors.foreground }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => cropImage(selectedAspect)}
          style={[styles.cropBtn, { backgroundColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}
        >
          <MaterialCommunityIcons name="crop" size={20} color="#FFF" />
          <Text style={styles.cropBtnTxt}>Open & Crop Image ({selectedAspect})</Text>
        </TouchableOpacity>

        {croppedUri && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <Text style={[styles.resultTitle, { color: "#10B981" }]}>Cropped Image</Text>
            <Image source={{ uri: croppedUri }} style={styles.resultImg} contentFit="contain" />
            <TouchableOpacity
              onPress={() => cropImage(selectedAspect)}
              style={[styles.recropBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}
            >
              <MaterialCommunityIcons name="crop" size={16} color={colors.mutedForeground} />
              <Text style={[styles.recropTxt, { color: colors.mutedForeground }]}>Crop Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!croppedUri && (
          <View style={[styles.howToCard, { backgroundColor: colors.muted, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <Text style={[styles.howToTitle, { color: colors.foreground }]}>How to use</Text>
            {["Select your desired aspect ratio above", "Tap 'Open & Crop Image' to pick from gallery", "Use the built-in crop tool to select area", "Your cropped image will appear here"].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: ACCENT }]}><Text style={styles.stepNumTxt}>{i + 1}</Text></View>
                <Text style={[styles.stepTxt, { color: colors.mutedForeground }]}>{step}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 14 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  aspectBtn: { width: "22%", alignItems: "center", paddingVertical: 12, gap: 6, borderWidth: 1.5 },
  ratioVisual: { borderWidth: 2, borderRadius: 3 },
  aspectLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  cropBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 16 },
  cropBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  resultCard: { borderWidth: 2, padding: 16, marginBottom: 16, gap: 12, alignItems: "center" },
  resultTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  resultImg: { width: "100%", height: 240, borderRadius: 8 },
  recropBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  recropTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  howToCard: { padding: 16, marginBottom: 16, gap: 12 },
  howToTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepNumTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFF" },
  stepTxt: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
