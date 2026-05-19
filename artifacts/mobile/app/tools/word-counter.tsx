import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
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

interface Stats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readTime: number;
  lines: number;
}

function computeStats(text: string): Stats {
  if (!text.trim()) {
    return {
      words: 0,
      chars: 0,
      charsNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readTime: 0,
      lines: 0,
    };
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const readTime = Math.max(1, Math.round(words / 200));
  const lines = text.split("\n").length;
  return { words, chars, charsNoSpaces, sentences, paragraphs, readTime, lines };
}

export default function WordCounterScreen() {
  const colors = useColors();
  const [text, setText] = useState("");
  const stats = useMemo(() => computeStats(text), [text]);

  const handleCopy = async () => {
    const report = `Words: ${stats.words}\nCharacters: ${stats.chars}\nSentences: ${stats.sentences}\nRead time: ${stats.readTime} min`;
    await Clipboard.setStringAsync(report);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const statItems = [
    { label: "Words", value: stats.words, color: "#8B5CF6" },
    { label: "Characters", value: stats.chars, color: "#0EA5E9" },
    { label: "No Spaces", value: stats.charsNoSpaces, color: "#22D3EE" },
    { label: "Sentences", value: stats.sentences, color: "#F59E0B" },
    { label: "Paragraphs", value: stats.paragraphs, color: "#10B981" },
    { label: "Lines", value: stats.lines, color: "#EC4899" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Word Counter"
        subtitle="Count words, characters & more"
        accentColor="#8B5CF6"
        rightElement={
          <TouchableOpacity onPress={handleCopy}>
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statItems.map((s) => (
            <View
              key={s.label}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.statValue, { color: s.color }]}>
                {s.value.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Reading Time */}
        <View
          style={[
            styles.readBadge,
            {
              backgroundColor: "#8B5CF6" + "22",
              borderRadius: colors.radius,
              marginHorizontal: 16,
            },
          ]}
        >
          <Ionicons name="time-outline" size={18} color="#8B5CF6" />
          <Text style={[styles.readText, { color: "#8B5CF6" }]}>
            ~{stats.readTime} min read
          </Text>
        </View>

        {/* Text Input */}
        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              marginHorizontal: 16,
            },
          ]}
        >
          <TextInput
            style={[styles.textArea, { color: colors.foreground }]}
            placeholder="Paste or type your text here..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </View>

        {/* Clear */}
        {text.length > 0 && (
          <TouchableOpacity
            onPress={() => setText("")}
            style={[
              styles.clearBtn,
              {
                borderColor: colors.border,
                borderRadius: colors.radius,
                marginHorizontal: 16,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.clearText, { color: colors.mutedForeground }]}>
              Clear Text
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 10,
  },
  statCard: {
    width: "30.5%",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  readBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    marginBottom: 12,
  },
  readText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  inputCard: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    minHeight: 200,
  },
  textArea: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 180,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
