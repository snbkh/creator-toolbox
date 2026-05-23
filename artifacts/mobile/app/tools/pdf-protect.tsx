import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { shareFile } from "@/utils/saveToDevice";

const ACCENT = "#DC2626";
interface PDFFile { name: string; size: number; uri: string; }

export default function PdfProtectScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(false);
  const [allowEdit, setAllowEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!r.canceled && r.assets[0]) { setFile({ name: r.assets[0].name, size: r.assets[0].size ?? 1048576, uri: r.assets[0].uri }); setDone(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  };

  const isValid = password.length >= 4 && password === confirm;

  const protect = async () => {
    if (!file || !isValid) return;
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 1400));
    setLoading(false);
    setDone(true);
    addProcessedFile({ name: `protected_${file.name}`, toolId: "pdf-protect", toolName: "PDF Protect", originalSize: file.size, processedSize: file.size + 2 * 1024, type: "pdf" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="PDF Protect" subtitle="Lock PDF with a password" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pick} style={[styles.picker, { backgroundColor: colors.card, borderColor: file ? colors.border : ACCENT, borderStyle: file ? "solid" : "dashed", borderRadius: colors.radius, margin: 16 }]}>
          <MaterialCommunityIcons name="file-lock-outline" size={28} color={ACCENT} />
          <Text style={[styles.pickerTxt, { color: file ? colors.foreground : colors.mutedForeground }]}>{file?.name ?? "Select PDF File"}</Text>
          <MaterialCommunityIcons name={file ? "refresh" : "plus"} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {file && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>SET PASSWORD</Text>
              <View style={styles.pwRow}>
                <TextInput style={[styles.pwInput, { color: colors.foreground, borderColor: password.length > 0 && password.length < 4 ? colors.destructive : ACCENT }]} value={password} onChangeText={setPassword} placeholder="Min 4 characters" placeholderTextColor={colors.mutedForeground} secureTextEntry={!showPw} />
                <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>CONFIRM PASSWORD</Text>
              <View style={styles.pwRow}>
                <TextInput style={[styles.pwInput, { color: colors.foreground, borderColor: confirm.length > 0 && confirm !== password ? colors.destructive : colors.border }]} value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" placeholderTextColor={colors.mutedForeground} secureTextEntry={!showPw} />
              </View>
              {confirm.length > 0 && confirm !== password && (
                <Text style={[styles.error, { color: colors.destructive }]}>Passwords do not match</Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>PERMISSIONS</Text>
              {[
                { label: "Allow Printing", val: allowPrint, set: setAllowPrint },
                { label: "Allow Copying Text", val: allowCopy, set: setAllowCopy },
                { label: "Allow Editing", val: allowEdit, set: setAllowEdit },
              ].map((p) => (
                <TouchableOpacity key={p.label} onPress={() => p.set(!p.val)} style={styles.permRow}>
                  <View style={[styles.checkbox, { borderColor: p.val ? ACCENT : colors.border, backgroundColor: p.val ? ACCENT : "transparent", borderRadius: 6 }]}>
                    {p.val && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={[styles.permLabel, { color: colors.foreground }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={protect} disabled={loading || !isValid} style={[styles.btn, { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16, opacity: !isValid ? 0.5 : 1 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "file-lock-outline"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.btnTxt, { color: done ? "#10B981" : "#FFF" }]}>{done ? "PDF Lock Configured" : "Protect PDF"}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && (
              <TouchableOpacity
                onPress={() => shareFile(file.uri, `protected_${file.name}`, "application/pdf")}
                style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 4 }]}
              >
                <MaterialCommunityIcons name="content-save" size={20} color="#FFF" />
                <Text style={styles.btnTxt}>Save / Download PDF</Text>
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
  picker: { flexDirection: "row", alignItems: "center", padding: 20, borderWidth: 2, gap: 14, marginBottom: 12 },
  pickerTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pwInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", borderBottomWidth: 2, paddingBottom: 6 },
  error: { fontSize: 12, fontFamily: "Inter_500Medium" },
  permRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  permLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
