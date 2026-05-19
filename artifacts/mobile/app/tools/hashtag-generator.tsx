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

type Platform = "instagram" | "tiktok" | "twitter" | "youtube" | "linkedin";
type Niche = "lifestyle" | "food" | "travel" | "fitness" | "fashion" | "business" | "tech" | "art";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "twitter", label: "Twitter/X" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
];

const NICHES: { id: Niche; label: string; color: string }[] = [
  { id: "lifestyle", label: "Lifestyle", color: "#EC4899" },
  { id: "food", label: "Food", color: "#F59E0B" },
  { id: "travel", label: "Travel", color: "#0EA5E9" },
  { id: "fitness", label: "Fitness", color: "#10B981" },
  { id: "fashion", label: "Fashion", color: "#8B5CF6" },
  { id: "business", label: "Business", color: "#6B7280" },
  { id: "tech", label: "Tech", color: "#22D3EE" },
  { id: "art", label: "Art", color: "#F97316" },
];

const HASHTAG_POOL: Record<Niche, Record<Platform, string[]>> = {
  lifestyle: {
    instagram: ["#lifestyle", "#livingmybestlife", "#lifestyleblogger", "#dailylife", "#authentic", "#slowliving", "#intentionalliving", "#mindfulness", "#selflove", "#wellbeing", "#morningroutine", "#hygge", "#cozyliving", "#weekendvibes", "#goodvibesonly", "#livelovelaugh", "#happylife", "#positivevibes", "#grateful", "#blessed"],
    tiktok: ["#lifestyle", "#dayinmylife", "#vlog", "#fyp", "#foryoupage", "#lifestylecheck", "#slowlife", "#cottagecore", "#aestheticlifestyle", "#tiktoklifestyle"],
    twitter: ["#lifestyle", "#MondayMotivation", "#WellnessWednesday", "#selfcare", "#mindfulness", "#dailyinspiration"],
    youtube: ["#lifestyle", "#dayinmylife", "#lifestylevlog", "#morningroutine", "#productivityvlog", "#weekendvlog"],
    linkedin: ["#lifestyle", "#worklifebalance", "#personaldevelopment", "#mindfulness", "#productivity", "#wellbeing"],
  },
  food: {
    instagram: ["#foodie", "#foodphotography", "#instafood", "#foodblogger", "#homecooking", "#foodlover", "#delicious", "#yummy", "#foodoftheday", "#foodporn", "#eeeeeats", "#f52grams", "#feedfeed", "#tastingtable", "#bonappetit", "#foodstagram", "#recipeoftheday", "#whatsonmyplate", "#cookingathome", "#healthyfood"],
    tiktok: ["#foodtok", "#foodie", "#recipe", "#cooking", "#fyp", "#foryoupage", "#homecooking", "#foodlover", "#tasty", "#foodvideo"],
    twitter: ["#foodie", "#recipe", "#cooking", "#homecooking", "#foodphotography", "#FoodTwitter"],
    youtube: ["#food", "#recipe", "#cooking", "#foodvlog", "#mukbang", "#foodreview", "#homecooking"],
    linkedin: ["#food", "#foodindustry", "#restaurants", "#culinary", "#foodbusiness", "#hospitality"],
  },
  travel: {
    instagram: ["#travel", "#wanderlust", "#travelphotography", "#travelgram", "#explore", "#instatravel", "#adventure", "#traveldiaries", "#travelblogger", "#letsgoeverywhere", "#worldtravel", "#passport", "#jetlag", "#globetrotter", "#backpacking", "#seetheworld", "#travelmore", "#goexplore", "#traveladdict", "#traveler"],
    tiktok: ["#travel", "#traveltok", "#travelvideos", "#wanderlust", "#adventure", "#fyp", "#backpacking", "#solotravel", "#travellife", "#exploremore"],
    twitter: ["#travel", "#wanderlust", "#adventure", "#travelgram", "#explore", "#Wanderlust"],
    youtube: ["#travel", "#travelvlog", "#travelguide", "#traveldiaries", "#adventure", "#solotravel"],
    linkedin: ["#travel", "#businesstravel", "#remotework", "#digitalnomad", "#travelindustry"],
  },
  fitness: {
    instagram: ["#fitness", "#workout", "#gym", "#fitnessmotivation", "#health", "#fitfam", "#training", "#exercise", "#gymlife", "#gains", "#fitlife", "#healthylifestyle", "#bodybuilding", "#weightloss", "#cardio", "#strength", "#musclebuilding", "#fitnessgoals", "#personaltrainer", "#workoutmotivation"],
    tiktok: ["#fitness", "#workout", "#gym", "#fyp", "#fitnesstok", "#gymtok", "#gains", "#exercise", "#fitnesscheck", "#workoutroutine"],
    twitter: ["#fitness", "#workout", "#gym", "#FitnessMotivation", "#health", "#training"],
    youtube: ["#fitness", "#workout", "#gym", "#exercise", "#fitnessvlog", "#workoutroutine"],
    linkedin: ["#fitness", "#health", "#wellness", "#leadership", "#personaldevelopment", "#goals"],
  },
  fashion: {
    instagram: ["#fashion", "#style", "#ootd", "#fashionblogger", "#instafashion", "#streetstyle", "#fashionista", "#outfitoftheday", "#lookoftheday", "#styleblogger", "#fashionphotography", "#wiwt", "#currentlywearing", "#wiw", "#fblogger", "#styleinspo", "#fashioninspiration", "#outfitpost", "#model", "#fashionweek"],
    tiktok: ["#fashion", "#ootd", "#fashiontok", "#style", "#fyp", "#outfitcheck", "#fashionista", "#styletips", "#fashiontrends", "#streetstyle"],
    twitter: ["#fashion", "#ootd", "#style", "#fashionweek", "#fashionblogger", "#fashionista"],
    youtube: ["#fashion", "#ootd", "#stylehaul", "#fashionvlog", "#outfitideas", "#fashiontrends"],
    linkedin: ["#fashion", "#fashionindustry", "#retail", "#sustainability", "#fashionbusiness"],
  },
  business: {
    instagram: ["#business", "#entrepreneur", "#startup", "#success", "#entrepreneurship", "#motivation", "#businessowner", "#hustle", "#smallbusiness", "#marketing", "#leadership", "#mindset", "#growthmindset", "#networking", "#strategy", "#businesstips", "#ceo", "#brand", "#digitalmarketing", "#goals"],
    tiktok: ["#business", "#entrepreneur", "#fyp", "#businesstok", "#smallbusiness", "#startup", "#success", "#marketing", "#biztok", "#entrepreneurlife"],
    twitter: ["#business", "#entrepreneur", "#startup", "#marketing", "#leadership", "#success", "#networking"],
    youtube: ["#business", "#entrepreneur", "#startup", "#success", "#businessadvice", "#howto"],
    linkedin: ["#business", "#leadership", "#entrepreneur", "#startup", "#innovation", "#marketing", "#networking", "#success", "#management", "#career"],
  },
  tech: {
    instagram: ["#tech", "#technology", "#programming", "#coding", "#developer", "#software", "#ai", "#innovation", "#digitaltransformation", "#startup", "#machinelearning", "#data", "#cloudinnovation", "#javascript", "#python", "#webdev", "#techlife", "#devlife", "#codinglife", "#techstagram"],
    tiktok: ["#tech", "#coding", "#programming", "#fyp", "#techtok", "#developer", "#ai", "#softwareengineering", "#coder", "#techexplained"],
    twitter: ["#tech", "#coding", "#developer", "#AI", "#ML", "#webdev", "#javascript", "#python", "#startup"],
    youtube: ["#tech", "#technology", "#programming", "#coding", "#developer", "#tutorial", "#review"],
    linkedin: ["#technology", "#innovation", "#AI", "#digitaltransformation", "#software", "#data", "#programming", "#techleadership"],
  },
  art: {
    instagram: ["#art", "#artist", "#artwork", "#illustration", "#drawing", "#painting", "#digitalart", "#design", "#creative", "#artofinstagram", "#artistsoninstagram", "#instaart", "#abstractart", "#contemporaryart", "#artgallery", "#artlovers", "#sketchbook", "#watercolor", "#oilpainting", "#graphicdesign"],
    tiktok: ["#art", "#artist", "#drawing", "#fyp", "#arttok", "#digitalart", "#artwork", "#painting", "#artprocess", "#creativeprocess"],
    twitter: ["#art", "#artist", "#illustration", "#design", "#drawing", "#digitalart", "#artwork"],
    youtube: ["#art", "#drawing", "#painting", "#digitalart", "#speedpaint", "#artprocess", "#tutorial"],
    linkedin: ["#art", "#design", "#creative", "#graphicdesign", "#branding", "#ux", "#visualdesign"],
  },
};

