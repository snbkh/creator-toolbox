import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#F59E0B";

const PLATFORM_LIMITS: { platform: string; char: number; hashtags: number; color: string }[] = [
  { platform: "Twitter/X", char: 280, hashtags: 2, color: "#1DA1F2" },
  { platform: "Instagram", char: 2200, hashtags: 30, color: "#E1306C" },
  { platform: "TikTok", char: 2200, hashtags: 10, color: "#000000" },
  { platform: "LinkedIn", char: 3000, hashtags: 5, color: "#0077B5" },
  { platform: "YouTube Desc", char: 5000, hashtags: 15, color: "#FF0000" },
  { platform: "Facebook", char: 63206, hashtags: 5, color: "#1877F2" },
];

function extractHashtags(text: string): string[] {
  return (text.match(/#\w+/g) ?? []).map((h) => h.toLowerCase());
}

function extractEmojis(text: string): string[] {
  return [...(text.match(/\p{Emoji}/gu) ?? [])];
}

function removeEmojis(text: string): string {
  return text.replace(/\p{Emoji}/gu, "").replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

type Tool = "counter" | "hashtag" | "emoji" | "limits";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "counter", label: "Character Counter", icon: "text-outline" },
  { id: "hashtag", label: "Hashtag Extractor", icon: "pound-outline" as never },
  { id: "emoji", label: "Emoji Manager", icon: "happy-outline" },
  { id: "limits", label: "Platform Limits", icon: "apps-outline" },
];

export default function SocialToolkitScreen() {
  const colors = useColors();
  const [activeTool, setActiveTool] = useState<Tool>("counter");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const hashtags = useMemo(() => extractHashtags(text), [text]);
  const emojis = useMemo(() => extractEmojis(text), [text]);
  const noEmojiText = useMemo(() => removeEmojis(text), [text]);
  const wordCount = useMemo(() => countWords(text), [text]);

  const copy = async (t: string) => {
    await Clipboard.setStringAsync(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Social Media Toolkit" subtitle="Multi-tool for social creators" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Tool Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TOOLS.map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setActiveTool(t.id)} style={[styles.tab, { backgroundColor: activeTool === t.id ? ACCENT : colors.card, borderColor: activeTool === t.id ? ACCENT : colors.border, borderRadius: colors.radius }]}>
              <Ionicons name={t.icon as never} size={16} color={activeTool === t.id ? "#000" : colors.mutedForeground} />
              <Text style={[styles.tabTxt, { color: activeTool === t.id ? "#000" : colors.foreground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTool !== "limits" && (
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <TextInput
              style={[styles.textArea, { color: colors.foreground }]}
              value={text}
              onChangeText={setText}
              placeholder="Paste your social media post here..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Counter Tool */}
        {activeTool === "counter" && (
          <View style={styles.statsGrid}>
            {[
              { label: "Characters", val: text.length, color: ACCENT },
              { label: "Words", val: wordCount, color: "#0EA5E9" },
              { label: "Hashtags", val: hashtags.length, color: "#8B5CF6" },
              { label: "Emojis", val: emojis.length, color: "#EC4899" },
              { label: "Lines", val: text.split("\n").length, color: "#10B981" },
              { label: "Sentences", val: (text.match(/[.!?]+/g) ?? []).length, color: "#F97316" },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Hashtag Extractor */}
        {activeTool === "hashtag" && (
          <View style={[styles.extractCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <View style={styles.extractHeader}>
              <Text style={[styles.extractTitle, { color: colors.foreground }]}>{hashtags.length} hashtags found</Text>
              {hashtags.length > 0 && (
                <TouchableOpacity onPress={() => copy(hashtags.join(" "))} style={styles.copyBtn}>
                  <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={ACCENT} />
                  <Text style={[styles.copyTxt, { color: ACCENT }]}>Copy All</Text>
                </TouchableOpacity>
              )}
            </View>
            {hashtags.length > 0 ? (
              <View style={styles.tagWrap}>
                {hashtags.map((h, i) => (
                  <TouchableOpacity key={i} onPress={() => copy(h)} style={[styles.tag, { backgroundColor: ACCENT + "22", borderRadius: 8 }]}>
                    <Text style={[styles.tagTxt, { color: ACCENT }]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>No hashtags found. Paste text with #hashtags above.</Text>
            )}
          </View>
        )}

        {/* Emoji Manager */}
        {activeTool === "emoji" && (
          <>
            <View style={[styles.extractCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.extractTitle, { color: colors.foreground }]}>{emojis.length} emojis found: {emojis.join(" ")}</Text>
              {noEmojiText !== text && (
                <TouchableOpacity onPress={() => copy(noEmojiText)} style={[styles.removeBtn, { backgroundColor: "#EF4444" + "22", borderRadius: 8 }]}>
                  <Ionicons name={copied ? "checkmark-circle" : "trash-outline"} size={16} color="#EF4444" />
                  <Text style={[styles.removeTxt, { color: "#EF4444" }]}>Copy text without emojis</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Platform Limits */}
        {activeTool === "limits" && (
          <View style={{ marginHorizontal: 16, gap: 10 }}>
            {PLATFORM_LIMITS.map((p) => (
              <View key={p.platform} style={[styles.limitCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.limitDot, { backgroundColor: p.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.limitPlatform, { color: colors.foreground }]}>{p.platform}</Text>
                  <Text style={[styles.limitSpec, { color: colors.mutedForeground }]}>
                    {p.char.toLocaleString()} chars · {p.hashtags} hashtags recommended
                  </Text>
                </View>
                <View style={[styles.charBadge, { backgroundColor: p.color + "22", borderRadius: 8 }]}>
                  <Text style={[styles.charBadgeTxt, { color: p.color }]}>{p.char >= 1000 ? `${p.char / 1000}K` : p.char}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, gap: 6 },
  tabTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputCard: { borderWidth: 1, padding: 14, marginBottom: 12, minHeight: 120 },
  textArea: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, minHeight: 100 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: { width: "30%", padding: 14, alignItems: "center", borderWidth: 1, gap: 4 },
  statVal: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  extractCard: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  extractHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  extractTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6 },
  tagTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyTxt: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 12 },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  removeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  limitCard: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, gap: 12 },
  limitDot: { width: 12, height: 12, borderRadius: 6 },
  limitPlatform: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  limitSpec: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  charBadge: { paddingHorizontal: 10, paddingVertical: 5 },
  charBadgeTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
