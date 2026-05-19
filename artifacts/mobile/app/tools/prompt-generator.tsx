import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { generateWithAi } from "@/utils/ai";

const ACCENT = "#22D3EE";

type PromptType = "image" | "chatgpt" | "midjourney" | "dalle";
type ArtStyle = "photorealistic" | "anime" | "oil_painting" | "watercolor" | "digital_art" | "sketch" | "3d_render" | "pixel_art";
type Mood = "cinematic" | "dreamy" | "dark" | "vibrant" | "minimalist" | "epic";

const STYLES: { id: ArtStyle; label: string }[] = [
  { id: "photorealistic", label: "Photorealistic" },
  { id: "anime", label: "Anime" },
  { id: "oil_painting", label: "Oil Painting" },
  { id: "watercolor", label: "Watercolor" },
  { id: "digital_art", label: "Digital Art" },
  { id: "sketch", label: "Sketch" },
  { id: "3d_render", label: "3D Render" },
  { id: "pixel_art", label: "Pixel Art" },
];

const MOODS: { id: Mood; label: string }[] = [
  { id: "cinematic", label: "Cinematic" },
  { id: "dreamy", label: "Dreamy" },
  { id: "dark", label: "Dark" },
  { id: "vibrant", label: "Vibrant" },
  { id: "minimalist", label: "Minimalist" },
  { id: "epic", label: "Epic" },
];

const TYPES: { id: PromptType; label: string; desc: string }[] = [
  { id: "midjourney", label: "Midjourney", desc: "Optimized for /imagine" },
  { id: "dalle", label: "DALL·E", desc: "OpenAI image generation" },
  { id: "image", label: "Generic AI", desc: "Works with any AI" },
  { id: "chatgpt", label: "ChatGPT", desc: "Conversation prompts" },
];

const STYLE_SUFFIXES: Record<ArtStyle, string> = {
  photorealistic: "photorealistic, hyper-detailed, 8K resolution, DSLR photography",
  anime: "anime style, cel shaded, vibrant colors, studio quality",
  oil_painting: "oil painting, textured canvas, impasto technique, masterpiece",
  watercolor: "watercolor painting, soft edges, translucent layers, artistic",
  digital_art: "digital art, concept art, detailed illustration, professional",
  sketch: "pencil sketch, hand-drawn, detailed line art, artistic",
  "3d_render": "3D render, octane render, ray tracing, studio lighting, 4K",
  pixel_art: "pixel art, 16-bit style, retro aesthetic, clean pixels",
};

const MOOD_SUFFIXES: Record<Mood, string> = {
  cinematic: "cinematic lighting, film grain, dramatic shadows, movie scene",
  dreamy: "soft lighting, ethereal atmosphere, pastel tones, magical",
  dark: "dark atmosphere, moody lighting, shadows, noir style",
  vibrant: "vibrant colors, saturated, energetic, bold palette",
  minimalist: "minimalist, clean composition, negative space, simple",
  epic: "epic scale, dramatic composition, heroic, breathtaking",
};

function buildPrompt(subject: string, style: ArtStyle, mood: Mood, extras: string, type: PromptType): string {
  const s = subject.trim() || "a beautiful landscape";
  const styleSuffix = STYLE_SUFFIXES[style];
  const moodSuffix = MOOD_SUFFIXES[mood];
  const ex = extras.trim() ? `, ${extras.trim()}` : "";

  if (type === "midjourney") {
    return `${s}, ${styleSuffix}, ${moodSuffix}${ex} --ar 16:9 --q 2 --v 6`;
  }
  if (type === "chatgpt") {
    return `You are an expert ${style.replace(/_/g, " ")} artist. Create a detailed description of: ${s}. The tone should be ${mood}. ${extras ? `Additional context: ${extras}` : ""} Please provide a vivid, detailed response that captures the essence and atmosphere.`;
  }
  return `${s}, ${styleSuffix}, ${moodSuffix}${ex}, highly detailed, best quality`;
}

