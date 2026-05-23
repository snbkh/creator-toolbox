import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { saveImageToDevice } from "@/utils/saveToDevice";

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

type UnitType = "px" | "inch" | "cm" | "mm";

const ASPECT_PRESETS = [
  { label: "Free", w: null, h: null },
  { label: "1:1", w: 1, h: 1 },
  { label: "4:3", w: 4, h: 3 },
  { label: "3:4", w: 3, h: 4 },
  { label: "16:9", w: 16, h: 9 },
  { label: "9:16", w: 9, h: 16 },
  { label: "2:3", w: 2, h: 3 },
  { label: "3:2", w: 3, h: 2 },
];

const DPI_PRESETS = [72, 96, 150, 300];
const ACCENT = "#8B5CF6";

export default function ImageCropperScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [unit, setUnit] = useState<UnitType>("px");
  const [dpi, setDpi] = useState<number>(300);
  const [targetWidth, setTargetWidth] = useState("800");
  const [targetHeight, setTargetHeight] = useState("800");
  const [lockAspect, setLockAspect] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("Free");

  // Screen display coordinates of the cropping layout
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [cropScale, setCropScale] = useState(0.8); // 0.1 to 1.0

  const [croppedUri, setCroppedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const panStart = useRef({ x: 0, y: 0 });

  // Pan responder to drag crop box
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      panStart.current = { x: cropX, y: cropY };
    },
    onPanResponderMove: (evt, gesture) => {
      if (displayW <= 0 || displayH <= 0) return;
      let nextX = panStart.current.x + gesture.dx;
      let nextY = panStart.current.y + gesture.dy;

      // Clamp inside image bounds
      nextX = Math.max(0, Math.min(displayW - cropW, nextX));
      nextY = Math.max(0, Math.min(displayH - cropH, nextY));

      setCropX(nextX);
      setCropY(nextY);
    },
  });

  // Calculate scaling factor from physical units to absolute px
  const getTargetDimensionsInPx = (): { w: number; h: number } => {
    const wVal = parseFloat(targetWidth) || 0;
    const hVal = parseFloat(targetHeight) || 0;
    if (unit === "px") {
      return { w: Math.round(wVal), h: Math.round(hVal) };
    }
    let factor = dpi;
    if (unit === "cm") factor = dpi / 2.54;
    else if (unit === "mm") factor = dpi / 25.4;

    return {
      w: Math.round(wVal * factor),
      h: Math.round(hVal * factor),
    };
  };

  const getActiveRatio = (): number | null => {
    if (selectedPreset !== "Free") {
      const preset = ASPECT_PRESETS.find((p) => p.label === selectedPreset);
      if (preset && preset.w && preset.h) {
        return preset.w / preset.h;
      }
    }
    if (lockAspect) {
      const wVal = parseFloat(targetWidth) || 0;
      const hVal = parseFloat(targetHeight) || 0;
      if (wVal > 0 && hVal > 0) return wVal / hVal;
    }
    return null;
  };

  // Adjust crop box size and position based on current settings and scale
  const adjustCropBox = (widthDisplay: number, heightDisplay: number, scale: number, ratio: number | null) => {
    if (widthDisplay <= 0 || heightDisplay <= 0) return;

    let boxW = widthDisplay;
    let boxH = heightDisplay;

    if (ratio) {
      const displayRatio = widthDisplay / heightDisplay;
      if (ratio > displayRatio) {
        boxW = widthDisplay * scale;
        boxH = boxW / ratio;
      } else {
        boxH = heightDisplay * scale;
        boxW = boxH * ratio;
      }
    } else {
      boxW = widthDisplay * scale;
      boxH = heightDisplay * scale;
    }

    // Centered initially
    const boxX = (widthDisplay - boxW) / 2;
    const boxY = (heightDisplay - boxH) / 2;

    setCropX(boxX);
    setCropY(boxY);
    setCropW(boxW);
    setCropH(boxH);
  };

  // Trigger crop box update when layout, preset, or scale changes
  useEffect(() => {
    if (displayW > 0 && displayH > 0) {
      adjustCropBox(displayW, displayH, cropScale, getActiveRatio());
    }
  }, [displayW, displayH, cropScale, selectedPreset, lockAspect, targetWidth, targetHeight]);

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
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize ?? 350 * 1024,
      });
      setTargetWidth(String(asset.width));
      setTargetHeight(String(asset.height));
      setUnit("px");
      setSelectedPreset("Free");
      setCropScale(0.8);
      setDone(false);
      setCroppedUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleUnitChange = (newUnit: UnitType) => {
    if (newUnit === unit) return;

    let pxW = parseFloat(targetWidth) || 0;
    let pxH = parseFloat(targetHeight) || 0;

    if (unit !== "px") {
      let currentFactor = dpi;
      if (unit === "cm") currentFactor = dpi / 2.54;
      else if (unit === "mm") currentFactor = dpi / 25.4;
      pxW = pxW * currentFactor;
      pxH = pxH * currentFactor;
    }

    let targetW = pxW;
    let targetH = pxH;
    if (newUnit !== "px") {
      let targetFactor = dpi;
      if (newUnit === "cm") targetFactor = dpi / 2.54;
      else if (newUnit === "mm") targetFactor = dpi / 25.4;
      targetW = pxW / targetFactor;
      targetH = pxH / targetFactor;
    }

    const decimals = newUnit === "px" ? 0 : 2;
    setTargetWidth(targetW.toFixed(decimals));
    setTargetHeight(targetH.toFixed(decimals));
    setUnit(newUnit);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDpiChange = (newDpi: number) => {
    if (newDpi === dpi) return;
    if (unit !== "px") {
      let factorPrev = dpi;
      if (unit === "cm") factorPrev = dpi / 2.54;
      else if (unit === "mm") factorPrev = dpi / 25.4;

      const pxW = (parseFloat(targetWidth) || 0) * factorPrev;
      const pxH = (parseFloat(targetHeight) || 0) * factorPrev;

      let factorNew = newDpi;
      if (unit === "cm") factorNew = newDpi / 2.54;
      else if (unit === "mm") factorNew = newDpi / 25.4;

      setTargetWidth((pxW / factorNew).toFixed(2));
      setTargetHeight((pxH / factorNew).toFixed(2));
    }
    setDpi(newDpi);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleWidthChange = (val: string) => {
    setTargetWidth(val);
    if (lockAspect && image && val) {
      const ratio = image.height / image.width;
      const numericVal = parseFloat(val) || 0;
      const decimals = unit === "px" ? 0 : 2;
      setTargetHeight((numericVal * ratio).toFixed(decimals));
    }
  };

  const handleHeightChange = (val: string) => {
    setTargetHeight(val);
    if (lockAspect && image && val) {
      const ratio = image.width / image.height;
      const numericVal = parseFloat(val) || 0;
      const decimals = unit === "px" ? 0 : 2;
      setTargetWidth((numericVal * ratio).toFixed(decimals));
    }
  };

  const applyPreset = (preset: typeof ASPECT_PRESETS[0]) => {
    setSelectedPreset(preset.label);
    if (preset.w && preset.h) {
      setLockAspect(true);
      const ratio = preset.w / preset.h;
      if (unit === "px") {
        const wNum = parseFloat(targetWidth) || 800;
        setTargetHeight(String(Math.round(wNum / ratio)));
      } else {
        const wNum = parseFloat(targetWidth) || 5;
        setTargetHeight((wNum / ratio).toFixed(2));
      }
    } else {
      setLockAspect(false);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const performCrop = async () => {
    if (!image || displayW <= 0 || displayH <= 0) return;
    setLoading(true);

    try {
      const origW = image.width;
      const origH = image.height;

      // Scale coordinates from display box back to original pixels
      const scaleX = origW / displayW;
      const scaleY = origH / displayH;

      const originX = Math.round(cropX * scaleX);
      const originY = Math.round(cropY * scaleY);
      const width = Math.round(cropW * scaleX);
      const height = Math.round(cropH * scaleY);

      // Clamp dimensions to ensure safety bounds
      const finalX = Math.max(0, Math.min(origW - 1, originX));
      const finalY = Math.max(0, Math.min(origH - 1, originY));
      const finalW = Math.max(1, Math.min(origW - finalX, width));
      const finalH = Math.max(1, Math.min(origH - finalY, height));

      const actions: ImageManipulator.Action[] = [
        { crop: { originX: finalX, originY: finalY, width: finalW, height: finalH } },
      ];

      const targetDims = getTargetDimensionsInPx();
      if (targetDims.w > 0 && targetDims.h > 0) {
        actions.push({ resize: { width: targetDims.w, height: targetDims.h } });
      }

      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        actions,
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );

      setCroppedUri(result.uri);
      setDone(true);
      addProcessedFile({
        name: `cropped_${targetDims.w}x${targetDims.h}.jpg`,
        toolId: "image-cropper",
        toolName: "Image Cropper",
        originalSize: image.fileSize,
        processedSize: Math.round(image.fileSize * (targetDims.w * targetDims.h) / (origW * origH)),
        type: "image",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert("Crop Failed", "Could not apply cropping parameters to image.");
    } finally {
      setLoading(false);
    }
  };

  const saveCropped = async () => {
    if (!croppedUri) return;
    setSaving(true);
    const targetDims = getTargetDimensionsInPx();
    const result = await saveImageToDevice(croppedUri, `cropped_${targetDims.w}x${targetDims.h}.jpg`);
    setSaving(false);
    if (result === "saved") {
      Alert.alert("✅ Saved!", "Cropped image saved to your 'Creator Toolbox' album.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const targetPx = getTargetDimensionsInPx();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Image Cropper" subtitle="Draggable crop canvas with physical unit standards" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        
        {!image ? (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 }]}
          >
            <View style={[styles.dropIcon, { backgroundColor: ACCENT + "15", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="crop" size={36} color={ACCENT} />
            </View>
            <Text style={[styles.dropTitle, { color: colors.foreground }]}>Select an Image</Text>
            <Text style={[styles.dropDesc, { color: colors.mutedForeground }]}>JPG, PNG, or WEBP supported</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Cropping Canvas Frame */}
            <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 }]}>
              <Text style={[styles.canvasTitle, { color: colors.mutedForeground }]}>DRAG OVERLAY TO REPOSITION CROP AREA</Text>
              
              <View style={styles.canvasWrapper}>
                <View
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    // Compute containing aspect constraints
                    const imgAspect = image.width / image.height;
                    const frameAspect = width / height;

                    if (imgAspect > frameAspect) {
                      setDisplayW(width);
                      setDisplayH(width / imgAspect);
                    } else {
                      setDisplayH(height);
                      setDisplayW(height * imgAspect);
                    }
                  }}
                  style={styles.imageFrame}
                >
                  {displayW > 0 && displayH > 0 && (
                    <View style={{ width: displayW, height: displayH, position: "relative" }}>
                      <ExpoImage source={{ uri: image.uri }} style={styles.sourceImg} contentFit="contain" />
                      
                      {/* SVG mask overlay leaving crop window clear */}
                      <Svg width={displayW} height={displayH} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Path
                          d={`M 0 0 L ${displayW} 0 L ${displayW} ${displayH} L 0 ${displayH} Z M ${cropX} ${cropY} L ${cropX} ${cropY + cropH} L ${cropX + cropW} ${cropY + cropH} L ${cropX + cropW} ${cropY} Z`}
                          fill="rgba(0,0,0,0.65)"
                          fillRule="evenodd"
                        />
                      </Svg>

                      {/* Interactive Draggable Bounding Crop Box */}
                      <View
                        style={[
                          styles.cropOverlay,
                          {
                            left: cropX,
                            top: cropY,
                            width: cropW,
                            height: cropH,
                          },
                        ]}
                        {...panResponder.panHandlers}
                      >
                        {/* Crop Box Borders & Corner Handles */}
                        <View style={styles.cropOutline} />
                        <View style={[styles.cornerHandle, { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                        <View style={[styles.cornerHandle, { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 }]} />
                        <View style={[styles.cornerHandle, { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                        <View style={[styles.cornerHandle, { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 }]} />
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Crop box scale factor adjustment */}
              <View style={styles.scaleContainer}>
                <Ionicons name="resize-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>Adjust Crop Window Size:</Text>
                <View style={styles.scaleRow}>
                  {[0.3, 0.5, 0.7, 0.9, 1.0].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setCropScale(s)}
                      style={[styles.scaleChip, { backgroundColor: cropScale === s ? ACCENT : colors.muted, borderRadius: 6 }]}
                    >
                      <Text style={[styles.scaleChipTxt, { color: cropScale === s ? "#FFF" : colors.foreground }]}>
                        {Math.round(s * 100)}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Quick aspect ratio presets */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ASPECT RATIO PRESETS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                {ASPECT_PRESETS.map((p) => {
                  const isActive = selectedPreset === p.label;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      onPress={() => applyPreset(p)}
                      style={[
                        styles.aspectPresetBtn,
                        {
                          backgroundColor: isActive ? ACCENT + "15" : colors.card,
                          borderColor: isActive ? ACCENT : colors.border,
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <Text style={[styles.aspectPresetTxt, { color: isActive ? ACCENT : colors.foreground }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Unit standard configurations */}
            <View style={{ gap: 10 }}>
              <View style={styles.unitTabs}>
                {([["px", "Pixels"], ["inch", "Inches"], ["cm", "CM"], ["mm", "MM"]] as [UnitType, string][]).map(([u, label]) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => handleUnitChange(u)}
                    style={[
                      styles.unitTab,
                      {
                        backgroundColor: unit === u ? ACCENT + "15" : colors.card,
                        borderColor: unit === u ? ACCENT : colors.border,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <Text style={[styles.unitTabTxt, { color: unit === u ? ACCENT : colors.foreground }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dimension Inputs Card */}
              <View style={[styles.dimCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <View style={styles.dimRow}>
                  <View style={styles.dimField}>
                    <Text style={[styles.dimLabel, { color: colors.mutedForeground }]}>CROP WIDTH ({unit})</Text>
                    <TextInput
                      style={[styles.dimInput, { color: colors.foreground, borderColor: ACCENT }]}
                      value={targetWidth}
                      onChangeText={handleWidthChange}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={[styles.dimX, { color: colors.mutedForeground }]}>×</Text>
                  <View style={styles.dimField}>
                    <Text style={[styles.dimLabel, { color: colors.mutedForeground }]}>CROP HEIGHT ({unit})</Text>
                    <TextInput
                      style={[styles.dimInput, { color: colors.foreground, borderColor: ACCENT }]}
                      value={targetHeight}
                      onChangeText={handleHeightChange}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Custom DPI options */}
                {unit !== "px" && (
                  <View style={styles.dpiContainer}>
                    <Text style={[styles.dimLabel, { color: colors.mutedForeground }]}>RESOLUTION (DPI)</Text>
                    <View style={styles.dpiRow}>
                      {DPI_PRESETS.map((d) => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => handleDpiChange(d)}
                          style={[styles.dpiPresetBtn, { backgroundColor: dpi === d ? ACCENT : colors.muted, borderRadius: 6 }]}
                        >
                          <Text style={[styles.dpiPresetTxt, { color: dpi === d ? "#FFF" : colors.foreground }]}>
                            {d} DPI
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={[styles.lockRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.lockLabel, { color: colors.foreground }]}>Lock Aspect Ratio</Text>
                  <Switch
                    value={lockAspect}
                    onValueChange={setLockAspect}
                    trackColor={{ false: colors.muted, true: ACCENT }}
                    thumbColor="#FFF"
                  />
                </View>
              </View>
            </View>

            {/* Target PX output info banner */}
            {targetPx.w > 0 && targetPx.h > 0 && (
              <View style={[styles.outputBanner, { backgroundColor: ACCENT + "10", borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Text style={[styles.outputBannerTxt, { color: ACCENT }]}>
                  Output Resolution: {targetPx.w} x {targetPx.h} px
                </Text>
                {unit !== "px" && (
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                    Conversions calculated at {dpi} DPI
                  </Text>
                )}
              </View>
            )}

            {/* Actions Panel */}
            <View style={{ marginHorizontal: 16, gap: 10 }}>
              <TouchableOpacity
                onPress={performCrop}
                disabled={loading || !targetPx.w || !targetPx.h}
                style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : done ? (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.btnTxt}>Image Cropped Successfully</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="crop" size={20} color="#FFF" />
                    <Text style={styles.btnTxt}>Apply Crop Area</Text>
                  </>
                )}
              </TouchableOpacity>

              {done && croppedUri && (
                <View style={{ gap: 10 }}>
                  <View style={[styles.resultFrame, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, padding: 12 }]}>
                    <ExpoImage source={{ uri: croppedUri }} style={styles.resultImg} contentFit="contain" />
                  </View>
                  <TouchableOpacity
                    onPress={saveCropped}
                    disabled={saving}
                    style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius }]}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={20} color="#FFF" />
                        <Text style={styles.btnTxt}>Save to Gallery</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setDone(false); setCroppedUri(null); }}
                    style={[styles.btnSec, { borderColor: colors.border, borderRadius: colors.radius }]}
                  >
                    <Ionicons name="refresh-outline" size={20} color={colors.foreground} />
                    <Text style={[styles.btnSecTxt, { color: colors.foreground }]}>Reset and Recrop</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

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
  dropIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  dropTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  dropDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  canvasCard: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  canvasTitle: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  canvasWrapper: {
    width: "100%",
    height: 280,
    backgroundColor: "#0A0A0F",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageFrame: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  sourceImg: {
    width: "100%",
    height: "100%",
  },
  cropOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  cropOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: "#FFF",
    borderStyle: "dashed",
  },
  cornerHandle: {
    position: "absolute",
    width: 14,
    height: 14,
    borderColor: "#FFF",
  },
  scaleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    gap: 6,
    flexWrap: "wrap",
  },
  scaleLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  scaleRow: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    justifyContent: "flex-end",
  },
  scaleChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  scaleChipTxt: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  presetsScroll: {
    gap: 6,
  },
  aspectPresetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  aspectPresetTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  unitTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 6,
  },
  unitTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1.5,
  },
  unitTabTxt: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  dimCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  dimField: {
    flex: 1,
    gap: 6,
  },
  dimLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  dimInput: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  dimX: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    marginTop: 20,
  },
  dpiContainer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    gap: 8,
  },
  dpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  dpiPresetBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  dpiPresetTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  lockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  lockLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  outputBanner: {
    padding: 12,
    alignItems: "center",
    gap: 2,
  },
  outputBannerTxt: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  btnTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  btnSec: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1.5,
  },
  btnSecTxt: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  resultFrame: {
    width: "100%",
    height: 240,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  resultImg: {
    width: "100%",
    height: "100%",
  },
});
