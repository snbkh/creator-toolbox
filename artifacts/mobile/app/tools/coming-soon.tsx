import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

export default function ComingSoonScreen() {
  const { name, icon, color } = useLocalSearchParams<{
    name: string;
    icon: string;
    color: string;
  }>();
  const colors = useColors();
  const accentColor = color ?? colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title={name ?? "Coming Soon"} />
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: accentColor + "22", borderRadius: 32 },
          ]}
        >
          <MaterialCommunityIcons
            name={(icon as never) ?? "tools"}
            size={48}
            color={accentColor}
          />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Coming Soon
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          {name} is under development and will be available in the next update.
          Stay tuned for powerful new features.
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: accentColor + "22", borderRadius: 20 },
          ]}
        >
          <Text style={[styles.badgeText, { color: accentColor }]}>
            In Development
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  desc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
