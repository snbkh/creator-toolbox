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

type Category = "lifestyle" | "food" | "travel" | "fitness" | "product" | "motivation" | "humor";
type Tone = "professional" | "casual" | "funny" | "inspirational" | "minimal";

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "lifestyle", label: "Lifestyle", icon: "sunny-outline" },
  { id: "food", label: "Food", icon: "restaurant-outline" },
  { id: "travel", label: "Travel", icon: "airplane-outline" },
  { id: "fitness", label: "Fitness", icon: "barbell-outline" },
  { id: "product", label: "Product", icon: "bag-outline" },
  { id: "motivation", label: "Motivation", icon: "flame-outline" },
  { id: "humor", label: "Humor", icon: "happy-outline" },
];

const TONES: { id: Tone; label: string }[] = [
  { id: "casual", label: "Casual" },
  { id: "professional", label: "Professional" },
  { id: "funny", label: "Funny" },
  { id: "inspirational", label: "Inspirational" },
  { id: "minimal", label: "Minimal" },
];

const TEMPLATES: Record<Category, Record<Tone, string[]>> = {
  lifestyle: {
    casual: [
      "Living my best life and loving every second of it. {topic} has been everything lately.",
      "Not all those who wander are lost. Sometimes they're just looking for {topic}.",
      "Good vibes only. Especially when {topic} is involved.",
    ],
    professional: [
      "Elevating everyday moments through intentional living. Today's focus: {topic}.",
      "The art of curating a life worth living starts with {topic}.",
      "Quality over quantity — in life, in style, in {topic}.",
    ],
    funny: [
      "Me pretending I have my life together while obsessing over {topic}.",
      "Adulthood is just Googling {topic} and pretending you knew all along.",
      "My therapist: 'What brings you joy?' Me: '{topic}'. Therapist: '...'",
    ],
    inspirational: [
      "Every great journey begins with a single step toward {topic}. Keep going.",
      "You don't find balance — you create it. Today I'm choosing {topic}.",
      "Growth looks like choosing {topic} even when it's hard.",
    ],
    minimal: [
      "{topic}. Simply.",
      "Less noise. More {topic}.",
      "The quiet joy of {topic}.",
    ],
  },
  food: {
    casual: [
      "Okay but why does {topic} hit different every single time?",
      "If loving {topic} is wrong I don't want to be right.",
      "Hunger is just motivation to cook {topic}. Change my mind.",
    ],
    professional: [
      "Culinary excellence in every bite. Today's creation: {topic} prepared with care and precision.",
      "The secret to unforgettable dining begins with quality ingredients. This {topic} speaks for itself.",
      "Food is art. This {topic} is a masterpiece.",
    ],
    funny: [
      "Diet starts Monday. Tonight: {topic}. Non-negotiable.",
      "I said I was eating light. {topic} is light... in spirit.",
      "My love language is cooking you {topic}. And also eating it myself.",
    ],
    inspirational: [
      "Nourish your body, fuel your soul. Today that means {topic}.",
      "The simple act of making {topic} from scratch is its own kind of mindfulness.",
      "Food made with love tastes better. This {topic} has all of mine.",
    ],
    minimal: [
      "{topic}. Homemade.",
      "Good food. Good mood. {topic}.",
      "Simply {topic}.",
    ],
  },
  travel: {
    casual: [
      "Jet lag is just a reminder that {topic} was worth it. No regrets.",
      "Passport? Check. Good vibes? Check. Ready for {topic}? Always.",
      "Not all classrooms have four walls. This one's called {topic}.",
    ],
    professional: [
      "Discovering the world through thoughtful exploration. Currently experiencing {topic}.",
      "Every destination tells a story. {topic} has more chapters than I expected.",
      "Travel changes perspective. {topic} has changed mine.",
    ],
    funny: [
      "Traveling to {topic}: where I eat everything and pretend it's cultural research.",
      "My bank account says no. My soul says {topic}. Soul wins.",
      "{topic}: bought 4 things I didn't need and ate 11 meals in two days. 10/10.",
    ],
    inspirational: [
      "The world is a book, and those who do not travel read only one page. Turning to {topic}.",
      "Adventure is not out there — it's in how you see {topic}.",
      "Let {topic} remind you that the world is bigger and more beautiful than your worries.",
    ],
    minimal: [
      "{topic}. Worth every mile.",
      "Lost in {topic}. Intentionally.",
      "{topic}. Just go.",
    ],
  },
  fitness: {
    casual: [
      "Showing up for {topic} even when I didn't want to. That's the whole secret.",
      "Rest day? Never heard of her. {topic} time.",
      "{topic} hit different today. My legs disagree but my ego is thriving.",
    ],
    professional: [
      "Consistency is the foundation of transformation. {topic} is today's investment in tomorrow.",
      "Progressive overload in {topic} mirrors the discipline required for growth in every area of life.",
      "The body achieves what the mind believes. Today's {topic} session proves it.",
    ],
    funny: [
      "Started {topic} for the gains. Stayed for the snacks I now feel justified eating.",
      "Me after {topic}: I am a completely different person. Also me: immediately orders pizza.",
      "The only bad {topic} session is the one that didn't happen. So I did it. Barely. But still.",
    ],
    inspirational: [
      "Every rep in {topic} is a vote for the person you're becoming. Keep voting.",
      "The pain of discipline now versus the pain of regret later. Choosing {topic}.",
      "Your only competition is who you were yesterday. Today's {topic} says you're winning.",
    ],
    minimal: [
      "{topic}. Done.",
      "Show up. Do {topic}. Repeat.",
      "{topic} today. Better tomorrow.",
    ],
  },
  product: {
    casual: [
      "Okay I genuinely didn't expect {topic} to be this good. Obsessed.",
      "Can't stop recommending {topic} to literally everyone I know.",
      "{topic} is the thing I didn't know I needed until I had it.",
    ],
    professional: [
      "Introducing {topic} — crafted for those who refuse to compromise on quality.",
      "Excellence in every detail. {topic} redefines what's possible.",
      "The result of thoughtful design and uncompromising standards: {topic}.",
    ],
    funny: [
      "My bank account after discovering {topic}: 'We need to talk.'",
      "I tried to review {topic} objectively. I failed. It's perfect.",
      "They said {topic} would change my life. They undersold it.",
    ],
    inspirational: [
      "Great products don't just solve problems — they elevate experiences. {topic} does both.",
      "Behind every exceptional {topic} is a team that refused to settle for ordinary.",
      "When quality meets purpose, the result is {topic}.",
    ],
    minimal: [
      "{topic}. Quality speaks.",
      "Simply: {topic}.",
      "{topic}. No filter needed.",
    ],
  },
  motivation: {
    casual: [
      "Reminder: {topic} is not going to figure itself out. Let's go.",
      "You're closer to {topic} than you think. Keep pushing.",
      "Hard days exist so the good ones feel even better. Like when {topic} finally clicks.",
    ],
    professional: [
      "Sustainable progress in {topic} requires both vision and consistent execution. Start today.",
      "The gap between where you are and {topic} closes one disciplined decision at a time.",
      "Success in {topic} is not a destination — it's a practice.",
    ],
    funny: [
      "Motivation is a myth. Just do {topic} anyway and feel smug about it later.",
      "The secret to {topic}? Start. Finish. Eat a snack. Repeat.",
      "No one ever regretted doing {topic}. They only regret not starting sooner.",
    ],
    inspirational: [
      "You were made for more than settling. Go after {topic} like your life depends on it.",
      "The most powerful words in your vocabulary: 'I will figure out {topic}.'",
      "Believe in the version of yourself that already achieved {topic}. Then become them.",
    ],
    minimal: [
      "Do {topic}. Today.",
      "{topic} won't wait.",
      "Start. {topic} begins now.",
    ],
  },
  humor: {
    casual: [
      "Hot take: {topic} is the answer to everything. I have no further questions.",
      "Current mood: doing {topic} and pretending I have it all together.",
      "Story of my life: spent 3 hours planning {topic} and 10 minutes actually doing it.",
    ],
    professional: [
      "Professionally, I excel at {topic}. Personally, I googled how to do it this morning.",
      "They say dress for the job you want. I say do {topic} for the life you want. Same energy.",
      "Career highlight: successfully completed {topic} without asking for help. Once.",
    ],
    funny: [
      "My plans: {topic}. Reality: {topic} but chaotic and somehow more fun.",
      "Did {topic} without Googling it halfway through. I am a changed individual.",
      "{topic}? I have a whole system. It's mostly vibes but it works.",
    ],
    inspirational: [
      "Find your {topic} and do it badly until you do it well. That's the whole plan.",
      "Everyone starts somewhere with {topic}. The trick is to actually start.",
      "The first time I tried {topic} was a disaster. Now look at us.",
    ],
    minimal: [
      "{topic}. Somehow.",
      "Did {topic}. Survived.",
      "{topic}: mission accomplished.",
    ],
  },
};

