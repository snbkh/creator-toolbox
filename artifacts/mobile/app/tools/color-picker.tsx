import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

const COLOR_PALETTE: { name: string; colors: string[] }[] = [
  {
    name: "Reds",
    colors: ["#FFF5F5", "#FFE3E3", "#FFC9C9", "#FFA8A8", "#FF8787", "#FF6B6B", "#FA5252", "#F03E3E", "#E03131", "#C92A2A"],
  },
  {
    name: "Pinks",
    colors: ["#FFF0F6", "#FFDEEB", "#FCC2D7", "#FAA2C1", "#F783AC", "#F06595", "#E64980", "#D6336C", "#C2255C", "#A61E4D"],
  },
  {
    name: "Purples",
    colors: ["#F8F0FC", "#F3D9FA", "#EEBEFA", "#E599F7", "#DA77F2", "#CC5DE8", "#BE4BDB", "#AE3EC9", "#9C36B5", "#862E9C"],
  },
  {
    name: "Violets",
    colors: ["#F3F0FF", "#E5DBFF", "#D0BFFF", "#B197FC", "#9775FA", "#845EF7", "#7950F2", "#6741D9", "#5F3DC4", "#5236AB"],
  },
  {
    name: "Blues",
    colors: ["#E7F5FF", "#D0EBFF", "#A5D8FF", "#74C0FC", "#4DABF7", "#339AF0", "#228BE6", "#1C7ED6", "#1971C2", "#1864AB"],
  },
  {
    name: "Cyans",
    colors: ["#E3FAFC", "#C5F6FA", "#99E9F2", "#66D9E8", "#3BC9DB", "#22B8CF", "#15AABF", "#1098AD", "#0C8599", "#0B7285"],
  },
  {
    name: "Greens",
    colors: ["#EBFBEE", "#D3F9D8", "#B2F2BB", "#8CE99A", "#69DB7C", "#51CF66", "#40C057", "#37B24D", "#2F9E44", "#276E3B"],
  },
  {
    name: "Yellows",
    colors: ["#FFF9DB", "#FFF3BF", "#FFEC99", "#FFE066", "#FFD43B", "#FCC419", "#FAB005", "#F59F00", "#F08C00", "#E67700"],
  },
  {
    name: "Oranges",
    colors: ["#FFF4E6", "#FFE8CC", "#FFD8A8", "#FFC078", "#FFA94D", "#FF922B", "#FD7E14", "#F76707", "#E8590C", "#D9480F"],
  },
  {
    name: "Grays",
    colors: ["#FFFFFF", "#F8F9FA", "#F1F3F5", "#E9ECEF", "#DEE2E6", "#CED4DA", "#ADB5BD", "#868E96", "#495057", "#343A40"],
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function isLight(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 128;
}

export default function ColorPickerScreen() {
  const colors = useColors();
  const [selected, setSelected] = useState<string>("#8B5CF6");
  const [copied, setCopied] = useState<string | null>(null);

  const rgb = hexToRgb(selected);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  const copyValue = async (value: string, key: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(key);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(null), 1500);
  };

  const onSelectColor = (hex: string) => {
    setSelected(hex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Color Picker"
        subtitle="Pick colors and get values"
        accentColor="#EC4899"
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View
          style={[styles.preview, { backgroundColor: selected }]}
        >
          <Text
            style={[
              styles.previewHex,
              { color: isLight(selected) ? "#000000" : "#FFFFFF" },
            ]}
          >
            {selected.toUpperCase()}
          </Text>
        </View>

        {/* Color Values */}
        <View style={[styles.valuesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          {[
            { key: "hex", label: "HEX", value: selected.toUpperCase() },
            {
              key: "rgb",
              label: "RGB",
              value: rgb
                ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                : "—",
            },
            {
              key: "hsl",
              label: "HSL",
              value: hsl
                ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
                : "—",
            },
          ].map((v) => (
            <TouchableOpacity
              key={v.key}
              onPress={() => copyValue(v.value, v.key)}
              style={[styles.valueRow, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.valueLabel, { color: colors.mutedForeground }]}>
                {v.label}
              </Text>
              <Text style={[styles.valueText, { color: colors.foreground }]}>
                {v.value}
              </Text>
              <Ionicons
                name={copied === v.key ? "checkmark" : "copy-outline"}
                size={16}
                color={copied === v.key ? "#10B981" : colors.mutedForeground}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Palette Grid */}
        <View style={styles.palette}>
          {COLOR_PALETTE.map((group) => (
            <View key={group.name} style={styles.group}>
              <Text style={[styles.groupName, { color: colors.mutedForeground }]}>
                {group.name}
              </Text>
              <View style={styles.swatchRow}>
                {group.colors.map((hex) => (
                  <TouchableOpacity
                    key={hex}
                    onPress={() => onSelectColor(hex)}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: hex,
                        borderColor:
                          selected === hex ? colors.foreground : "transparent",
                        borderWidth: selected === hex ? 2 : 0,
                        borderRadius: selected === hex ? 6 : 4,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  preview: {
    height: 140,
    margin: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewHex: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  valuesCard: {
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  valueLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    width: 32,
  },
  valueText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  palette: {
    paddingHorizontal: 16,
    gap: 14,
  },
  group: {
    gap: 6,
  },
  groupName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  swatchRow: {
    flexDirection: "row",
    gap: 4,
  },
  swatch: {
    flex: 1,
    height: 28,
  },
});