export default function PromptGeneratorScreen() {
  const colors = useColors();
  const { selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey } = useApp();
  const [subject, setSubject] = useState("");
  const [style, setStyle] = useState<ArtStyle>("photorealistic");
  const [mood, setMood] = useState<Mood>("cinematic");
  const [extras, setExtras] = useState("");
  const [type, setType] = useState<PromptType>("midjourney");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const fallback = () => [buildPrompt(subject, style, mood, extras, type)];
    
    const systemInstruction = `You are an expert AI prompt engineer. Write a single, highly detailed, optimized, and creative prompt for ${type === "midjourney" ? "Midjourney" : type === "dalle" ? "DALL-E" : type === "chatgpt" ? "ChatGPT" : "an AI generator"} based on the subject, art style, and mood provided.
Provide the output strictly as a JSON array of 1 string element containing the prompt, like this:
["the generated detailed prompt goes here"]
Do not include any markdown format blocks, additional explanations, or other texts. Just return the JSON array.`;
    
    const userPrompt = `Subject: "${subject || "Any creative scene"}"\nArt Style: "${style}"\nMood/Atmosphere: "${mood}"\nExtras: "${extras}"\nType: "${type}"`;
    
    const results = await generateWithAi(
      systemInstruction,
      userPrompt,
      { provider: selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey },
      fallback
    );
    
    setPrompt(results[0] || "");
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copy = async () => {
    await Clipboard.setStringAsync(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Prompt Generator" subtitle="Generate AI art & chat prompts" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Type */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.typeBar, { paddingHorizontal: 16, paddingVertical: 14 }]}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setType(t.id)} style={[styles.typeChip, { backgroundColor: type === t.id ? ACCENT : colors.card, borderColor: type === t.id ? ACCENT : colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.typeLabel, { color: type === t.id ? "#000" : colors.foreground }]}>{t.label}</Text>
              <Text style={[styles.typeDesc, { color: type === t.id ? "rgba(0,0,0,0.6)" : colors.mutedForeground }]}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SUBJECT / IDEA</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: ACCENT }]} value={subject} onChangeText={setSubject} placeholder="e.g. a warrior in neon cyberpunk city..." placeholderTextColor={colors.mutedForeground} multiline />
        </View>

        {type !== "chatgpt" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>ART STYLE</Text>
              <View style={styles.grid}>
                {STYLES.map((s) => (
                  <TouchableOpacity key={s.id} onPress={() => setStyle(s.id)} style={[styles.gridBtn, { backgroundColor: style === s.id ? ACCENT + "22" : colors.muted, borderColor: style === s.id ? ACCENT : "transparent", borderRadius: 8 }]}>
                    <Text style={[styles.gridTxt, { color: style === s.id ? ACCENT : colors.foreground }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>MOOD / ATMOSPHERE</Text>
              <View style={styles.moodRow}>
                {MOODS.map((m) => (
                  <TouchableOpacity key={m.id} onPress={() => setMood(m.id)} style={[styles.moodBtn, { backgroundColor: mood === m.id ? ACCENT : colors.muted, borderRadius: 8 }]}>
                    <Text style={[styles.moodTxt, { color: mood === m.id ? "#000" : colors.mutedForeground }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>ADDITIONAL DETAILS (OPTIONAL)</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={extras} onChangeText={setExtras} placeholder="e.g. golden hour, close-up, bokeh..." placeholderTextColor={colors.mutedForeground} />
        </View>

        <TouchableOpacity
          onPress={generate}
          disabled={loading}
          style={[styles.genBtn, { backgroundColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#000" />
              <Text style={[styles.genBtnTxt, { color: "#000" }]}>Generate Prompt</Text>
            </>
          )}
        </TouchableOpacity>

        {prompt ? (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <Text style={[styles.resultTitle, { color: ACCENT }]}>Generated Prompt</Text>
            <Text style={[styles.resultTxt, { color: colors.foreground }]} selectable>{prompt}</Text>
            <TouchableOpacity onPress={copy} style={[styles.copyBtn, { backgroundColor: copied ? "#10B981" : ACCENT + "22", borderRadius: 8 }]}>
              <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={copied ? "#10B981" : ACCENT} />
              <Text style={[styles.copyTxt, { color: copied ? "#10B981" : ACCENT }]}>{copied ? "Copied!" : "Copy Prompt"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  typeBar: { gap: 10 },
  typeChip: { borderWidth: 1, padding: 12, width: 130, gap: 3 },
  typeLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  typeDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", borderBottomWidth: 1.5, paddingBottom: 6, minHeight: 36 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5 },
  gridTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  moodTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, marginBottom: 16 },
  genBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  resultCard: { borderWidth: 2, padding: 16, gap: 12, marginBottom: 16 },
  resultTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  resultTxt: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "flex-start" },
  copyTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
