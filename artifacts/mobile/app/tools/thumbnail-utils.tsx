import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

const ACCENT = "#EF4444";

const THUMBNAIL_SPECS = [
  { platform: "YouTube", size: "1280×720", format: "JPG/PNG", maxKB: 2048, ratio: "16:9", tips: "Use high contrast, bold text, expressive face" },
  { platform: "YouTube Shorts", size: "1080×1920", format: "JPG/PNG", maxKB: 2048, ratio: "9:16", tips: "Vertical format, text in center 60%" },
  { platform: "Instagram Post", size: "1080×1080", format: "JPG/PNG", maxKB: 1024, ratio: "1:1", tips: "Clean background, minimal text" },
  { platform: "Instagram Story", size: "1080×1920", format: "JPG/PNG", maxKB: 1024, ratio: "9:16", tips: "Keep important content in center 60%" },
  { platform: "TikTok Cover", size: "1080×1920", format: "JPG", maxKB: 1024, ratio: "9:16", tips: "Bold, readable text at top third" },
  { platform: "Facebook Post", size: "1200×630", format: "JPG/PNG", maxKB: 2048, ratio: "1.91:1", tips: "Minimal text for maximum reach" },
];

const BEST_PRACTICES = [
  { tip: "Use high-contrast colors", desc: "Dark background with bright text or vice versa gets 38% more clicks" },
  { tip: "Include a face", desc: "Thumbnails with expressive human faces get 20-30% more clicks" },
  { tip: "Bold, readable text", desc: "Use max 5-7 words in large text (40pt+) that's readable at 100px wide" },
  { tip: "Create curiosity gap", desc: "Tease the content without giving it all away" },
  { tip: "Consistent branding", desc: "Use same colors, fonts, and style across all thumbnails" },
  { tip: "Test A/B thumbnails", desc: "Use YouTube's A/B testing or replace thumbnails every 2 weeks" },
];

const COLOR_COMBOS = [
  { bg: "#000000", text: "#FFFF00", label: "Black + Yellow (Most Clickable)" },
  { bg: "#DC2626", text: "#FFFFFF", label: "Red + White (Urgency)" },
  { bg: "#1E3A5F", text: "#F59E0B", label: "Navy + Gold (Premium)" },
  { bg: "#7C3AED", text: "#FFFFFF", label: "Purple + White (Modern)" },
  { bg: "#FFFFFF", text: "#000000", label: "White + Black (Clean)" },
];

export default function ThumbnailUtilsScreen() {
  const colors = useColors();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Thumbnail Utilities" subtitle="Optimize thumbnails for any platform" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Platform Specs */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Platform Specifications</Text>
        </View>
        {THUMBNAIL_SPECS.map((s) => (
          <TouchableOpacity
            key={s.platform}
            onPress={() => copy(`${s.platform}: ${s.size}px | ${s.ratio} | ${s.format} | Max ${s.maxKB}KB`)}
            style={[styles.specCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}
          >
            <View style={[styles.ratioBadge, { backgroundColor: ACCENT + "22", borderRadius: 8 }]}>
              <Text style={[styles.ratioBadgeTxt, { color: ACCENT }]}>{s.ratio}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.specPlatform, { color: colors.foreground }]}>{s.platform}</Text>
              <Text style={[styles.specDims, { color: colors.mutedForeground }]}>{s.size}px · {s.format} · Max {s.maxKB}KB</Text>
              <Text style={[styles.specTip, { color: colors.mutedForeground }]}>{s.tips}</Text>
            </View>
            <MaterialCommunityIcons name={copied === `${s.platform}: ${s.size}px | ${s.ratio} | ${s.format} | Max ${s.maxKB}KB` ? "check" : "content-copy"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}

        {/* Color Combos */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>High-Converting Color Combos</Text>
        </View>
        {COLOR_COMBOS.map((c) => (
          <View key={c.label} style={[styles.colorCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <View style={[styles.colorPreview, { backgroundColor: c.bg, borderRadius: 8 }]}>
              <Text style={[styles.colorPreviewTxt, { color: c.text }]}>TITLE</Text>
            </View>
            <Text style={[styles.colorLabel, { color: colors.foreground }]}>{c.label}</Text>
          </View>
        ))}

        {/* Best Practices */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Best Practices</Text>
        </View>
        {BEST_PRACTICES.map((b, i) => (
          <View key={i} style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <View style={[styles.tipNum, { backgroundColor: ACCENT }]}><Text style={styles.tipNumTxt}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>{b.tip}</Text>
              <Text style={[styles.tipDesc, { color: colors.mutedForeground }]}>{b.desc}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  specCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderWidth: 1, gap: 12, marginBottom: 8 },
  ratioBadge: { paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  ratioBadgeTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  specPlatform: { fontSize: 14, fontFamily: "Inter_700Bold" },
  specDims: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  specTip: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3, fontStyle: "italic" },
  colorCard: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, gap: 14, marginBottom: 8 },
  colorPreview: { width: 80, height: 45, alignItems: "center", justifyContent: "center" },
  colorPreviewTxt: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  colorLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  tipCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderWidth: 1, gap: 12, marginBottom: 8 },
  tipNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tipNumTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  tipTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tipDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
});
