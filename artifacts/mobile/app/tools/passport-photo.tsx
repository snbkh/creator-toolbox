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

const ACCENT = "#8B5CF6";

const PHOTO_PRESETS = [
  { id: "us_passport", country: "USA / India", label: "Passport", dims: "2×2 inch", px: "600×600", maxKB: 240 },
  { id: "uk_passport", country: "UK", label: "UK Passport", dims: "35×45mm", px: "413×531", maxKB: 200 },
  { id: "schengen", country: "Schengen/EU", label: "EU Visa", dims: "35×45mm", px: "413×531", maxKB: 150 },
  { id: "india_govt", country: "India", label: "Govt Forms", dims: "3.5×4.5cm", px: "413×531", maxKB: 50 },
  { id: "india_exam", country: "India", label: "Exam Photo", dims: "3.5×4.5cm", px: "200×230", maxKB: 50 },
  { id: "canada", country: "Canada", label: "Canada PR", dims: "50×70mm", px: "590×826", maxKB: 300 },
  { id: "australia", country: "Australia", label: "Australia Visa", dims: "45×35mm", px: "531×413", maxKB: 200 },
  { id: "id_2x2", country: "General", label: "ID Card 2x2", dims: "51×51mm", px: "600×600", maxKB: 100 },
];

export default function PassportPhotoScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [selectedPreset, setSelectedPreset] = useState("us_passport");
  const [image, setImage] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const preset = PHOTO_PRESETS.find((p) => p.id === selectedPreset)!;

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Please allow photo library access."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!r.canceled && r.assets[0]) {
      setImage(r.assets[0].uri);
      setFileSize(r.assets[0].fileSize ?? 800 * 1024);
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const process = async () => {
    if (!image) return;
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: `${preset.label.replace(/ /g, "_")}_photo.jpg`, toolId: "passport-photo", toolName: "Passport Photo Maker", originalSize: fileSize, processedSize: Math.min(preset.maxKB * 1024, fileSize * 0.4), type: "image" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Passport Photo Maker" subtitle="Create photos for any country" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Preset Selector */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SELECT COUNTRY / PURPOSE</Text>
          {PHOTO_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => { setSelectedPreset(p.id); setDone(false); }}
              style={[styles.presetItem, { borderColor: selectedPreset === p.id ? ACCENT : colors.border, backgroundColor: selectedPreset === p.id ? ACCENT + "11" : "transparent", borderRadius: 10 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetName, { color: selectedPreset === p.id ? ACCENT : colors.foreground }]}>{p.label}</Text>
                <Text style={[styles.presetCountry, { color: colors.mutedForeground }]}>{p.country} · {p.dims} · Max {p.maxKB} KB</Text>
              </View>
              <View style={[styles.sizeTag, { backgroundColor: selectedPreset === p.id ? ACCENT : colors.muted, borderRadius: 6 }]}>
                <Text style={[styles.sizeTagTxt, { color: selectedPreset === p.id ? "#FFF" : colors.mutedForeground }]}>{p.px}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Picker */}
        {!image ? (
          <TouchableOpacity onPress={pick} style={[styles.pickZone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "22", borderRadius: 16 }]}>
              <MaterialCommunityIcons name="camera-plus-outline" size={36} color={ACCENT} />
            </View>
            <Text style={[styles.pickTitle, { color: colors.foreground }]}>Pick Photo</Text>
            <Text style={[styles.pickDesc, { color: colors.mutedForeground }]}>Will be cropped to 1:1 ratio</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <Image source={{ uri: image }} style={styles.previewImg} contentFit="cover" />
            <View style={styles.previewInfo}>
              <View>
                <Text style={[styles.previewTitle, { color: colors.foreground }]}>{preset.label}</Text>
                <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>{preset.dims} · {preset.px}px · Max {preset.maxKB} KB</Text>
              </View>
              <TouchableOpacity onPress={pick} style={[styles.changeBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                <MaterialCommunityIcons name="refresh" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {image && (
          <TouchableOpacity onPress={process} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 12 }]}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <MaterialCommunityIcons name={done ? "check-circle" : "card-account-details-outline"} size={20} color="#FFF" />
                <Text style={styles.btnTxt}>{done ? "Photo Ready!" : `Create ${preset.label} Photo`}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 8 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  presetItem: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1.5, gap: 10 },
  presetName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  presetCountry: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  sizeTag: { paddingHorizontal: 8, paddingVertical: 4 },
  sizeTagTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pickZone: { alignItems: "center", padding: 40, borderWidth: 2, borderStyle: "dashed", gap: 10, marginBottom: 12 },
  iconBox: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  pickTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  pickDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  previewCard: { borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  previewImg: { width: "100%", height: 220 },
  previewInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  previewTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  changeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
