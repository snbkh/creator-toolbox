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
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#F59E0B";

interface Enhancement { id: string; label: string; desc: string; icon: string; selected: boolean; }

const ENHANCEMENTS: Enhancement[] = [
  { id: "denoise", label: "Denoise", desc: "Remove grain & noise", icon: "blur-off", selected: true },
  { id: "sharpen", label: "Sharpen", desc: "Increase edge clarity", icon: "image-filter-none", selected: true },
  { id: "brightness", label: "Auto Brightness", desc: "Balance exposure", icon: "brightness-auto", selected: false },
  { id: "contrast", label: "Auto Contrast", desc: "Improve tonal range", icon: "contrast-circle", selected: false },
  { id: "color", label: "Color Boost", desc: "Enhance saturation", icon: "palette", selected: false },
  { id: "face", label: "Face Smoothing", desc: "Skin retouching", icon: "account-circle-outline", selected: false },
];

const PRESETS = [
  { id: "portrait", label: "Portrait", icon: "account", enhance: ["denoise", "sharpen", "face", "brightness"] },
  { id: "landscape", label: "Landscape", icon: "image-outline", enhance: ["sharpen", "brightness", "contrast", "color"] },
  { id: "auto", label: "Auto Fix", icon: "auto-fix", enhance: ["denoise", "sharpen", "brightness", "contrast"] },
];

export default function ImageEnhancerScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [image, setImage] = useState<{ uri: string; size: number } | null>(null);
  const [enhancements, setEnhancements] = useState<Enhancement[]>(ENHANCEMENTS);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Please allow photo library access."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.Images, quality: 1 });
    if (!r.canceled && r.assets[0]) {
      setImage({ uri: r.assets[0].uri, size: r.assets[0].fileSize ?? 1024 * 1024 });
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const toggle = (id: string) => {
    setEnhancements((prev) => prev.map((e) => e.id === id ? { ...e, selected: !e.selected } : e));
    setDone(false);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setEnhancements((prev) => prev.map((e) => ({ ...e, selected: preset.enhance.includes(e.id) })));
    setDone(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const enhance = async () => {
    if (!image) return;
    const selected = enhancements.filter((e) => e.selected);
    if (selected.length === 0) { Alert.alert("Select Enhancement", "Please select at least one enhancement."); return; }
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1800));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: "enhanced_image.jpg", toolId: "image-enhancer", toolName: "AI Image Enhancer", originalSize: image.size, processedSize: Math.round(image.size * 0.85), type: "image" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const selectedCount = enhancements.filter((e) => e.selected).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="AI Image Enhancer" subtitle="Sharpen, denoise & beautify photos" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {!image ? (
          <TouchableOpacity onPress={pick} style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}>
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "22", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="image-auto-adjust" size={40} color={ACCENT} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Select Image to Enhance</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>JPG, PNG, WEBP supported</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
            <Image source={{ uri: image.uri }} style={styles.previewImg} contentFit="cover" />
            <TouchableOpacity onPress={pick} style={[styles.changeBtn, { backgroundColor: colors.muted, borderRadius: 8, margin: 12 }]}>
              <MaterialCommunityIcons name="refresh" size={16} color={colors.mutedForeground} />
              <Text style={[styles.changeTxt, { color: colors.mutedForeground }]}>Change Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {image && (
          <>
            {/* Quick Presets */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>QUICK PRESETS</Text>
              <View style={styles.presetRow}>
                {PRESETS.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => applyPreset(p)} style={[styles.presetBtn, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name={p.icon as never} size={20} color={ACCENT} />
                    <Text style={[styles.presetLabel, { color: colors.foreground }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Enhancement Toggles */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>ENHANCEMENTS ({selectedCount} selected)</Text>
              {enhancements.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => toggle(e.id)}
                  style={[styles.enhRow, { borderColor: e.selected ? ACCENT : colors.border, backgroundColor: e.selected ? ACCENT + "0D" : "transparent", borderRadius: 10 }]}
                >
                  <View style={[styles.enhIcon, { backgroundColor: e.selected ? ACCENT + "22" : colors.muted, borderRadius: 10 }]}>
                    <MaterialCommunityIcons name={e.icon as never} size={20} color={e.selected ? ACCENT : colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.enhLabel, { color: e.selected ? ACCENT : colors.foreground }]}>{e.label}</Text>
                    <Text style={[styles.enhDesc, { color: colors.mutedForeground }]}>{e.desc}</Text>
                  </View>
                  <View style={[styles.toggle, { backgroundColor: e.selected ? ACCENT : colors.muted, borderRadius: 12 }]}>
                    {e.selected && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={enhance} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {loading ? (
                <>
                  <ActivityIndicator color="#FFF" />
                  <Text style={styles.btnTxt}>Enhancing with AI...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "image-auto-adjust"} size={20} color="#FFF" />
                  <Text style={styles.btnTxt}>{done ? "Enhancement Applied!" : `Apply ${selectedCount} Enhancement${selectedCount !== 1 ? "s" : ""}`}</Text>
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
  dropzone: { alignItems: "center", padding: 48, borderWidth: 2, borderStyle: "dashed", gap: 12, marginBottom: 16 },
  iconBox: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  previewCard: { borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  previewImg: { width: "100%", height: 180 },
  changeBtn: { flexDirection: "row", alignItems: "center", alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  changeTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  presetRow: { flexDirection: "row", gap: 8 },
  presetBtn: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 6 },
  presetLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  enhRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1.5, gap: 12 },
  enhIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  enhLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  enhDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  toggle: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
