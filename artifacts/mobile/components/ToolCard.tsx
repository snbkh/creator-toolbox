import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Tool } from "@/constants/tools";
import { getCategoryColor } from "@/constants/tools";

interface ToolCardProps {
  tool: Tool;
  size?: "small" | "medium" | "large";
}

function IconComponent({
  iconSet,
  icon,
  size,
  color,
}: {
  iconSet: Tool["iconSet"];
  icon: string;
  size: number;
  color: string;
}) {
  if (iconSet === "MaterialCommunityIcons") {
    return (
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={color}
      />
    );
  }
  if (iconSet === "Feather") {
    return (
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={size}
        color={color}
      />
    );
  }
  if (iconSet === "MaterialIcons") {
    return (
      <MaterialIcons
        name={icon as keyof typeof MaterialIcons.glyphMap}
        size={size}
        color={color}
      />
    );
  }
  return (
    <Ionicons
      name={icon as keyof typeof Ionicons.glyphMap}
      size={size}
      color={color}
    />
  );
}

export function ToolCard({ tool, size = "medium" }: ToolCardProps) {
  const colors = useColors();
  const { addRecentTool } = useApp();
  const scale = useSharedValue(1);
  const accentColor = getCategoryColor(tool.category);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addRecentTool(tool.id);
    if (tool.implemented) {
      router.push(`/tools/${tool.route}` as never);
    } else {
      router.push(
        `/tools/coming-soon?name=${encodeURIComponent(tool.name)}&icon=${tool.icon}&iconSet=${tool.iconSet}&color=${encodeURIComponent(accentColor)}` as never
      );
    }
  };

  const isSmall = size === "small";
  const iconSize = isSmall ? 20 : 24;
  const iconBoxSize = isSmall ? 38 : 46;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
          isSmall && styles.cardSmall,
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: accentColor + "22",
              borderRadius: colors.radius - 4,
              width: iconBoxSize,
              height: iconBoxSize,
            },
          ]}
        >
          <IconComponent
            iconSet={tool.iconSet}
            icon={tool.icon}
            size={iconSize}
            color={accentColor}
          />
        </View>
        <View style={styles.textBlock}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {tool.name}
          </Text>
          {!isSmall && (
            <Text
              style={[styles.desc, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {tool.description}
            </Text>
          )}
        </View>
        {!tool.implemented && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.muted, borderRadius: 6 },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
              Soon
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 12,
  },
  cardSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});

export { IconComponent };
