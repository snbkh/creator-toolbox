import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { ToolHeader } from "@/components/ToolHeader";
import { useColors } from "@/hooks/useColors";

interface PathData {
  d: string;
  color: string;
  width: number;
}

const PEN_COLORS = ["#000000", "#1a1a2e", "#8B5CF6", "#0EA5E9", "#10B981", "#EF4444"];
const PEN_WIDTHS = [2, 3, 5, 8];

export default function SignatureMakerScreen() {
  const colors = useColors();
  const [paths, setPaths] = useState<PathData[]>([]);
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const currentPath = useRef<string>("");

  const canvasSize = { width: 350, height: 220 };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      currentPath.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      currentPath.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
      setPaths((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.color === penColor && last.width === penWidth && last.d.startsWith(currentPath.current.split(" ")[0]!)) {
          updated[updated.length - 1] = { ...last, d: currentPath.current };
          return updated;
        }
        return [...updated, { d: currentPath.current, color: penColor, width: penWidth }];
      });
    },
    onPanResponderRelease: () => {
      currentPath.current = "";
    },
  });

  const clearCanvas = () => {
    Alert.alert("Clear Signature", "Remove all strokes?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setPaths([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const undo = () => {
    setPaths((prev) => prev.slice(0, -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Signature Maker"
        subtitle="Draw your digital signature"
        accentColor="#8B5CF6"
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Drawing Canvas */}
        <View style={[styles.canvasWrapper, { marginHorizontal: 16 }]}>
          <View
            style={[
              styles.canvas,
              {
                backgroundColor: "#FFFFFF",
                borderColor: colors.border,
                borderRadius: colors.radius,
                width: canvasSize.width,
                height: canvasSize.height,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Svg
              width={canvasSize.width}
              height={canvasSize.height}
              style={StyleSheet.absoluteFill}
            >
              {paths.map((p, i) => (
                <Path
                  key={i}
                  d={p.d}
                  stroke={p.color}
                  strokeWidth={p.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </Svg>
            {paths.length === 0 && (
              <View style={styles.canvasHint}>
                <Text style={styles.canvasHintText}>Draw your signature here</Text>
              </View>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={[styles.controlsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          {/* Pen Colors */}
          <View style={styles.controlSection}>
            <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>
              COLOR
            </Text>
            <View style={styles.colorRow}>
              {PEN_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setPenColor(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderColor: penColor === c ? colors.primary : colors.border,
                      borderWidth: penColor === c ? 2.5 : 1,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Pen Width */}
          <View style={[styles.controlSection, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>
              THICKNESS
            </Text>
            <View style={styles.widthRow}>
              {PEN_WIDTHS.map((w) => (
                <TouchableOpacity
                  key={w}
                  onPress={() => setPenWidth(w)}
                  style={[
                    styles.widthBtn,
                    {
                      backgroundColor:
                        penWidth === w ? colors.primary : colors.muted,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.widthDot,
                      {
                        width: w * 2,
                        height: w * 2,
                        borderRadius: w,
                        backgroundColor:
                          penWidth === w ? "#FFFFFF" : colors.mutedForeground,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={undo}
            disabled={paths.length === 0}
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: paths.length === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-undo-outline" size={18} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearCanvas}
            disabled={paths.length === 0}
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.destructive + "22",
                borderColor: colors.destructive,
                borderRadius: colors.radius,
                opacity: paths.length === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Signature Ready", "Take a screenshot to save your signature as an image.");
            }}
            disabled={paths.length === 0}
            style={[
              styles.actionBtnPrimary,
              {
                backgroundColor: paths.length > 0 ? colors.primary : colors.muted,
                borderRadius: colors.radius,
                flex: 1,
              },
            ]}
          >
            <Ionicons
              name="download-outline"
              size={18}
              color={paths.length > 0 ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.actionBtnText,
                {
                  color:
                    paths.length > 0
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === "web" && (
          <View style={[styles.webNote, { backgroundColor: colors.muted, borderRadius: colors.radius, marginHorizontal: 16 }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.webNoteText, { color: colors.mutedForeground }]}>
              Drawing works best on the mobile app
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvasWrapper: {
    alignItems: "center",
    marginVertical: 16,
  },
  canvas: {
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasHintText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#CCCCCC",
  },
  controlsCard: {
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  controlSection: {
    padding: 14,
    gap: 10,
  },
  controlLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  widthRow: {
    flexDirection: "row",
    gap: 10,
  },
  widthBtn: {
    width: 48,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  widthDot: {},
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  webNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 12,
  },
  webNoteText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
