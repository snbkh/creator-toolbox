import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { generateWithAi } from "@/utils/ai";

const ACCENT = "#EF4444";

type Category = "tutorial" | "vlog" | "review" | "gaming" | "motivation" | "finance" | "tech" | "food";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "tutorial", label: "Tutorial" },
  { id: "vlog", label: "Vlog" },
  { id: "review", label: "Review" },
  { id: "gaming", label: "Gaming" },
  { id: "motivation", label: "Motivation" },
  { id: "finance", label: "Finance" },
  { id: "tech", label: "Tech" },
  { id: "food", label: "Food" },
];

const TITLE_TEMPLATES: Record<Category, string[]> = {
  tutorial: [
    "How to {topic} in {time} (Step-by-Step Guide)",
    "{topic} Tutorial for Beginners 2025 | Complete Guide",
    "I Tried {topic} for 30 Days — Here's What Happened",
    "The ONLY {topic} Video You'll Ever Need",
    "Stop Doing {topic} WRONG — Do This Instead",
    "{topic} Explained in 10 Minutes (2025 Updated)",
  ],
  vlog: [
    "Day in My Life: {topic}",
    "I Spent a Week {topic} — Honest Results",
    "Why I Quit {topic} (Real Talk)",
    "Come with Me to {topic} | Full Vlog",
    "{topic} Vlog | This Changed Everything",
    "24 Hours Doing {topic} — Not What I Expected",
  ],
  review: [
    "I Tested {topic} for 30 Days — My Honest Review",
    "{topic} Review 2025 | Is It Worth the Money?",
    "Brutally Honest {topic} Review After 1 Year",
    "{topic} vs Everything Else — Clear Winner?",
    "Don't Buy {topic} Until You Watch This",
    "The Truth About {topic} Nobody Talks About",
  ],
  gaming: [
    "I Completed {topic} Without Dying (Insane!)",
    "{topic} Is Actually BROKEN — Here's Why",
    "NEW {topic} Update Changed Everything",
    "The HARDEST {topic} Challenge (Almost Impossible)",
    "{topic} Secrets Nobody Knows About",
    "I Beat {topic} on Impossible Mode",
  ],
  motivation: [
    "{topic} Will Change Your Life in 2025",
    "If You're Struggling with {topic}, Watch This",
    "How I Overcame {topic} (My Story)",
    "The ONE {topic} Habit That Changed Everything",
    "Why Most People Fail at {topic} (And How to Win)",
    "Start {topic} Today — Here's Why It Can't Wait",
  ],
  finance: [
    "How I Made ₹{topic} in 1 Month | Real Strategy",
    "{topic} Investment Guide 2025 (Beginners to Pro)",
    "Best {topic} Strategy for Indians in 2025",
    "I Invested ₹10,000 in {topic} — Here's the Result",
    "{topic}: Everything You Need to Know Before Investing",
    "Why {topic} is the Biggest Opportunity Right Now",
  ],
  tech: [
    "{topic} Just Changed Everything — Here's Why",
    "I Used {topic} for 30 Days | Honest Review",
    "{topic} vs Everything Else in 2025",
    "The BEST {topic} Setup for Under ₹50,000",
    "Hidden {topic} Features Most People Don't Know",
    "{topic} Complete Setup Guide 2025",
  ],
  food: [
    "I Made {topic} Every Day for a Week — Results Inside",
    "The BEST {topic} Recipe You'll Ever Try",
    "Restaurant vs Homemade {topic} — Shocking Difference",
    "{topic} in Under 15 Minutes | Quick Recipe",
    "My Grandmother's Secret {topic} Recipe (Finally!)",
    "Street-Style {topic} at Home | Easy & Authentic",
  ],
};

export default function YoutubeTitleScreen() {
  const colors = useColors();
  const { selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey } = useApp();
  const [topic, setTopic] = useState("");
  const [time, setTime] = useState("5 minutes");
  const [category, setCategory] = useState<Category>("tutorial");
  const [titles, setTitles] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    
    const fallback = () => {
      const templates = TITLE_TEMPLATES[category];
      return templates.map((t) => t.replace(/\{topic\}/g, topic.trim()).replace(/\{time\}/g, time));
    };
    
    const systemInstruction = `You are a YouTube growth specialist. Generate exactly 6 click-worthy, engaging, and high-CTR YouTube video titles based on the topic, category, and context provided.
Provide the output strictly as a JSON array of strings, like this:
["title option 1", "title option 2", "title option 3", "title option 4", "title option 5", "title option 6"]
Do not include any markdown format blocks, additional explanations, or other texts. Just return the JSON array.`;
    
    const userPrompt = `Topic: "${topic.trim()}"\nCategory: "${category}"`;
    
    const results = await generateWithAi(
      systemInstruction,
      userPrompt,
      { provider: selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey },
      fallback
    );
    
    setTitles(results);
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copy = async (text: string, idx: number) => {
    await Clipboard.setStringAsync(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="YouTube Title Generator" subtitle="Create click-worthy titles" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>TOPIC / KEYWORD</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: ACCENT }]}
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. Python programming, stock market..."
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
          <View style={styles.chipWrap}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[styles.chip, { backgroundColor: category === c.id ? ACCENT : colors.muted, borderRadius: 8 }]}
              >
                <Text style={[styles.chipTxt, { color: category === c.id ? "#FFF" : colors.mutedForeground }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={generate}
          disabled={loading}
          style={[styles.genBtn, { backgroundColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#FFF" />
              <Text style={styles.genBtnTxt}>Generate Titles</Text>
            </>
          )}
        </TouchableOpacity>

        {titles.length > 0 && (
          <View style={{ marginHorizontal: 16, gap: 10 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>GENERATED TITLES</Text>
            {titles.map((t, i) => (
              <View key={i} style={[styles.titleCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.titleTxt, { color: colors.foreground }]}>{t}</Text>
                <TouchableOpacity onPress={() => copy(t, i)} style={styles.copyBtn}>
                  <Ionicons name={copied === i ? "checkmark-circle" : "copy-outline"} size={18} color={copied === i ? "#10B981" : ACCENT} />
                  <Text style={[styles.copyTxt, { color: copied === i ? "#10B981" : ACCENT }]}>{copied === i ? "Copied!" : "Copy"}</Text>
                </TouchableOpacity>
                <View style={[styles.charBadge, { backgroundColor: t.length > 60 ? "#EF4444" + "22" : "#10B981" + "22", borderRadius: 6 }]}>
                  <Text style={[styles.charTxt, { color: t.length > 60 ? "#EF4444" : "#10B981" }]}>{t.length} chars</Text>
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
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular", borderBottomWidth: 2, paddingBottom: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, marginBottom: 16 },
  genBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  titleCard: { borderWidth: 1, padding: 14, gap: 10 },
  titleTxt: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  copyTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  charBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3 },
  charTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
