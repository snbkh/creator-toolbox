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

type Mode = "format" | "minify" | "validate";

export default function JsonFormatterScreen() {
  const colors = useColors();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("format");
  const [indent, setIndent] = useState(2);

  const process = () => {
    if (!input.trim()) return;
    setError("");
    setOutput("");
    try {
      const parsed = JSON.parse(input);
      if (mode === "minify") {
        setOutput(JSON.stringify(parsed));
      } else {
        setOutput(JSON.stringify(parsed, null, indent));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const validate = () => {
    if (!input.trim()) return;
    setError("");
    try {
      JSON.parse(input);
      setOutput("Valid JSON");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const copyOutput = async () => {
    if (!output) return;
    await Clipboard.setStringAsync(output);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const modes: { key: Mode; label: string }[] = [
    { key: "format", label: "Format" },
    { key: "minify", label: "Minify" },
    { key: "validate", label: "Validate" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="JSON Formatter"
        subtitle="Format, minify and validate JSON"
        accentColor="#0EA5E9"
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Mode Tabs */}
        <View style={[styles.modeBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMode(m.key)}
              style={[
                styles.modeBtn,
                {
                  backgroundColor:
                    mode === m.key ? colors.primary : "transparent",
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  {
                    color:
                      mode === m.key
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Indent selector (format only) */}
        {mode === "format" && (
          <View style={styles.indentRow}>
            <Text style={[styles.indentLabel, { color: colors.mutedForeground }]}>
              Indent:
            </Text>
            {[2, 4].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setIndent(n)}
                style={[
                  styles.indentBtn,
                  {
                    backgroundColor:
                      indent === n ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: 8,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.indentBtnText,
                    {
                      color:
                        indent === n
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {n} spaces
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={[styles.section, { marginHorizontal: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            INPUT JSON
          </Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.card,
                borderColor: error ? colors.destructive : colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <TextInput
              style={[styles.codeInput, { color: colors.foreground }]}
              value={input}
              onChangeText={setInput}
              placeholder='{"key": "value"}'
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              scrollEnabled={false}
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={mode === "validate" ? validate : process}
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              marginHorizontal: 16,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>
            {mode === "format"
              ? "Format JSON"
              : mode === "minify"
              ? "Minify JSON"
              : "Validate JSON"}
          </Text>
        </TouchableOpacity>

        {/* Error */}
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

        {/* Output */}
        {output ? (
          <View style={[styles.section, { marginHorizontal: 16 }]}>
            <View style={styles.outputHeader}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                OUTPUT
              </Text>
              <TouchableOpacity onPress={copyOutput} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
                <Text style={[styles.copyText, { color: colors.primary }]}>
                  Copy
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.outputBox,
                {
                  backgroundColor: colors.card,
                  borderColor: "#10B981",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[
                  styles.outputText,
                  { color: output === "Valid JSON" ? "#10B981" : colors.foreground },
                ]}
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
  modeBar: {
    flexDirection: "row",
    margin: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  modeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  indentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  indentLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  indentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  indentBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
    minHeight: 140,
  },
  codeInput: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    minHeight: 120,
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
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
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
