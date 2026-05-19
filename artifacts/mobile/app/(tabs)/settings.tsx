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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useAppColors } from "@/context/AppContext";
import { TOOLS } from "@/constants/tools";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const {
    isDarkMode,
    setDarkMode,
    clearHistory,
    processedFiles,
    favoriteTools,
    geminiKey,
    setGeminiKey,
    openaiKey,
    setOpenaiKey,
    groqKey,
    setGroqKey,
    claudeKey,
    setClaudeKey,
    removeBgKey,
    setRemoveBgKey,
    selectedAiProvider,
    setSelectedAiProvider,
    selectedBgProvider,
    setSelectedBgProvider,
  } = useApp();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const [showGemini, setShowGemini] = React.useState(false);
  const [showOpenai, setShowOpenai] = React.useState(false);
  const [showGroq, setShowGroq] = React.useState(false);
  const [showClaude, setShowClaude] = React.useState(false);
  const [showRemoveBg, setShowRemoveBg] = React.useState(false);

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

        {/* AI & API Configuration */}
        <SettingSection title="AI & API Configuration">
          <View style={styles.apiConfigContainer}>
            <Text style={[styles.apiLabel, { color: colors.mutedForeground }]}>DEFAULT AI PROVIDER</Text>
            <View style={styles.providerGrid}>
              {([
                { id: "local", name: "Offline" },
                { id: "gemini", name: "Gemini" },
                { id: "openai", name: "OpenAI" },
                { id: "groq", name: "Groq" },
                { id: "claude", name: "Claude" }
              ] as const).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedAiProvider(p.id)}
                  style={[
                    styles.providerBtn,
                    {
                      backgroundColor: selectedAiProvider === p.id ? colors.primary + "22" : colors.muted,
                      borderColor: selectedAiProvider === p.id ? colors.primary : "transparent",
                      borderRadius: 8,
                    }
                  ]}
                >
                  <Text style={[styles.providerBtnTxt, { color: selectedAiProvider === p.id ? colors.primary : colors.foreground }]}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.apiLabel, { color: colors.mutedForeground, marginTop: 12 }]}>API KEYS</Text>
            
            {/* Gemini Key */}
            <View style={[styles.keyInputRow, { borderColor: colors.border }]}>
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} style={styles.keyIcon} />
              <TextInput
                style={[styles.keyInput, { color: colors.foreground }]}
                value={geminiKey}
                onChangeText={setGeminiKey}
                placeholder="Gemini API Key"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showGemini}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowGemini(!showGemini)} style={styles.eyeBtn}>
                <Ionicons name={showGemini ? "eye-off-outline" : "eye-outline"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* OpenAI Key */}
            <View style={[styles.keyInputRow, { borderColor: colors.border }]}>
              <Ionicons name="aperture-outline" size={16} color={colors.primary} style={styles.keyIcon} />
              <TextInput
                style={[styles.keyInput, { color: colors.foreground }]}
                value={openaiKey}
                onChangeText={setOpenaiKey}
                placeholder="OpenAI API Key"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showOpenai}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowOpenai(!showOpenai)} style={styles.eyeBtn}>
                <Ionicons name={showOpenai ? "eye-off-outline" : "eye-outline"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Groq Key */}
            <View style={[styles.keyInputRow, { borderColor: colors.border }]}>
              <Ionicons name="flash-outline" size={16} color={colors.primary} style={styles.keyIcon} />
              <TextInput
                style={[styles.keyInput, { color: colors.foreground }]}
                value={groqKey}
                onChangeText={setGroqKey}
                placeholder="Groq API Key"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showGroq}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowGroq(!showGroq)} style={styles.eyeBtn}>
                <Ionicons name={showGroq ? "eye-off-outline" : "eye-outline"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Claude Key */}
            <View style={[styles.keyInputRow, { borderColor: colors.border }]}>
              <MaterialCommunityIcons name="brain" size={16} color={colors.primary} style={styles.keyIcon} />
              <TextInput
                style={[styles.keyInput, { color: colors.foreground }]}
                value={claudeKey}
                onChangeText={setClaudeKey}
                placeholder="Claude (Anthropic) API Key"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showClaude}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowClaude(!showClaude)} style={styles.eyeBtn}>
                <Ionicons name={showClaude ? "eye-off-outline" : "eye-outline"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Remove.bg Key */}
            <Text style={[styles.apiLabel, { color: colors.mutedForeground, marginTop: 12 }]}>BACKGROUND REMOVER PROVIDER</Text>
            <View style={styles.providerGrid}>
              {([
                { id: "local", name: "Local Engine" },
                { id: "removebg", name: "Remove.bg API" }
              ] as const).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedBgProvider(p.id)}
                  style={[
                    styles.providerBtn,
                    {
                      backgroundColor: selectedBgProvider === p.id ? colors.primary + "22" : colors.muted,
                      borderColor: selectedBgProvider === p.id ? colors.primary : "transparent",
                      borderRadius: 8,
                      flex: 1,
                    }
                  ]}
                >
                  <Text style={[styles.providerBtnTxt, { color: selectedBgProvider === p.id ? colors.primary : colors.foreground }]}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.keyInputRow, { borderColor: colors.border, marginTop: 8 }]}>
              <Ionicons name="image-outline" size={16} color={colors.primary} style={styles.keyIcon} />
              <TextInput
                style={[styles.keyInput, { color: colors.foreground }]}
                value={removeBgKey}
                onChangeText={setRemoveBgKey}
                placeholder="Remove.bg API Key"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showRemoveBg}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowRemoveBg(!showRemoveBg)} style={styles.eyeBtn}>
                <Ionicons name={showRemoveBg ? "eye-off-outline" : "eye-outline"} size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
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
  const colors = useAppColors();
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
  apiConfigContainer: {
    padding: 14,
    gap: 8,
  },
  apiLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  providerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  providerBtnTxt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  keyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  keyIcon: {
    marginRight: 8,
  },
  keyInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: {
    padding: 6,
  },
});
