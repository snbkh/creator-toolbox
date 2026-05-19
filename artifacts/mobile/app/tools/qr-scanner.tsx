import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#22D3EE";

interface ScanResult {
  id: string;
  data: string;
  type: "url" | "text" | "email" | "phone" | "wifi";
  timestamp: number;
}

function detectType(data: string): ScanResult["type"] {
  if (/^https?:\/\//i.test(data)) return "url";
  if (/^mailto:/i.test(data) || /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(data)) return "email";
  if (/^tel:|^\+?[\d\s\-()]{7,}$/.test(data)) return "phone";
  if (/^WIFI:/i.test(data)) return "wifi";
  return "text";
}

const TYPE_META: Record<ScanResult["type"], { icon: string; color: string; label: string }> = {
  url: { icon: "link", color: "#0EA5E9", label: "URL" },
  text: { icon: "text", color: ACCENT, label: "Text" },
  email: { icon: "mail-outline", color: "#10B981", label: "Email" },
  phone: { icon: "call-outline", color: "#8B5CF6", label: "Phone" },
  wifi: { icon: "wifi-outline", color: "#F59E0B", label: "WiFi" },
};

const SAMPLE_QRS = [
  { label: "Website", data: "https://example.com" },
  { label: "Email", data: "hello@example.com" },
  { label: "Phone", data: "+91 9876543210" },
  { label: "WiFi", data: "WIFI:T:WPA;S:MyNetwork;P:password123;;" },
];

function formatTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000) return "Just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
}

export default function QrScannerScreen() {
  const colors = useColors();
  const [manualInput, setManualInput] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const addResult = (data: string) => {
    if (!data.trim()) return;
    const result: ScanResult = { id: Date.now().toString(), data: data.trim(), type: detectType(data.trim()), timestamp: Date.now() };
    setResults((prev) => [result, ...prev.slice(0, 19)]);
    setManualInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openResult = (result: ScanResult) => {
    if (result.type === "url") Linking.openURL(result.data);
    else if (result.type === "email") Linking.openURL(`mailto:${result.data}`);
    else if (result.type === "phone") Linking.openURL(`tel:${result.data.replace(/\s/g, "")}`);
    else copy(result.data);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="QR Scanner" subtitle="Scan and decode QR codes" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Camera Scanner Note */}
        <View style={[styles.cameraCard, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: ACCENT }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: ACCENT }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: ACCENT }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: ACCENT }]} />
            <MaterialCommunityIcons name="qrcode-scan" size={60} color={ACCENT} style={{ opacity: 0.4 }} />
          </View>
          <Text style={[styles.cameraTitle, { color: colors.foreground }]}>Point camera at QR code</Text>
          <Text style={[styles.cameraDesc, { color: colors.mutedForeground }]}>Camera scanning requires the Expo Go app. Use your phone's camera app to scan QR codes, or paste the decoded text below.</Text>
        </View>

        {/* Manual Input */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>PASTE QR CODE CONTENT</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: ACCENT, flex: 1 }]}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Paste URL, text, or scanned data..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
            <TouchableOpacity
              onPress={() => addResult(manualInput)}
              disabled={!manualInput.trim()}
              style={[styles.addBtn, { backgroundColor: ACCENT, borderRadius: 10, opacity: !manualInput.trim() ? 0.5 : 1 }]}
            >
              <MaterialCommunityIcons name="check" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>QUICK TEST</Text>
          <View style={styles.sampleRow}>
            {SAMPLE_QRS.map((s) => (
              <TouchableOpacity key={s.label} onPress={() => addResult(s.data)} style={[styles.sampleChip, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                <Text style={[styles.sampleChipTxt, { color: colors.foreground }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results */}
        {results.length > 0 && (
          <View style={{ marginHorizontal: 16, gap: 10 }}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>SCAN HISTORY ({results.length})</Text>
              <TouchableOpacity onPress={() => setResults([])}>
                <Text style={[styles.clearTxt, { color: colors.destructive }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            {results.map((r) => {
              const meta = TYPE_META[r.type];
              return (
                <View key={r.id} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <View style={[styles.typeBadge, { backgroundColor: meta.color + "22", borderRadius: 8 }]}>
                    <Ionicons name={meta.icon as never} size={16} color={meta.color} />
                    <Text style={[styles.typeTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={[styles.resultData, { color: colors.foreground }]} numberOfLines={2}>{r.data}</Text>
                  <View style={styles.resultFooter}>
                    <Text style={[styles.resultTime, { color: colors.mutedForeground }]}>{formatTime(r.timestamp)}</Text>
                    <View style={styles.resultActions}>
                      <TouchableOpacity onPress={() => copy(r.data)} style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                        <Ionicons name={copied === r.data ? "checkmark" : "copy-outline"} size={15} color={copied === r.data ? "#10B981" : colors.mutedForeground} />
                      </TouchableOpacity>
                      {(r.type === "url" || r.type === "email" || r.type === "phone") && (
                        <TouchableOpacity onPress={() => openResult(r)} style={[styles.actionBtn, { backgroundColor: meta.color + "22", borderRadius: 8 }]}>
                          <Ionicons name="open-outline" size={15} color={meta.color} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraCard: { borderWidth: 1.5, padding: 24, alignItems: "center", gap: 12, marginBottom: 12 },
  scanFrame: { width: 140, height: 140, alignItems: "center", justifyContent: "center", position: "relative" },
  corner: { position: "absolute", width: 24, height: 24, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cameraDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", borderBottomWidth: 2, paddingBottom: 6, minHeight: 40 },
  addBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sampleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sampleChip: { paddingHorizontal: 12, paddingVertical: 7 },
  sampleChipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clearTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  resultCard: { borderWidth: 1, padding: 14, gap: 10 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  typeTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  resultData: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  resultFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  resultActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
