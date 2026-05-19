import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryCard } from "@/components/CategoryCard";
import { ToolCard } from "@/components/ToolCard";
import { useApp } from "@/context/AppContext";
import {
  CATEGORIES,
  TOOLS,
  getFeaturedTools,
  getTrendingTools,
  getToolById,
} from "@/constants/tools";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recentTools } = useApp();
  const isWeb = Platform.OS === "web";

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const featured = getFeaturedTools();
  const trending = getTrendingTools();
  const recent = recentTools
    .map((id) => getToolById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getToolById>>[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad + 80 },
        ]}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={["#4C1D95", "#1E1B4B", colors.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.heroGradient, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>Creator Toolbox</Text>
              <Text style={styles.heroSub}>
                All-in-one creative workspace
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/tools" as never)}
              style={[
                styles.searchBtn,
                { backgroundColor: "rgba(255,255,255,0.15)" },
              ]}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Stats bar */}
          <View style={styles.statsRow}>
            {[
              { label: "Image Tools", value: "13" },
              { label: "PDF Tools", value: "10" },
              { label: "Utilities", value: "9" },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick Tools (Recent) */}
        {recent.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <SectionHeader title="Recent Tools" />
            <FlatList
              horizontal
              data={recent.slice(0, 6)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <View style={styles.hCard}>
                  <ToolCard tool={item} size="small" />
                </View>
              )}
            />
          </Animated.View>
        )}

        {/* Categories */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SectionHeader title="Tool Categories" />
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <View key={cat.id} style={styles.categoryCell}>
                <CategoryCard category={cat} />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Featured Tools */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SectionHeader
            title="Featured Tools"
            onSeeAll={() => router.push("/tools" as never)}
          />
          <View style={styles.featuredList}>
            {featured.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </View>
        </Animated.View>

        {/* Trending */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SectionHeader title="Trending" />
          <FlatList
            horizontal
            data={trending}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInRight.delay(index * 60).springify()}
                style={styles.trendCard}
              >
                <TrendingCard tool={item} />
              </Animated.View>
            )}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            See all
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function TrendingCard({ tool }: { tool: ReturnType<typeof getTrendingTools>[0] }) {
  const colors = useColors();
  const { addRecentTool } = useApp();

  const handlePress = () => {
    addRecentTool(tool.id);
    if (tool.implemented) {
      router.push(`/tools/${tool.route}` as never);
    } else {
      router.push(
        `/tools/coming-soon?name=${encodeURIComponent(tool.name)}&icon=${tool.icon}&iconSet=${tool.iconSet}` as never
      );
    }
  };

  const accentColors: Record<string, string> = {
    image: "#8B5CF6",
    pdf: "#DC2626",
    utility: "#0EA5E9",
    creator: "#F59E0B",
  };
  const accent = accentColors[tool.category] ?? "#8B5CF6";

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.trendItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View
        style={[
          styles.trendIconBox,
          { backgroundColor: accent + "22", borderRadius: 12 },
        ]}
      >
        <MaterialCommunityIcons
          name={tool.icon as never}
          size={24}
          color={accent}
        />
      </View>
      <Text
        style={[styles.trendName, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {tool.name}
      </Text>
      {!tool.implemented && (
        <View
          style={[styles.trendBadge, { backgroundColor: colors.muted }]}
        >
          <Text style={[styles.trendBadgeText, { color: colors.mutedForeground }]}>
            Soon
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 3,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  hList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  hCard: {
    width: 220,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCell: {
    width: "47%",
  },
  featuredList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  trendCard: {
    marginLeft: 0,
  },
  trendItem: {
    width: 140,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 5,
  },
  trendIconBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  trendName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  trendBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trendBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
