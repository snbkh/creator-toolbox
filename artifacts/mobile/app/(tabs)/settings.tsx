import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { TOOLS } from "@/constants/tools";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isDarkMode, setDarkMode, clearHistory, processedFiles, favoriteTools } = useApp();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const implementedCount = TOOLS.filter((t) => t.implemented).length;
  const totalTools = TOOLS.length;

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will remove your history and recent tools.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearHistory },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      >
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Settings
          </Text>
        </View>

        {/* Profile Banner */}
        <LinearGradient
          colors={["#7C3AED", "#4F46E5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.banner, { borderRadius: colors.radius + 2 }]}
        >
          <View style={styles.bannerIcon}>
            <MaterialCommunityIcons name="toolbox-outline" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Creator Toolbox</Text>
            <Text style={styles.bannerSub}>v1.0.0 · Free Plan</Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: "Available Tools", value: implementedCount.toString() },
            { label: "Total Tools", value: totalTools.toString() },
            { label: "Files Processed", value: processedFiles.length.toString() },
            { label: "Favorites", value: favoriteTools.length.toString() },
          ].map((s) => (
            <View
              key={s.label}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Appearance */}
        <SettingSection title="Appearance">
          <SettingRow
            icon="moon-outline"
            label="Dark Mode"
            colors={colors}
            right={
              <Switch
                value={isDarkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.primaryForeground}
              />
            }
          />
        </SettingSection>

        {/* Storage */}
        <SettingSection title="Storage">
          <SettingRow
            icon="time-outline"
            label="Clear History"
            sublabel={`${processedFiles.length} files in history`}
            colors={colors}
            onPress={handleClearData}
            danger
          />
        </SettingSection>

        {/* About */}
        <SettingSection title="About">
          <SettingRow
            icon="information-circle-outline"
            label="Version"
            sublabel="1.0.0"
            colors={colors}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            colors={colors}
            showArrow
          />
          <SettingRow
            icon="document-text-outline"
            label="Terms of Service"
            colors={colors}
            showArrow
          />
        </SettingSection>
      </ScrollView>
    </View>
  );
}

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {title.toUpperCase()}
      </Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  sublabel,
  right,
  onPress,
  showArrow,
  danger,
  colors,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.muted, borderRadius: 8 }]}>
        <Ionicons
          name={icon as never}
          size={18}
          color={danger ? colors.destructive : colors.primary}
        />
      </View>
      <View style={styles.settingText}>
        <Text
          style={[
            styles.settingLabel,
            { color: danger ? colors.destructive : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingSub, { color: colors.mutedForeground }]}>
            {sublabel}
          </Text>
        )}
      </View>
      {right}
      {showArrow && (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
    padding: 20,
    gap: 16,
  },
  bannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    gap: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  bannerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    width: "47%",
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  sectionCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  settingIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  settingSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
