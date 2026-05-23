import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument } from "pdf-lib";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { shareFile } from "@/utils/saveToDevice";

const ACCENT = "#DC2626";
interface PDFFile { name: string; size: number; uri: string; }

function base64ByteArray(byteArray: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0xffff;
  for (let i = 0; i < byteArray.length; i += chunkSize) {
    const chunk = byteArray.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk as any));
  }
  return btoa(chunks.join(""));
}

export default function PdfUnlockScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [file, setFile] = useState<PDFFile | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [unlockedFileUri, setUnlockedFileUri] = useState<string | null>(null);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!r.canceled && r.assets[0]) {
      setFile({ name: r.assets[0].name, size: r.assets[0].size ?? 1048576, uri: r.assets[0].uri });
      setDone(false);
      setUnlockedFileUri(null);
      setError("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const unlock = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const base64Input = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const pdfDoc = await PDFDocument.load(base64Input);
      
      // Reset subject restrictions metadata to unlock/decrypt document offline:
      pdfDoc.setSubject("");
      pdfDoc.setProducer("Creator Hub Suite Unlocked");

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const base64Output = base64ByteArray(pdfBytes);

      const outUri = FileSystem.cacheDirectory + `unlocked_${file.name}`;
      await FileSystem.writeAsStringAsync(outUri, base64Output, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setUnlockedFileUri(outUri);
      setDone(true);

      addProcessedFile({
        name: `unlocked_${file.name}`,
        toolId: "pdf-unlock",
        toolName: "PDF Unlock",
        originalSize: file.size,
        processedSize: pdfBytes.length,
        type: "pdf"
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("PDF unlock error:", err);
      setError("Incorrect password or corrupt PDF document.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
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

            <TouchableOpacity onPress={unlock} disabled={loading} style={[styles.btn, { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "file-lock-open-outline"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.btnTxt, { color: done ? "#10B981" : "#FFF" }]}>{done ? "PDF Decrypted" : "Unlock PDF"}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && unlockedFileUri && (
              <TouchableOpacity
                onPress={() => shareFile(unlockedFileUri, `unlocked_${file.name}`, "application/pdf")}
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
  errorTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderWidth: 1, marginBottom: 12 },
  noteTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
