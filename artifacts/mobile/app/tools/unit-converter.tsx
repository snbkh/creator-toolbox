import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

type Category = "length" | "weight" | "temperature" | "volume" | "area";

interface Unit {
  label: string;
  symbol: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

const UNIT_SETS: Record<Category, Unit[]> = {
  length: [
    { label: "Meter", symbol: "m", toBase: (v) => v, fromBase: (v) => v },
    { label: "Kilometer", symbol: "km", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    { label: "Centimeter", symbol: "cm", toBase: (v) => v / 100, fromBase: (v) => v * 100 },
    { label: "Millimeter", symbol: "mm", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
    { label: "Mile", symbol: "mi", toBase: (v) => v * 1609.34, fromBase: (v) => v / 1609.34 },
    { label: "Yard", symbol: "yd", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
    { label: "Foot", symbol: "ft", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    { label: "Inch", symbol: "in", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
  ],
  weight: [
    { label: "Kilogram", symbol: "kg", toBase: (v) => v, fromBase: (v) => v },
    { label: "Gram", symbol: "g", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
    { label: "Milligram", symbol: "mg", toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
    { label: "Pound", symbol: "lb", toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
    { label: "Ounce", symbol: "oz", toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
    { label: "Ton", symbol: "t", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  ],
  temperature: [
    { label: "Celsius", symbol: "°C", toBase: (v) => v, fromBase: (v) => v },
    { label: "Fahrenheit", symbol: "°F", toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
    { label: "Kelvin", symbol: "K", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  ],
  volume: [
    { label: "Liter", symbol: "L", toBase: (v) => v, fromBase: (v) => v },
    { label: "Milliliter", symbol: "mL", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
    { label: "Gallon (US)", symbol: "gal", toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
    { label: "Fluid Oz", symbol: "fl oz", toBase: (v) => v * 0.0295735, fromBase: (v) => v / 0.0295735 },
    { label: "Cup", symbol: "cup", toBase: (v) => v * 0.236588, fromBase: (v) => v / 0.236588 },
  ],
  area: [
    { label: "Square Meter", symbol: "m²", toBase: (v) => v, fromBase: (v) => v },
    { label: "Square Km", symbol: "km²", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
    { label: "Square Foot", symbol: "ft²", toBase: (v) => v * 0.0929, fromBase: (v) => v / 0.0929 },
    { label: "Acre", symbol: "ac", toBase: (v) => v * 4046.86, fromBase: (v) => v / 4046.86 },
    { label: "Hectare", symbol: "ha", toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
  ],
};

const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "length", label: "Length", color: "#8B5CF6" },
  { id: "weight", label: "Weight", color: "#0EA5E9" },
  { id: "temperature", label: "Temp", color: "#EF4444" },
  { id: "volume", label: "Volume", color: "#10B981" },
  { id: "area", label: "Area", color: "#F59E0B" },
];

function formatNum(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(4);
  const str = n.toPrecision(7);
  return parseFloat(str).toString();
}

export default function UnitConverterScreen() {
  const colors = useColors();
  const [category, setCategory] = useState<Category>("length");
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(1);
  const [inputValue, setInputValue] = useState("1");

  const units = UNIT_SETS[category];
  const fromUnit = units[fromIdx];
  const toUnit = units[toIdx];

  const numInput = parseFloat(inputValue) || 0;
  const baseValue = fromUnit.toBase(numInput);
  const result = toUnit.fromBase(baseValue);

  const swapUnits = () => {
    setFromIdx(toIdx);
    setToIdx(fromIdx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const accent = CATEGORIES.find((c) => c.id === category)?.color ?? "#8B5CF6";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Unit Converter"
        subtitle="Convert any unit instantly"
        accentColor={accent}
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catBar}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                setCategory(cat.id);
                setFromIdx(0);
                setToIdx(1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.catChip,
                {
                  backgroundColor:
                    category === cat.id ? cat.color : colors.card,
                  borderColor:
                    category === cat.id ? cat.color : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[
                  styles.catChipText,
                  {
                    color:
                      category === cat.id
                        ? "#FFFFFF"
                        : colors.mutedForeground,
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Converter */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          {/* From */}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.valueInput, { color: colors.foreground, borderBottomColor: accent }]}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
              <View style={styles.unitRow}>
                {units.map((u, i) => (
                  <TouchableOpacity
                    key={u.symbol}
                    onPress={() => {
                      setFromIdx(i);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor:
                          fromIdx === i ? accent : colors.muted,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitSymbol,
                        {
                          color: fromIdx === i ? "#FFFFFF" : colors.mutedForeground,
                        },
                      ]}
                    >
                      {u.symbol}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.unitLabel, { color: colors.mutedForeground }]}>
              {fromUnit.label}
            </Text>
          </View>

          {/* Swap */}
          <TouchableOpacity
            onPress={swapUnits}
            style={[styles.swapBtn, { backgroundColor: accent + "22", borderRadius: 24 }]}
          >
            <Text style={[styles.swapIcon, { color: accent }]}>⇅</Text>
          </TouchableOpacity>

          {/* To */}
          <View style={styles.resultRow}>
            <Text style={[styles.resultValue, { color: accent }]}>
              {formatNum(result)}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
              <View style={styles.unitRow}>
                {units.map((u, i) => (
                  <TouchableOpacity
                    key={u.symbol}
                    onPress={() => {
                      setToIdx(i);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor:
                          toIdx === i ? accent : colors.muted,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitSymbol,
                        {
                          color: toIdx === i ? "#FFFFFF" : colors.mutedForeground,
                        },
                      ]}
                    >
                      {u.symbol}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.unitLabel, { color: colors.mutedForeground }]}>
              {toUnit.label}
            </Text>
          </View>
        </View>

        {/* All conversions table */}
        <View style={[styles.tableCard, { marginHorizontal: 16, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.tableTitle, { color: colors.mutedForeground }]}>ALL CONVERSIONS</Text>
          {units.map((u) => {
            const val = u.fromBase(baseValue);
            return (
              <View key={u.symbol} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableLabel, { color: colors.mutedForeground }]}>
                  {u.label} ({u.symbol})
                </Text>
                <Text style={[styles.tableValue, { color: colors.foreground }]}>
                  {formatNum(val)}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  catBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  inputRow: {
    width: "100%",
    gap: 8,
  },
  valueInput: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 2,
    paddingBottom: 4,
    width: "100%",
  },
  unitScroll: {
    flexGrow: 0,
  },
  unitRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unitSymbol: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  unitLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  swapBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  swapIcon: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  resultRow: {
    width: "100%",
    gap: 8,
  },
  resultValue: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
  },
  tableCard: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    padding: 14,
    paddingBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  tableValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