function generateHashtags(
  keyword: string,
  niche: Niche,
  platform: Platform,
  count: number
): string[] {
  const pool = HASHTAG_POOL[niche][platform];
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count - (keyword ? 2 : 0));
  if (keyword) {
    const kw = keyword.trim().toLowerCase().replace(/\s+/g, "");
    shuffled.unshift(`#${kw}`, `#${kw}${niche}`);
  }
  return shuffled.slice(0, count);
}

export default function HashtagGeneratorScreen() {
  const colors = useColors();
  const { selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey } = useApp();
  const [keyword, setKeyword] = useState("");
  const [niche, setNiche] = useState<Niche>("lifestyle");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [count, setCount] = useState(15);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const fallback = () => generateHashtags(keyword, niche, platform, count);
    
    const systemInstruction = `You are a social media specialist. Generate exactly ${count} relevant, trending, and active hashtags for the given keyword/topic, niche, and social media platform.
Provide the output strictly as a JSON array of strings containing the hashtags (with the '#' prefix), like this:
["#tag1", "#tag2", "#tag3"]
Do not include any markdown format blocks, additional explanations, or other texts. Just return the JSON array.`;
    
    const userPrompt = `Keyword: "${keyword || "None"}"\nNiche: "${niche}"\nPlatform: "${platform}"\nCount: ${count}`;
    
    const results = await generateWithAi(
      systemInstruction,
      userPrompt,
      { provider: selectedAiProvider, geminiKey, openaiKey, groqKey, claudeKey },
      fallback
    );
    
    setHashtags(results);
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copyAll = async () => {
    const text = hashtags.join(" ");
    await Clipboard.setStringAsync(text);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  const nicheColor = NICHES.find((n) => n.id === niche)?.color ?? "#8B5CF6";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Hashtag Generator"
        subtitle="Generate trending hashtags instantly"
        accentColor={nicheColor}
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Keyword Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>KEYWORD</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="e.g. travel, morning coffee..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
        </View>

        {/* Platform */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground, paddingHorizontal: 16 }]}>
            PLATFORM
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPlatform(p.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: platform === p.id ? nicheColor : colors.card,
                    borderColor: platform === p.id ? nicheColor : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: platform === p.id ? "#FFFFFF" : colors.foreground,
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Niche */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground, paddingHorizontal: 16 }]}>
            NICHE
          </Text>
          <View style={styles.nicheGrid}>
            {NICHES.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => setNiche(n.id)}
                style={[
                  styles.nicheChip,
                  {
                    backgroundColor: niche === n.id ? n.color + "22" : colors.card,
                    borderColor: niche === n.id ? n.color : colors.border,
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nicheText,
                    { color: niche === n.id ? n.color : colors.foreground },
                  ]}
                >
                  {n.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Count */}
        <View style={styles.countRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>COUNT:</Text>
          {[10, 15, 20, 30].map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCount(c)}
              style={[
                styles.countChip,
                {
                  backgroundColor: count === c ? nicheColor : colors.card,
                  borderColor: count === c ? nicheColor : colors.border,
                  borderRadius: 8,
                },
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  { color: count === c ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Generate */}
        <TouchableOpacity
          onPress={generate}
          disabled={loading}
          style={[
            styles.genBtn,
            {
              backgroundColor: nicheColor,
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
              <Text style={styles.genBtnText}>Generate Hashtags</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        {hashtags.length > 0 && (
          <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
                {hashtags.length} hashtags generated
              </Text>
              <TouchableOpacity onPress={copyAll} style={styles.copyAllBtn}>
                <Ionicons
                  name={copied ? "checkmark-circle" : "copy-outline"}
                  size={16}
                  color={copied ? "#10B981" : nicheColor}
                />
                <Text style={[styles.copyAllText, { color: copied ? "#10B981" : nicheColor }]}>
                  {copied ? "Copied!" : "Copy All"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagsWrap}>
              {hashtags.map((tag, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => Clipboard.setStringAsync(tag)}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: nicheColor + "18",
                      borderColor: nicheColor + "40",
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: nicheColor }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  section: {
    marginBottom: 16,
    gap: 8,
  },
  chipBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  nicheGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  nicheChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  nicheText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  countChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
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
  resultsCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  copyAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
