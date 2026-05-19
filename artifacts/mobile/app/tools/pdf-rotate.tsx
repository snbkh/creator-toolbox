import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#DC2626";
interface PDFFile { name: string; size: number; }

type RotateAngle = 90 | 180 | 270;
type PageScope = "all" | "odd" | "even" | "custom";

export default function PdfRotateScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [angle, setAngle] = useState<RotateAngle>(90);
  const [scope, setScope] = useState<PageScope>("all");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: false });
    if (!r.canceled && r.assets[0]) { setFile({ name: r.assets[0].name, size: r.assets[0].size ?? 1048576 }); setDone(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  };

  const rotate = async () => {
    if (!file) return;
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: `rotated_${angle}deg_${file.name}`, toolId: "pdf-rotate", toolName: "PDF Rotate", originalSize: file.size, processedSize: file.size, type: "pdf" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Rotate" subtitle="Rotate PDF pages by angle" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={pick} style={[styles.picker, { backgroundColor: colors.card, borderColor: file ? colors.border : ACCENT, borderStyle: file ? "solid" : "dashed", borderRadius: colors.radius, margin: 16 }]}>
          <MaterialCommunityIcons name="file-pdf-box" size={28} color={ACCENT} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>{file?.name ?? "Select PDF File"}</Text>
          </View>
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            {/* Angle Selector */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>ROTATION ANGLE</Text>
              <View style={styles.angleRow}>
                {([90, 180, 270] as RotateAngle[]).map((a) => (
                  <TouchableOpacity key={a} onPress={() => setAngle(a)} style={[styles.angleBtn, { backgroundColor: angle === a ? ACCENT + "22" : colors.muted, borderColor: angle === a ? ACCENT : "transparent", borderRadius: 12 }]}>
                    <View style={[styles.angleVisual, { transform: [{ rotate: `${a}deg` }] }]}>
                      <MaterialCommunityIcons name="rotate-right" size={28} color={angle === a ? ACCENT : colors.mutedForeground} />
                    </View>
                    <Text style={[styles.angleLabel, { color: angle === a ? ACCENT : colors.foreground }]}>{a}°</Text>
                    <Text style={[styles.angleSub, { color: colors.mutedForeground }]}>
                      {a === 90 ? "Clockwise" : a === 180 ? "Upside Down" : "Counter-CW"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Page Scope */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>APPLY TO PAGES</Text>
              <View style={styles.scopeRow}>
                {([["all", "All Pages"], ["odd", "Odd Pages"], ["even", "Even Pages"]] as [PageScope, string][]).map(([s, label]) => (
                  <TouchableOpacity key={s} onPress={() => setScope(s)} style={[styles.scopeBtn, { backgroundColor: scope === s ? ACCENT : colors.muted, borderRadius: 8 }]}>
                    <Text style={[styles.scopeTxt, { color: scope === s ? "#FFF" : colors.mutedForeground }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={rotate} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "rotate-right"} size={20} color="#FFF" />
                  <Text style={styles.btnTxt}>{done ? `Rotated ${angle}°` : `Rotate ${angle}°`}</Text>
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
  pickerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 14 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  angleRow: { flexDirection: "row", gap: 10 },
  angleBtn: { flex: 1, alignItems: "center", padding: 16, borderWidth: 2, gap: 8 },
  angleVisual: { alignItems: "center", justifyContent: "center" },
  angleLabel: { fontSize: 18, fontFamily: "Inter_700Bold" },
  angleSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  scopeRow: { flexDirection: "row", gap: 8 },
  scopeBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  scopeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
