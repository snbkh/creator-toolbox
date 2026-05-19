import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ToolCard } from "@/components/ToolCard";
import { ToolHeader } from "@/components/ToolHeader";
import { CATEGORIES, TOOLS, type ToolCategory } from "@/constants/tools";
import { useColors } from "@/hooks/useColors";

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const category = CATEGORIES.find((c) => c.id === id);
  const tools = TOOLS.filter((t) => t.category === (id as ToolCategory));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title={category?.name ?? "Tools"}
        subtitle={`${tools.length} tools`}
        accentColor={category?.gradientStart}
      />
      <FlatList
        data={tools}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 20 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => <ToolCard tool={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: 16,
  },
});
