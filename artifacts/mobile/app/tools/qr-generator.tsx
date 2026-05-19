import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";
import { saveImageToDevice } from "@/utils/saveToDevice";

const PRESETS = [
  { label: "URL", placeholder: "https://example.com" },
  { label: "Email", placeholder: "hello@example.com" },
  { label: "Phone", placeholder: "+1234567890" },
  { label: "WiFi", placeholder: "WIFI:T:WPA;S:NetworkName;P:password;;" },
  { label: "Text", placeholder: "Enter any text..." },
];

const QR_SIZES = [
  { label: "Small", value: 150 },
  { label: "Medium", value: 250 },
  { label: "Large", value: 400 },
];

export default function QrGeneratorScreen() {
  const colors = useColors();
  const [text, setText] = useState("");
  const [qrContent, setQrContent] = useState("");
  const [preset, setPreset] = useState(0);
  const [size, setSize] = useState(250);
  const [bgColor, setBgColor] = useState("ffffff");
  const [fgColor, setFgColor] = useState("000000");
  const [saving, setSaving] = useState(false);

  const generate = () => {
    if (!text.trim()) return;
    Keyboard.dismiss();
    setQrContent(text.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const qrUrl = qrContent
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrContent)}&bgcolor=${bgColor}&color=${fgColor}&margin=2`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="QR Generator"
        subtitle="Generate QR codes instantly"
        accentColor="#0EA5E9"
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Preset selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetBar}
        >
          {PRESETS.map((p, i) => (
            <TouchableOpacity
              key={p.label}
              onPress={() => {
                setPreset(i);
                setText("");
                setQrContent("");
              }}
              style={[
                styles.presetChip,
                {
                  backgroundColor: preset === i ? "#0EA5E9" : colors.card,
                  borderColor: preset === i ? "#0EA5E9" : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: preset === i ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputCard, { marginHorizontal: 16, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={text}
            onChangeText={setText}
            placeholder={PRESETS[preset].placeholder}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={generate}
            returnKeyType="done"
          />
        </View>

        {/* Size selector */}
        <View style={styles.sizeRow}>
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>SIZE</Text>
          {QR_SIZES.map((s) => (
            <TouchableOpacity
              key={s.value}
              onPress={() => setSize(s.value)}
              style={[
                styles.sizeChip,
                {
                  backgroundColor: size === s.value ? "#0EA5E9" + "22" : colors.card,
                  borderColor: size === s.value ? "#0EA5E9" : colors.border,
                  borderRadius: 8,
                },
              ]}
            >
              <Text
                style={[
                  styles.sizeText,
                  { color: size === s.value ? "#0EA5E9" : colors.foreground },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color options */}
        <View style={styles.colorRow}>
          <View style={styles.colorOption}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>BACKGROUND</Text>
            <View style={styles.colorBtns}>
              {["ffffff", "f0f0f0", "1a1a2e"].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setBgColor(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: `#${c}`,
                      borderColor: bgColor === c ? "#0EA5E9" : colors.border,
                      borderWidth: bgColor === c ? 2 : 1,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.colorOption}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>QR COLOR</Text>
            <View style={styles.colorBtns}>
              {["000000", "1a1a2e", "7c3aed"].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setFgColor(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: `#${c}`,
                      borderColor: fgColor === c ? "#0EA5E9" : colors.border,
                      borderWidth: fgColor === c ? 2 : 1,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={generate}
          disabled={!text.trim()}
          style={[
            styles.genBtn,
            {
              backgroundColor: text.trim() ? "#0EA5E9" : colors.muted,
              borderRadius: colors.radius,
              marginHorizontal: 16,
            },
          ]}
        >
          <Text
            style={[
              styles.genBtnText,
              { color: text.trim() ? "#FFFFFF" : colors.mutedForeground },
            ]}
          >
            Generate QR Code
          </Text>
        </TouchableOpacity>

        {/* QR Display */}
        {qrUrl && (
          <View style={[styles.qrContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <Image
              source={{ uri: qrUrl }}
              style={styles.qrImage}
              contentFit="contain"
              placeholder={
                <View style={styles.qrPlaceholder}>
                  <ActivityIndicator color="#0EA5E9" />
                </View>
              }
            />
            <Text style={[styles.qrContent, { color: colors.mutedForeground }]} numberOfLines={2}>
              {qrContent}
            </Text>

            <TouchableOpacity
              onPress={async () => {
                if (!qrUrl) return;
                setSaving(true);
                const r = await saveImageToDevice(qrUrl, `qr_${Date.now()}.png`);
                setSaving(false);
                if (r === "saved") {
                  Alert.alert("✅ Saved!", "QR Code saved to your gallery in 'Creator Toolbox' album.");
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              }}
              disabled={saving}
              style={[
                styles.saveBtn,
                { backgroundColor: "#10B981", borderRadius: colors.radius, width: "100%", marginTop: 8 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#FFF" />
                  <Text style={styles.saveBtnText}>Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  presetBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  inputCard: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginRight: 4,
  },
  sizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  sizeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  colorRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 20,
    marginBottom: 16,
  },
  colorOption: {
    gap: 8,
  },
  colorBtns: {
    flexDirection: "row",
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  genBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  genBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  qrContainer: {
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  qrContent: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  qrHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
  },
  qrHintText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
});
