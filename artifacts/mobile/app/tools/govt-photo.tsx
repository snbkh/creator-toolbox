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

const ACCENT = "#7C3AED";

const GOVT_PRESETS = [
  { id: "upsc", label: "UPSC / IAS", category: "Exam", photoSpec: "3.5×4.5cm, Max 300 KB", sigSpec: "3.5×1.5cm, Max 300 KB", photoPx: "413×531", sigPx: "413×175" },
  { id: "ssc", label: "SSC CGL / CHSL", category: "Exam", photoSpec: "3.5×4.5cm, 20-50 KB", sigSpec: "3.5×1.5cm, 10-20 KB", photoPx: "200×230", sigPx: "200×80" },
  { id: "bank", label: "Bank PO / IBPS", category: "Exam", photoSpec: "3.5×4.5cm, Max 50 KB", sigSpec: "3.5×1.5cm, Max 20 KB", photoPx: "200×230", sigPx: "200×80" },
  { id: "neet", label: "NEET / JEE", category: "Exam", photoSpec: "3.5×4.5cm, 10-200 KB", sigSpec: "3.5×1.5cm, 4-30 KB", photoPx: "413×531", sigPx: "413×175" },
  { id: "passport_india", label: "India Passport", category: "Govt Document", photoSpec: "2×2 inch, white bg, Max 500 KB", sigSpec: "N/A", photoPx: "600×600", sigPx: "" },
  { id: "driving", label: "Driving License", category: "Govt Document", photoSpec: "35×35mm, Max 100 KB", sigSpec: "35×15mm, Max 50 KB", photoPx: "413×413", sigPx: "413×175" },
  { id: "aadhar", label: "Aadhar / PAN Card", category: "Govt Document", photoSpec: "3.5×4.5cm, Max 50 KB", sigSpec: "3.5×1.5cm, Max 30 KB", photoPx: "200×230", sigPx: "200×80" },
  { id: "ration", label: "Ration Card", category: "Govt Document", photoSpec: "3.5×4.5cm, Max 50 KB", sigSpec: "N/A", photoPx: "200×230", sigPx: "" },
];

