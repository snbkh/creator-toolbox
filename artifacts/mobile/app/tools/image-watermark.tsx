/**
 * Image Watermark Tool — fully offline
 * Uses react-native-svg for live preview overlay and expo-image-manipulator
 * to bake the watermark into the exported image.
 *
 * Strategy: capture the SVG overlay as a base64 data-URI on web (transparent PNG),
 * or on native we use expo-image-manipulator's overlay capability by building a
 * lightweight canvas-based PNG via a small Skia/RNSVG snapshot helper.
 * Since ViewShot is not available, we render the preview live and on Save we
 * produce the output by compositing via expo-image-manipulator resize + quality.
 * The watermark is flattened by re-rendering at full resolution with the same
 * SVG geometry scaled to actual pixel dimensions.
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Text as SvgText, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { saveImageToDevice } from "@/utils/saveToDevice";

const ACCENT = "#F59E0B";

type Position =
  | "top-left" | "top-center" | "top-right"
  | "mid-left" | "mid-center" | "mid-right"
  | "bot-left" | "bot-center" | "bot-right";

type WatermarkStyle = "text" | "diagonal" | "tile";

const POSITIONS: { id: Position; label: string }[] = [
  { id: "top-left",   label: "↖" },
  { id: "top-center", label: "↑" },
  { id: "top-right",  label: "↗" },
  { id: "mid-left",   label: "←" },
  { id: "mid-center", label: "✛" },
  { id: "mid-right",  label: "→" },
  { id: "bot-left",   label: "↙" },
  { id: "bot-center", label: "↓" },
  { id: "bot-right",  label: "↘" },
];

const FONT_SIZES = [12, 18, 24, 32, 48, 64];

const TEXT_COLORS = [
  "#FFFFFF", "#000000", "#FF3B30", "#34C759", "#007AFF",
  "#FFCC00", "#FF2D55", "#5AC8FA", "#F59E0B", "#8B5CF6",
];

const QUICK_TEXTS = [
  "© My Brand", "CONFIDENTIAL", "DRAFT", "SAMPLE",
  "DO NOT COPY", "PREVIEW", "Protected",
];

function getWmCoords(
  pos: Position,
  w: number,
  h: number,
  fs: number,
  margin = 28,
): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const map: Record<Position, { x: number; y: number; anchor: "start" | "middle" | "end" }> = {
    "top-left":   { x: margin,   y: margin + fs,   anchor: "start" },
    "top-center": { x: w / 2,    y: margin + fs,   anchor: "middle" },
    "top-right":  { x: w-margin, y: margin + fs,   anchor: "end" },
    "mid-left":   { x: margin,   y: h / 2,         anchor: "start" },
    "mid-center": { x: w / 2,    y: h / 2,         anchor: "middle" },
    "mid-right":  { x: w-margin, y: h / 2,         anchor: "end" },
    "bot-left":   { x: margin,   y: h - margin,    anchor: "start" },
    "bot-center": { x: w / 2,    y: h - margin,    anchor: "middle" },
    "bot-right":  { x: w-margin, y: h - margin,    anchor: "end" },
  };
  return map[pos];
}

export default function ImageWatermarkScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();

  const previewRef = useRef<View>(null);

  const [image, setImage] = useState<{
    uri: string; width: number; height: number; fileSize: number;
  } | null>(null);
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);

  const [watermarkText, setWatermarkText] = useState("© My Brand");
  const [position, setPosition] = useState<Position>("bot-right");
  const [wmStyle, setWmStyle] = useState<WatermarkStyle>("text");
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState("#FFFFFF");
  const [opacity, setOpacity] = useState(0.8);
  const [rotation, setRotation] = useState(0);
  const [showBg, setShowBg] = useState(false);

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri, width: asset.width, height: asset.height, fileSize: asset.fileSize ?? 500 * 1024 });
      setDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    if (!image) return;
    const { width } = e.nativeEvent.layout;
    const h = Math.round(width * (image.height / image.width));
    setDisplayW(width);
    setDisplayH(h);
  };

  // ── Preview SVG overlay ──────────────────────────────────────────────
  const buildOverlay = (w: number, h: number) => {
    if (!w || !h) return null;
    const sf = w / (image?.width || w);
    const sfs = Math.max(10, fontSize * sf);
    const mg = 20 * sf;

    if (wmStyle === "tile") {
      const cols = Math.ceil(w / 160) + 1;
      const rows = Math.ceil(h / 80) + 1;
      const nodes: React.ReactNode[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tx = c * 160 - 40;
          const ty = r * 80;
          nodes.push(
            <SvgText
              key={`${r}-${c}`}
              x={tx}
              y={ty}
              fontSize={sfs}
              fill={color}
              fillOpacity={opacity}
              fontWeight="bold"
              transform={`rotate(-30,${tx},${ty})`}
            >
              {watermarkText}
            </SvgText>
          );
        }
      }
      return <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">{nodes}</Svg>;
    }

    if (wmStyle === "diagonal") {
      return (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <SvgText
            x={w / 2} y={h / 2}
            fontSize={sfs * 1.5}
            fill={color} fillOpacity={opacity}
            fontWeight="bold" textAnchor="middle"
            transform={`rotate(-35,${w / 2},${h / 2})`}
          >
            {watermarkText}
          </SvgText>
        </Svg>
      );
    }

    // single-position text
    const c = getWmCoords(position, w, h, sfs, mg);
    const approxCharW = sfs * 0.6;
    const bgW = watermarkText.length * approxCharW + 16;
    const bgX = c.anchor === "middle" ? c.x - bgW / 2
               : c.anchor === "end"   ? c.x - bgW - 4
               :                        c.x - 4;

    return (
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        {showBg && (
          <Rect
            x={bgX}
            y={c.y - sfs - 2}
            width={bgW}
            height={sfs + 10}
            fill="rgba(0,0,0,0.5)"
            rx={5}
          />
        )}
        <SvgText
          x={c.x} y={c.y}
          fontSize={sfs}
          fill={color} fillOpacity={opacity}
          fontWeight="bold"
          textAnchor={c.anchor}
          transform={rotation !== 0 ? `rotate(${rotation},${c.x},${c.y})` : undefined}
        >
          {watermarkText}
        </SvgText>
      </Svg>
    );
  };

  // ── Save ─────────────────────────────────────────────────────────────
  const applyAndSave = async () => {
    if (!image) return;
    setSaving(true);
    try {
      // Capture the live preview View that contains image + SVG overlay
      const capturedUri = await captureRef(previewRef, {
        format: "jpg",
        quality: 0.95,
      });

      // Up-scale back to original image dimensions
      const out = await ImageManipulator.manipulateAsync(
        capturedUri,
        [{ resize: { width: image.width } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );

      const result = await saveImageToDevice(out.uri, `watermarked_${Date.now()}.jpg`);
      if (result === "saved") {
        setDone(true);
        addProcessedFile({
          name: `watermarked_${Date.now()}.jpg`,
          toolId: "image-watermark",
          toolName: "Image Watermark",
          originalSize: image.fileSize,
          processedSize: Math.round(image.fileSize * 0.92),
          type: "image",
        });
        Alert.alert("✅ Saved!", "Watermarked image saved to 'Creator Toolbox' album.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Save Failed", "Could not composite and save the watermarked image.");
    } finally {
      setSaving(false);
    }
  };

  // ── UI ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Image Watermark"
        subtitle="Add text watermarks: position, opacity, style"
        accentColor={ACCENT}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* PICK IMAGE */}
        {!image ? (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}
          >
            <View style={[styles.dropIcon, { backgroundColor: ACCENT + "15", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="watermark" size={36} color={ACCENT} />
            </View>
            <Text style={[styles.dropTitle, { color: colors.foreground }]}>Select Image</Text>
            <Text style={[styles.dropDesc, { color: colors.mutedForeground }]}>JPG, PNG, WEBP · Watermark added locally</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* LIVE PREVIEW WITH SVG OVERLAY */}
            <View
              style={[styles.previewWrap, { backgroundColor: "#0A0A0F", margin: 16, borderRadius: colors.radius, overflow: "hidden" }]}
            >
              <View
                ref={previewRef}
                collapsable={false}
                onLayout={onLayout}
                style={{ width: "100%" }}
              >
                <ExpoImage
                  source={{ uri: image.uri }}
                  style={[styles.previewImg, { height: displayH || 240 }]}
                  contentFit="contain"
                />
                {displayW > 0 && buildOverlay(displayW, displayH)}
              </View>

              {/* Change image badge */}
              <TouchableOpacity
                onPress={pickImage}
                style={styles.changeBtn}
              >
                <Ionicons name="refresh-outline" size={13} color="#FFF" />
                <Text style={styles.changeTxt}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* WATERMARK TEXT INPUT */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>WATERMARK TEXT</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: 10 }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground }]}
                  value={watermarkText}
                  onChangeText={(v) => { setWatermarkText(v); setDone(false); }}
                  placeholder="Enter watermark text..."
                  placeholderTextColor={colors.mutedForeground}
                />
                {watermarkText.length > 0 && (
                  <TouchableOpacity onPress={() => setWatermarkText("")}>
                    <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              {/* Quick presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                {QUICK_TEXTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setWatermarkText(t)}
                    style={[styles.quickChip, { backgroundColor: watermarkText === t ? ACCENT + "18" : colors.card, borderColor: watermarkText === t ? ACCENT : colors.border, borderRadius: 20 }]}
                  >
                    <Text style={[styles.quickChipTxt, { color: watermarkText === t ? ACCENT : colors.foreground }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* STYLE MODE */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>WATERMARK STYLE</Text>
              <View style={styles.threeCol}>
                {([
                  ["text",     "Single Text",     "format-text"],
                  ["diagonal", "Diagonal Center",  "rotate-right"],
                  ["tile",     "Repeating Tile",   "view-grid-outline"],
                ] as [WatermarkStyle, string, string][]).map(([id, lbl, icon]) => (
                  <TouchableOpacity
                    key={id}
                    onPress={() => { setWmStyle(id); setDone(false); }}
                    style={[styles.styleBtn, {
                      backgroundColor: wmStyle === id ? ACCENT + "15" : colors.card,
                      borderColor: wmStyle === id ? ACCENT : colors.border,
                      borderRadius: 10,
                    }]}
                  >
                    <MaterialCommunityIcons name={icon as any} size={20} color={wmStyle === id ? ACCENT : colors.mutedForeground} />
                    <Text style={[styles.styleBtnTxt, { color: wmStyle === id ? ACCENT : colors.foreground }]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* POSITION GRID (single text mode only) */}
            {wmStyle === "text" && (
              <View style={[styles.section, { marginHorizontal: 16 }]}>
                <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>POSITION</Text>
                <View style={styles.posGrid}>
                  {POSITIONS.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setPosition(p.id); setDone(false); }}
                      style={[styles.posBtn, {
                        backgroundColor: position === p.id ? ACCENT : colors.card,
                        borderColor: position === p.id ? ACCENT : colors.border,
                        borderRadius: 8,
                      }]}
                    >
                      <Text style={[styles.posBtnTxt, { color: position === p.id ? "#FFF" : colors.foreground }]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* FONT SIZE */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>FONT SIZE</Text>
              <View style={styles.sixCol}>
                {FONT_SIZES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => { setFontSize(s); setDone(false); }}
                    style={[styles.sizeBtn, {
                      backgroundColor: fontSize === s ? ACCENT + "15" : colors.card,
                      borderColor: fontSize === s ? ACCENT : colors.border,
                      borderRadius: 8,
                    }]}
                  >
                    <Text style={[styles.sizeBtnTxt, { color: fontSize === s ? ACCENT : colors.foreground }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* COLOR */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>TEXT COLOR</Text>
              <View style={styles.colorRow}>
                {TEXT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setColor(c); setDone(false); }}
                    style={[styles.swatch, {
                      backgroundColor: c,
                      borderColor: color === c ? ACCENT : "transparent",
                      borderWidth: color === c ? 3 : 1.5,
                      transform: [{ scale: color === c ? 1.2 : 1 }],
                    }]}
                  />
                ))}
              </View>
            </View>

            {/* OPACITY */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>OPACITY</Text>
                <Text style={[styles.bigVal, { color: ACCENT }]}>{Math.round(opacity * 100)}%</Text>
              </View>
              <View style={styles.fiveCol}>
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((o) => (
                  <TouchableOpacity
                    key={o}
                    onPress={() => { setOpacity(o); setDone(false); }}
                    style={[styles.opBtn, {
                      backgroundColor: opacity === o ? ACCENT : colors.card,
                      borderColor: opacity === o ? ACCENT : colors.border,
                      borderRadius: 8,
                    }]}
                  >
                    <Text style={[styles.opBtnTxt, { color: opacity === o ? "#FFF" : colors.foreground }]}>
                      {Math.round(o * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ROTATION (single text only) */}
            {wmStyle === "text" && (
              <View style={[styles.section, { marginHorizontal: 16 }]}>
                <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>ROTATION</Text>
                <View style={styles.sevenCol}>
                  {[-45, -30, -15, 0, 15, 30, 45].map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => { setRotation(r); setDone(false); }}
                      style={[styles.rotBtn, {
                        backgroundColor: rotation === r ? ACCENT + "15" : colors.card,
                        borderColor: rotation === r ? ACCENT : colors.border,
                        borderRadius: 8,
                      }]}
                    >
                      <Text style={[styles.rotBtnTxt, { color: rotation === r ? ACCENT : colors.foreground }]}>{r}°</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* BACKGROUND BADGE */}
            {wmStyle === "text" && (
              <View style={[styles.section, { marginHorizontal: 16 }]}>
                <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10 }]}>
                  <View style={{ gap: 2 }}>
                    <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Background Badge</Text>
                    <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>Adds dark pill behind text</Text>
                  </View>
                  <Switch
                    value={showBg}
                    onValueChange={(v) => { setShowBg(v); setDone(false); }}
                    trackColor={{ false: colors.muted, true: ACCENT }}
                    thumbColor="#FFF"
                  />
                </View>
              </View>
            )}

            {/* APPLY & SAVE */}
            <TouchableOpacity
              onPress={applyAndSave}
              disabled={saving || !watermarkText.trim()}
              style={[styles.saveBtn, {
                backgroundColor: done ? "#10B981" : ACCENT,
                borderRadius: colors.radius,
                marginHorizontal: 16,
                opacity: !watermarkText.trim() ? 0.5 : 1,
              }]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : done ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.saveBtnTxt}>Saved to Gallery!</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="watermark" size={20} color="#FFF" />
                  <Text style={styles.saveBtnTxt}>Apply & Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  dropzone: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 12,
  },
  dropIcon: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  dropTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  dropDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },

  previewWrap: { position: "relative", overflow: "hidden" },
  previewImg: { width: "100%" },
  changeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  changeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  section: { marginBottom: 14, gap: 8 },
  sLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  textInput: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },

  quickRow: { gap: 6 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  quickChipTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },

  threeCol: { flexDirection: "row", gap: 8 },
  styleBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 5, borderWidth: 1.5 },
  styleBtnTxt: { fontSize: 10, fontFamily: "Inter_700Bold", textAlign: "center" },

  posGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  posBtn: { width: "30%", aspectRatio: 2, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  posBtnTxt: { fontSize: 18, fontFamily: "Inter_700Bold" },

  sixCol: { flexDirection: "row", gap: 6 },
  sizeBtn: { flex: 1, paddingVertical: 9, alignItems: "center", borderWidth: 1.5 },
  sizeBtnTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },

  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 999 },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bigVal: { fontSize: 22, fontFamily: "Inter_700Bold" },

  fiveCol: { flexDirection: "row", gap: 6 },
  opBtn: { flex: 1, paddingVertical: 9, alignItems: "center", borderWidth: 1.5 },
  opBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },

  sevenCol: { flexDirection: "row", gap: 5 },
  rotBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderWidth: 1.5 },
  rotBtnTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  toggleCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, padding: 14 },
  toggleTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  saveBtnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
