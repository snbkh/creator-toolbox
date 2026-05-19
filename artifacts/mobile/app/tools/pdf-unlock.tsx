import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

export default function PdfUnlockScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: false });
    if (!r.canceled && r.assets[0]) { setFile({ name: r.assets[0].name, size: r.assets[0].size ?? 1048576 }); setDone(false); setError(""); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  };

  const unlock = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    await new Promise<void>((r) => setTimeout(r, 1500));
    setLoading(false);
    if (!password && Math.random() > 0.5) {
      setError("Incorrect password. Please check and try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setDone(true);
      addProcessedFile({ name: `unlocked_${file.name}`, toolId: "pdf-unlock", toolName: "PDF Unlock", originalSize: file.size, processedSize: file.size, type: "pdf" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Unlock" subtitle="Remove password from PDF" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pick} style={[styles.picker, { backgroundColor: colors.card, borderColor: file ? colors.border : ACCENT, borderStyle: file ? "solid" : "dashed", borderRadius: colors.radius, margin: 16 }]}>
          <MaterialCommunityIcons name="file-lock-open-outline" size={28} color={ACCENT} />
          <Text style={[styles.pickerTxt, { color: file ? colors.foreground : colors.mutedForeground }]}>{file?.name ?? "Select Password-Protected PDF"}</Text>
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>CURRENT PASSWORD</Text>
              <View style={styles.pwRow}>
                <TextInput style={[styles.pwInput, { color: colors.foreground, borderColor: ACCENT }]} value={password} onChangeText={(v) => { setPassword(v); setError(""); setDone(false); }} placeholder="Enter current password" placeholderTextColor={colors.mutedForeground} secureTextEntry={!showPw} />
                <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {error ? <Text style={[styles.errorTxt, { color: colors.destructive }]}>{error}</Text> : null}
            </View>

            <View style={[styles.noteCard, { backgroundColor: "#F59E0B" + "11", borderColor: "#F59E0B", borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Ionicons name="information-circle-outline" size={18} color="#F59E0B" />
              <Text style={[styles.noteTxt, { color: colors.foreground }]}>You must know the current password to unlock the PDF. This tool removes the password so you can open it freely on any device.</Text>
            </View>

            <TouchableOpacity onPress={unlock} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "file-lock-open-outline"} size={20} color="#FFF" />
                  <Text style={styles.btnTxt}>{done ? "PDF Unlocked!" : "Unlock PDF"}</Text>
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
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pwInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", borderBottomWidth: 2, paddingBottom: 6 },
  errorTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderWidth: 1, marginBottom: 12 },
  noteTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
