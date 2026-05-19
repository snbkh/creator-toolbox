import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

type Mode = "encode" | "decode";

export default function Base64ToolScreen() {
  const colors = useColors();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("encode");

  const process = () => {
    if (!input.trim()) return;
    setError("");
    setOutput("");
    try {
      if (mode === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError(
        mode === "encode"
          ? "Failed to encode input"
          : "Invalid Base64 string"
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const copyOutput = async () => {
    if (!output) return;
    await Clipboard.setStringAsync(output);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const swapMode = () => {
    setMode((m) => (m === "encode" ? "decode" : "encode"));
    if (output) {
      setInput(output);
      setOutput("");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Base64"
        subtitle="Encode and decode Base64 text"
        accentColor="#F59E0B"
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Mode Toggle */}
        <View style={[styles.modeContainer, { marginHorizontal: 16 }]}>
          <View
            style={[
              styles.modeBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            {(["encode", "decode"] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  setMode(m);
                  setOutput("");
                  setError("");
                }}
                style={[
                  styles.modeBtn,
                  {
                    backgroundColor:
                      mode === m ? "#F59E0B" : "transparent",
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    {
                      color:
                        mode === m ? "#FFFFFF" : colors.mutedForeground,
                    },
                  ]}
                >
                  {m === "encode" ? "Encode" : "Decode"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {output && (
            <TouchableOpacity
              onPress={swapMode}
              style={[
                styles.swapBtn,
                {
                  backgroundColor: colors.muted,
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Ionicons name="swap-vertical" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Input */}
        <View style={[styles.section, { marginHorizontal: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {mode === "encode" ? "PLAIN TEXT" : "BASE64 INPUT"}
          </Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <TextInput
              style={[styles.textArea, { color: colors.foreground }]}
              value={input}
              onChangeText={setInput}
              placeholder={
                mode === "encode"
                  ? "Enter text to encode..."
                  : "Enter Base64 to decode..."
              }
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              scrollEnabled={false}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={process}
          style={[
            styles.actionBtn,
            {
              backgroundColor: "#F59E0B",
              borderRadius: colors.radius,
              marginHorizontal: 16,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: "#FFFFFF" }]}>
            {mode === "encode" ? "Encode to Base64" : "Decode from Base64"}
          </Text>
        </TouchableOpacity>

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.destructive + "22",
                borderRadius: colors.radius,
                marginHorizontal: 16,
              },
            ]}
          >
            <Ionicons name="warning-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {output ? (
          <View style={[styles.section, { marginHorizontal: 16 }]}>
            <View style={styles.outputHeader}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {mode === "encode" ? "BASE64 OUTPUT" : "DECODED TEXT"}
              </Text>
              <TouchableOpacity onPress={copyOutput} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={16} color="#F59E0B" />
                <Text style={[styles.copyText, { color: "#F59E0B" }]}>
                  Copy
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.outputBox,
                {
                  backgroundColor: colors.card,
                  borderColor: "#F59E0B",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[styles.outputText, { color: colors.foreground }]}
                selectable
              >
                {output}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 16,
  },
  modeBar: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  modeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  swapBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 12,
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  inputBox: {
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
  },
  textArea: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    minHeight: 100,
  },
  actionBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  actionText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  outputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  outputBox: {
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
  },
  outputText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
