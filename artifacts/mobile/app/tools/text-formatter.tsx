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

interface Transformation {
  label: string;
  fn: (t: string) => string;
  color: string;
}

const TRANSFORMS: Transformation[] = [
  {
    label: "UPPERCASE",
    fn: (t) => t.toUpperCase(),
    color: "#8B5CF6",
  },
  {
    label: "lowercase",
    fn: (t) => t.toLowerCase(),
    color: "#0EA5E9",
  },
  {
    label: "Title Case",
    fn: (t) =>
      t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
    color: "#F59E0B",
  },
  {
    label: "Sentence case",
    fn: (t) =>
      t
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()),
    color: "#10B981",
  },
  {
    label: "camelCase",
    fn: (t) =>
      t
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase()),
    color: "#EC4899",
  },
  {
    label: "snake_case",
    fn: (t) =>
      t
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, ""),
    color: "#F97316",
  },
  {
    label: "kebab-case",
    fn: (t) =>
      t
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    color: "#06B6D4",
  },
  {
    label: "Remove Spaces",
    fn: (t) => t.replace(/\s+/g, ""),
    color: "#EF4444",
  },
  {
    label: "Reverse Text",
    fn: (t) => t.split("").reverse().join(""),
    color: "#8B5CF6",
  },
  {
    label: "Remove Extra Spaces",
    fn: (t) => t.replace(/\s+/g, " ").trim(),
    color: "#0EA5E9",
  },
  {
    label: "Remove Line Breaks",
    fn: (t) => t.replace(/\n/g, " "),
    color: "#F59E0B",
  },
  {
    label: "Trim Each Line",
    fn: (t) =>
      t
        .split("\n")
        .map((l) => l.trim())
        .join("\n"),
    color: "#10B981",
  },
];

export default function TextFormatterScreen() {
  const colors = useColors();
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [activeLabel, setActiveLabel] = useState("");

  const apply = (t: Transformation) => {
    if (!text.trim()) return;
    setResult(t.fn(text));
    setActiveLabel(t.label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const copyResult = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const useResult = () => {
    if (result) {
      setText(result);
      setResult("");
      setActiveLabel("");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Text Formatter"
        subtitle="Transform text case and format"
        accentColor="#10B981"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input */}
        <View style={[styles.section, { marginHorizontal: 16, marginTop: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>INPUT</Text>
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
              value={text}
              onChangeText={(v) => {
                setText(v);
                setResult("");
                setActiveLabel("");
              }}
              placeholder="Enter text to transform..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>
        </View>

        {/* Transformations */}
        <View style={styles.section}>
          <Text
            style={[
              styles.label,
              { color: colors.mutedForeground, marginHorizontal: 16 },
            ]}
          >
            TRANSFORMATIONS
          </Text>
          <View style={styles.grid}>
            {TRANSFORMS.map((t) => (
              <TouchableOpacity
                key={t.label}
                onPress={() => apply(t)}
                style={[
                  styles.transformBtn,
                  {
                    backgroundColor:
                      activeLabel === t.label
                        ? t.color + "33"
                        : colors.card,
                    borderColor:
                      activeLabel === t.label ? t.color : colors.border,
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.transformLabel,
                    {
                      color:
                        activeLabel === t.label ? t.color : colors.foreground,
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Output */}
        {result ? (
          <View style={[styles.section, { marginHorizontal: 16 }]}>
            <View style={styles.outputHeader}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                RESULT
              </Text>
              <View style={styles.outputActions}>
                <TouchableOpacity onPress={useResult} style={styles.actionChip}>
                  <Ionicons
                    name="arrow-up-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[styles.chipText, { color: colors.primary }]}>
                    Use
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={copyResult}
                  style={styles.actionChip}
                >
                  <Ionicons
                    name="copy-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[styles.chipText, { color: colors.primary }]}>
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={[
                styles.outputBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[styles.outputText, { color: colors.foreground }]}
                selectable
              >
                {result}
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
  section: { marginBottom: 16, gap: 8 },
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
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 100,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  transformBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  transformLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  outputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  outputActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  outputBox: {
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
  },
  outputText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