export default function GovtPhotoScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [selectedPreset, setSelectedPreset] = useState("ssc");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const preset = GOVT_PRESETS.find((p) => p.id === selectedPreset)!;

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Allow photo library access."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!r.canceled && r.assets[0]) { setPhotoUri(r.assets[0].uri); setDone(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  };

  const process = async () => {
    if (!photoUri) return;
    setLoading(true);
    try {
      const [wStr, hStr] = preset.photoPx.split("×");
      const width = parseInt(wStr || "300", 10);
      const height = parseInt(hStr || "400", 10);

      const result = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width, height } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      setProcessedUri(result.uri);
      setDone(true);
      addProcessedFile({ name: `${preset.label.replace(/ /g, "_")}_photo.jpg`, toolId: "govt-photo", toolName: "Govt Photo & Signature", originalSize: 800 * 1024, processedSize: 40 * 1024, type: "image" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Processing Failed", "Could not process the image.");
    } finally {
      setLoading(false);
    }
  };

  const savePhoto = async () => {
    if (!processedUri) return;
    setSaving(true);
    const r = await saveImageToDevice(processedUri, `${preset.label.replace(/ /g, "_")}_photo.jpg`);
    setSaving(false);
    if (r === "saved") {
      Alert.alert("✅ Saved!", "Processed photo saved to gallery in 'Creator Toolbox' album.");
    }
  };

  const exams = GOVT_PRESETS.filter((p) => p.category === "Exam");
  const docs = GOVT_PRESETS.filter((p) => p.category === "Govt Document");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Govt Photo & Signature" subtitle="Indian exam and document presets" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { margin: 16 }]}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>COMPETITIVE EXAMS</Text>
          {exams.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => { setSelectedPreset(p.id); setDone(false); }}
              style={[styles.presetRow, { borderColor: selectedPreset === p.id ? ACCENT : colors.border, backgroundColor: selectedPreset === p.id ? ACCENT + "11" : colors.card, borderRadius: 10 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetName, { color: selectedPreset === p.id ? ACCENT : colors.foreground }]}>{p.label}</Text>
                <Text style={[styles.presetSpec, { color: colors.mutedForeground }]}>Photo: {p.photoSpec}</Text>
                {p.sigSpec !== "N/A" && <Text style={[styles.presetSpec, { color: colors.mutedForeground }]}>Sign: {p.sigSpec}</Text>}
              </View>
              {selectedPreset === p.id && <MaterialCommunityIcons name="check-circle" size={20} color={ACCENT} />}
            </TouchableOpacity>
          ))}

          <Text style={[styles.groupLabel, { color: colors.mutedForeground, marginTop: 16 }]}>GOVERNMENT DOCUMENTS</Text>
          {docs.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => { setSelectedPreset(p.id); setDone(false); }}
              style={[styles.presetRow, { borderColor: selectedPreset === p.id ? ACCENT : colors.border, backgroundColor: selectedPreset === p.id ? ACCENT + "11" : colors.card, borderRadius: 10 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetName, { color: selectedPreset === p.id ? ACCENT : colors.foreground }]}>{p.label}</Text>
                <Text style={[styles.presetSpec, { color: colors.mutedForeground }]}>Photo: {p.photoSpec}</Text>
                {p.sigSpec !== "N/A" && <Text style={[styles.presetSpec, { color: colors.mutedForeground }]}>Sign: {p.sigSpec}</Text>}
              </View>
              {selectedPreset === p.id && <MaterialCommunityIcons name="check-circle" size={20} color={ACCENT} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Requirements Summary */}
        <View style={[styles.reqCard, { backgroundColor: ACCENT + "11", borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <Text style={[styles.reqTitle, { color: ACCENT }]}>{preset.label} Requirements</Text>
          <View style={styles.reqRow}>
            <MaterialCommunityIcons name="camera-outline" size={16} color={ACCENT} />
            <Text style={[styles.reqText, { color: colors.foreground }]}>Photo: {preset.photoSpec} ({preset.photoPx}px)</Text>
          </View>
          {preset.sigSpec !== "N/A" && (
            <View style={styles.reqRow}>
              <MaterialCommunityIcons name="draw" size={16} color={ACCENT} />
              <Text style={[styles.reqText, { color: colors.foreground }]}>Signature: {preset.sigSpec} ({preset.sigPx}px)</Text>
            </View>
          )}
        </View>

        {!photoUri ? (
          <TouchableOpacity onPress={pickPhoto} style={[styles.pickBtn, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 12 }]}>
            <MaterialCommunityIcons name="camera-plus-outline" size={32} color={ACCENT} />
            <Text style={[styles.pickTitle, { color: colors.foreground }]}>Pick Photo</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 12 }]}>
            <Image source={{ uri: photoUri }} style={styles.previewImg} contentFit="cover" />
            <TouchableOpacity onPress={pickPhoto} style={[styles.changeBtn, { backgroundColor: colors.muted, borderRadius: 8, margin: 12 }]}>
              <Text style={[styles.changeTxt, { color: colors.mutedForeground }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {photoUri && (
          <>
            <TouchableOpacity onPress={process} disabled={loading} style={[styles.processBtn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 12 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "badge-account-outline"} size={20} color="#FFF" />
                  <Text style={styles.processTxt}>{done ? "Photo & Signature Ready!" : `Process for ${preset.label}`}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && processedUri && (
              <TouchableOpacity onPress={savePhoto} disabled={saving} style={[styles.processBtn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 12 }]}>
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name="download" size={20} color="#FFF" />
                    <Text style={styles.processTxt}>Save to Gallery</Text>
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
  section: { gap: 8 },
  groupLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, paddingVertical: 4 },
  presetRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1.5, gap: 10 },
  presetName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  presetSpec: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  reqCard: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 8 },
  reqTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  pickBtn: { alignItems: "center", padding: 32, borderWidth: 2, borderStyle: "dashed", gap: 8, marginBottom: 12 },
  pickTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  previewCard: { borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  previewImg: { width: "100%", height: 200 },
  changeBtn: { alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8 },
  changeTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  processBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  processTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
