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

const ACCENT = "#EC4899";

type Platform = "instagram" | "twitter" | "linkedin" | "youtube" | "tiktok";
type Tone = "professional" | "creative" | "minimalist" | "funny";

const PLATFORMS: { id: Platform; label: string; maxChars: number }[] = [
  { id: "instagram", label: "Instagram", maxChars: 150 },
  { id: "twitter", label: "Twitter/X", maxChars: 160 },
  { id: "linkedin", label: "LinkedIn", maxChars: 200 },
  { id: "youtube", label: "YouTube", maxChars: 1000 },
  { id: "tiktok", label: "TikTok", maxChars: 80 },
];

const TONES: { id: Tone; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "creative", label: "Creative" },
  { id: "minimalist", label: "Minimalist" },
  { id: "funny", label: "Funny" },
];

function generateBio(name: string, role: string, niche: string, cta: string, platform: Platform, tone: Tone): string[] {
  const n = name.trim() || "Creator";
  const r = role.trim() || "Content Creator";
  const ni = niche.trim() || "lifestyle";
  const c = cta.trim() || "DM for collabs";

  const bios: Record<Tone, Record<Platform, string[]>> = {
    professional: {
      instagram: [
        `${r} | ${ni} enthusiast\nHelping people through quality ${ni} content\n${c} 👇`,
        `📍 ${r}\n✨ Creating value through ${ni}\n📧 ${c}`,
      ],
      twitter: [
        `${r} | Talking about ${ni} every day | ${c}`,
        `Building in public | ${r} focused on ${ni} | ${c}`,
      ],
      linkedin: [
        `${r} with a passion for ${ni}. I help audiences understand the latest trends in ${ni} through clear, actionable content. ${c}.`,
        `Results-driven ${r} specializing in ${ni}. Committed to sharing insights that move the industry forward. ${c}.`,
      ],
      youtube: [
        `Welcome to my channel! I'm ${n}, a ${r} sharing everything about ${ni}.\n\nHere you'll find in-depth guides, reviews, and tips on ${ni}.\n\nJoin our community: ${c}`,
      ],
      tiktok: [`${r} | ${ni} tips daily | ${c}`],
    },
    creative: {
      instagram: [
        `✨ ${r} with a twist\n🌙 Making ${ni} look effortless\n💌 ${c}`,
        `Chasing stories through ${ni} 📸\n${r} by day, dreamer always\n→ ${c}`,
      ],
      twitter: [
        `Creating magic through ${ni} | ${r} | ${c}`,
        `${ni} is my language. ${r} is my title. Creativity is my game. | ${c}`,
      ],
      linkedin: [
        `${r} who believes ${ni} has the power to transform how we work and live. Currently creating content that bridges creativity and impact. | ${c}`,
      ],
      youtube: [
        `Hey, I'm ${n} — a ${r} who fell in love with ${ni} and never looked back.\n\nThis channel is where creativity meets ${ni}. Expect real, unfiltered content.\n\n${c}`,
      ],
      tiktok: [`Making ${ni} fun 🎨 | ${r} | ${c}`],
    },
    minimalist: {
      instagram: [
        `${r}. ${ni}.\n${c}`,
        `${ni} content by ${n}.\n${c}`,
      ],
      twitter: [
        `${r}. ${ni}. ${c}`,
        `${ni} | ${c}`,
      ],
      linkedin: [`${r}. Focused on ${ni}. ${c}.`],
      youtube: [`${r}. ${ni} content.\n${c}`],
      tiktok: [`${r} · ${ni} · ${c}`],
    },
    funny: {
      instagram: [
        `Professional ${ni} enthusiast (self-titled)\n${r} by accident\nSlide in if: ${c} 📩`,
        `I make ${ni} content so you don't have to figure it out alone 😅\n${r} | ${c}`,
      ],
      twitter: [
        `${r} who Googles "${ni}" and calls it research | ${c}`,
        `Just a ${r} trying to make sense of ${ni} one post at a time | ${c}`,
      ],
      linkedin: [
        `${r} who takes ${ni} extremely seriously (mostly). Sharing what I learn so we can all be less confused about ${ni}. ${c}.`,
      ],
      youtube: [
        `I'm ${n}. I make ${ni} videos because someone has to.\n\nSubscribe if you want to learn ${ni} without falling asleep.\n\n${c}`,
      ],
      tiktok: [`${ni} but make it fun 😂 | ${r} | ${c}`],
    },
  };

  return bios[tone][platform] ?? [bios[tone].instagram[0]!];
}