function generateCaptions(topic: string, category: Category, tone: Tone): string[] {
  const templates = TEMPLATES[category][tone];
  const filled = topic.trim()
    ? templates.map((t) => t.replace(/\{topic\}/g, topic.trim()))
    : templates.map((t) => t.replace(/\{topic\}/g, "[your topic]"));
  return filled;
}

export default function CaptionGeneratorScreen() {
  const colors = useColors();
  const { selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey } = useApp();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<Category>("lifestyle");
  const [tone, setTone] = useState<Tone>("casual");
  const [captions, setCaptions] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const fallback = () => generateCaptions(topic, category, tone);
    
    const systemInstruction = `You are a social media expert and copywriter. Generate exactly 3 distinct, creative, and engaging social media captions about the topic/keyword requested.
Provide the output strictly as a JSON array of strings, like this:
["caption option 1", "caption option 2", "caption option 3"]
Do not include any markdown format blocks, additional explanations, or other texts. Just return the JSON array.`;
    
    const userPrompt = `Topic: "${topic || "Any interesting topic"}"\nCategory: "${category}"\nTone: "${tone}"`;
    
    const results = await generateWithAi(
      systemInstruction,
      userPrompt,
      { provider: selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey },
      fallback
    );
    
    setCaptions(results);
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copy = async (text: string, idx: number) => {
    await Clipboard.setStringAsync(text);
    setCopiedIdx(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const accentColors: Record<Category, string> = {
    lifestyle: "#EC4899",
    food: "#F59E0B",
    travel: "#0EA5E9",
    fitness: "#10B981",
    product: "#8B5CF6",
    motivation: "#EF4444",
    humor: "#F97316",
  };
  const accent = accentColors[category];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Caption Generator"
        subtitle="AI-style captions for any post"
        accentColor={accent}
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Topic Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 }]}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
            TOPIC / KEYWORD (optional)
          </Text>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. morning coffee, hiking trip..."
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingHorizontal: 16 }]}>
            CATEGORY
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              const catAccent = accentColors[cat.id];
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? catAccent + "22" : colors.card,
                      borderColor: isActive ? catAccent : colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon as never}
                    size={14}
                    color={isActive ? catAccent : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? catAccent : colors.mutedForeground },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tone */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingHorizontal: 16 }]}>
            TONE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
            {TONES.map((t) => {
              const isActive = tone === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTone(t.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? accent + "22" : colors.card,
                      borderColor: isActive ? accent : colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? accent : colors.mutedForeground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={generate}
          disabled={loading}
          style={[
            styles.genBtn,
            {
              backgroundColor: accent,
              borderRadius: colors.radius,
              marginHorizontal: 16,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text style={styles.genBtnText}>Generate Captions</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        {captions.length > 0 && (
          <View style={[styles.section, { marginHorizontal: 16 }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              GENERATED CAPTIONS
            </Text>
            {captions.map((cap, i) => (
              <View
                key={i}
                style={[
                  styles.captionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={[styles.captionText, { color: colors.foreground }]}>
                  {cap}
                </Text>
                <TouchableOpacity
                  onPress={() => copy(cap, i)}
                  style={styles.copyBtn}
                >
                  <Ionicons
                    name={copiedIdx === i ? "checkmark-circle" : "copy-outline"}
                    size={18}
                    color={copiedIdx === i ? "#10B981" : colors.primary}
                  />
                  <Text
                    style={[
                      styles.copyText,
                      {
                        color: copiedIdx === i ? "#10B981" : colors.primary,
                      },
                    ]}
                  >
                    {copiedIdx === i ? "Copied!" : "Copy"}
                  </Text>
                </TouchableOpacity>
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
  inputCard: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  section: {
    marginBottom: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  chipBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  genBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  captionCard: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  captionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },
  copyText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
