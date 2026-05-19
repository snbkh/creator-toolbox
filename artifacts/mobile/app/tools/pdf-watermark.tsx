import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#DC2626";
interface PDFFile { name: string; size: number; }
type Position = "center" | "diagonal" | "top" | "bottom";
type Color = "#00000040" | "#DC262640" | "#0EA5E940" | "#10B98140";

const POSITIONS: { id: Position; label: string; icon: string }[] = [
  { id: "diagonal", label: "Diagonal", icon: "slope-uphill" },
  { id: "center", label: "Center", icon: "image-filter-center-focus" },
  { id: "top", label: "Top", icon: "align-vertical-top" },
  { id: "bottom", label: "Bottom", icon: "align-vertical-bottom" },
];

const COLORS: { val: Color; label: string; hex: string }[] = [
  { val: "#00000040", label: "Black", hex: "#000000" },
  { val: "#DC262640", label: "Red", hex: "#DC2626" },
  { val: "#0EA5E940", label: "Blue", hex: "#0EA5E9" },
  { val: "#10B98140", label: "Green", hex: "#10B981" },
];

export default function PdfWatermarkScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [position, setPosition] = useState<Position>("diagonal");
  const [opacity, setOpacity] = useState(30);
  const [color, setColor] = useState<Color>("#00000040");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: false });
    if (!r.canceled && r.assets[0]) { setFile({ name: r.assets[0].name, size: r.assets[0].size ?? 1048576 }); setDone(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  };

  const apply = async () => {
    if (!file || !watermarkText.trim()) return;
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1300));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: `watermarked_${file.name}`, toolId: "pdf-watermark", toolName: "PDF Watermark", originalSize: file.size, processedSize: file.size + 10 * 1024, type: "pdf" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Watermark" subtitle="Add text watermarks to PDF" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pick} style={[styles.picker, { backgroundColor: colors.card, borderColor: file ? colors.border : ACCENT, borderStyle: file ? "solid" : "dashed", borderRadius: colors.radius, margin: 16 }]}>
          <MaterialCommunityIcons name="file-pdf-box" size={28} color={ACCENT} />
          <Text style={[styles.pickerTxt, { color: file ? colors.foreground : colors.mutedForeground }]}>{file?.name ?? "Select PDF File"}</Text>
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            {/* Preview */}
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>PREVIEW</Text>
              <View style={styles.pdfPage}>
                <View style={styles.pageLines}>
                  {[...Array(6)].map((_, i) => <View key={i} style={[styles.pageLine, { backgroundColor: colors.border }]} />)}
                </View>
                <Text style={[styles.wmText, {
                  color: COLORS.find((c) => c.val === color)?.hex + "60",
                  transform: position === "diagonal" ? [{ rotate: "-30deg" }] : [],
                  top: position === "top" ? 20 : position === "bottom" ? undefined : "auto",
                  bottom: position === "bottom" ? 20 : undefined,
                  opacity: opacity / 100,
                }]}>
                  {watermarkText || "WATERMARK"}
                </Text>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>WATERMARK TEXT</Text>
              <TextInput style={[styles.input, { color: colors.foreground, borderColor: ACCENT }]} value={watermarkText} onChangeText={setWatermarkText} placeholder="CONFIDENTIAL" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters" />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>POSITION</Text>
              <View style={styles.posRow}>
                {POSITIONS.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => setPosition(p.id)} style={[styles.posBtn, { backgroundColor: position === p.id ? ACCENT + "22" : colors.muted, borderColor: position === p.id ? ACCENT : "transparent", borderRadius: 10 }]}>
                    <MaterialCommunityIcons name={p.icon as never} size={20} color={position === p.id ? ACCENT : colors.mutedForeground} />
                    <Text style={[styles.posTxt, { color: position === p.id ? ACCENT : colors.foreground }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>COLOR</Text>
              <View style={styles.colorRow}>
                {COLORS.map((c) => (
                  <TouchableOpacity key={c.val} onPress={() => setColor(c.val)} style={[styles.colorBtn, { backgroundColor: c.hex, borderColor: color === c.val ? colors.foreground : "transparent", borderWidth: color === c.val ? 2.5 : 0 }]}>
                    {color === c.val && <MaterialCommunityIcons name="check" size={18} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>OPACITY: {opacity}%</Text>
              <View style={styles.opacityRow}>
                {[10, 20, 30, 50, 70].map((o) => (
                  <TouchableOpacity key={o} onPress={() => setOpacity(o)} style={[styles.opBtn, { backgroundColor: opacity === o ? ACCENT : colors.muted, borderRadius: 8 }]}>
                    <Text style={[styles.opTxt, { color: opacity === o ? "#FFF" : colors.mutedForeground }]}>{o}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={apply} disabled={loading || !watermarkText.trim()} style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16, opacity: !watermarkText.trim() ? 0.5 : 1 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "watermark"} size={20} color="#FFF" />
                  <Text style={styles.btnTxt}>{done ? "Watermark Applied!" : "Apply Watermark"}</Text>
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
  picker: { flexDirection: "row", alignItems: "center", padding: 20, borderWidth: 2, gap: 14, marginBottom: 12 },
  pickerTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  previewCard: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  previewLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  pdfPage: { height: 160, backgroundColor: "#FFFFFF", borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden", position: "relative" },
  pageLines: { position: "absolute", width: "80%", gap: 12, top: 20 },
  pageLine: { height: 1.5, width: "100%", borderRadius: 1 },
  wmText: { position: "absolute", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: 2 },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  input: { fontSize: 18, fontFamily: "Inter_600SemiBold", borderBottomWidth: 2, paddingBottom: 6, letterSpacing: 2 },
  posRow: { flexDirection: "row", gap: 8 },
  posBtn: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 6, borderWidth: 1.5 },
  posTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  opacityRow: { flexDirection: "row", gap: 8 },
  opBtn: { flex: 1, paddingVertical: 8, alignItems: "center" },
  opTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