export default function BioGeneratorScreen() {
  const colors = useColors();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [niche, setNiche] = useState("");
  const [cta, setCta] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [tone, setTone] = useState<Tone>("creative");
  const [bios, setBios] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const generate = () => {
    const results = generateBio(name, role, niche, cta, platform, tone);
    setBios(results);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copy = async (text: string, i: number) => {
    await Clipboard.setStringAsync(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const maxChars = PLATFORMS.find((p) => p.id === platform)?.maxChars ?? 150;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Bio Generator" subtitle="Write compelling social media bios" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
          {[
            { label: "YOUR NAME", val: name, set: setName, ph: "e.g. Rahul Sharma" },
            { label: "ROLE / TITLE", val: role, set: setRole, ph: "e.g. Fitness Coach, Travel Blogger" },
            { label: "NICHE / TOPIC", val: niche, set: setNiche, ph: "e.g. fitness, photography, finance" },
            { label: "CALL TO ACTION", val: cta, set: setCta, ph: "e.g. DM for collabs, Link in bio" },
          ].map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{field.label}</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: ACCENT }]}
                value={field.val}
                onChangeText={field.set}
                placeholder={field.ph}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>PLATFORM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => setPlatform(p.id)} style={[styles.chip, { backgroundColor: platform === p.id ? ACCENT : colors.muted, borderRadius: 8 }]}>
                <Text style={[styles.chipTxt, { color: platform === p.id ? "#FFF" : colors.mutedForeground }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.charLimit, { color: colors.mutedForeground }]}>Max {maxChars} characters for {PLATFORMS.find((p) => p.id === platform)?.label}</Text>

          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>TONE</Text>
          <View style={styles.toneRow}>
            {TONES.map((t) => (
              <TouchableOpacity key={t.id} onPress={() => setTone(t.id)} style={[styles.toneBtn, { backgroundColor: tone === t.id ? ACCENT + "22" : colors.muted, borderColor: tone === t.id ? ACCENT : "transparent", borderRadius: 8 }]}>
                <Text style={[styles.toneTxt, { color: tone === t.id ? ACCENT : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={generate} style={[styles.genBtn, { backgroundColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <Ionicons name="sparkles-outline" size={18} color="#FFF" />
          <Text style={styles.genBtnTxt}>Generate Bio</Text>
        </TouchableOpacity>

        {bios.length > 0 && bios.map((bio, i) => (
          <View key={i} style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <Text style={[styles.bioTxt, { color: colors.foreground }]}>{bio}</Text>
            <View style={styles.bioFooter}>
              <Text style={[styles.charCount, { color: bio.length > maxChars ? "#EF4444" : colors.mutedForeground }]}>{bio.length}/{maxChars}</Text>
              <TouchableOpacity onPress={() => copy(bio, i)} style={styles.copyBtn}>
                <Ionicons name={copied === i ? "checkmark-circle" : "copy-outline"} size={18} color={copied === i ? "#10B981" : ACCENT} />
                <Text style={[styles.copyTxt, { color: copied === i ? "#10B981" : ACCENT }]}>{copied === i ? "Copied!" : "Copy"}</Text>
              </TouchableOpacity>
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
  card: { borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  fieldGroup: { gap: 6 },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", borderBottomWidth: 1.5, paddingBottom: 6 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  charLimit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  toneRow: { flexDirection: "row", gap: 8 },
  toneBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderWidth: 1.5 },
  toneTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, marginBottom: 16 },
  genBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  bioCard: { borderWidth: 1, padding: 16, gap: 12, marginBottom: 10 },
  bioTxt: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bioFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  charCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
