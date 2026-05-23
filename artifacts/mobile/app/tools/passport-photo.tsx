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
  Text,
  TouchableOpacity,
  View,
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

const PHOTO_PRESETS = [
  { id: "us_passport", country: "USA / India", label: "Passport", dims: "2×2 inch", px: "600×600", maxKB: 240 },
  { id: "uk_passport", country: "UK", label: "UK Passport", dims: "35×45mm", px: "413×531", maxKB: 200 },
  { id: "schengen", country: "Schengen/EU", label: "EU Visa", dims: "35×45mm", px: "413×531", maxKB: 150 },
  { id: "india_govt", country: "India", label: "Govt Forms", dims: "3.5×4.5cm", px: "413×531", maxKB: 50 },
  { id: "india_exam", country: "India", label: "Exam Photo", dims: "3.5×4.5cm", px: "200×230", maxKB: 50 },
  { id: "canada", country: "Canada", label: "Canada PR", dims: "50×70mm", px: "590×826", maxKB: 300 },
  { id: "australia", country: "Australia", label: "Australia Visa", dims: "45×35mm", px: "531×413", maxKB: 200 },
  { id: "id_2x2", country: "General", label: "ID Card 2x2", dims: "51×51mm", px: "600×600", maxKB: 100 },
];

const ACCENT = "#8B5CF6";

export default function PassportPhotoScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [selectedPreset, setSelectedPreset] = useState("us_passport");
  const [image, setImage] = useState<ImageInfo | null>(null);
  
  // Crop canvas coordinate states
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [cropScale, setCropScale] = useState(0.85);

  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const panStart = useRef({ x: 0, y: 0 });
  const preset = PHOTO_PRESETS.find((p) => p.id === selectedPreset)!;

  // Pan Responder for crop box dragging
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

      nextX = Math.max(0, Math.min(displayW - cropW, nextX));
      nextY = Math.max(0, Math.min(displayH - cropH, nextY));

      setCropX(nextX);
      setCropY(nextY);
    },
  });

  const adjustCropBox = (widthDisplay: number, heightDisplay: number, scale: number, ratio: number) => {
    if (widthDisplay <= 0 || heightDisplay <= 0) return;

    let boxW = widthDisplay;
    let boxH = heightDisplay;

    const displayRatio = widthDisplay / heightDisplay;
    if (ratio > displayRatio) {
      boxW = widthDisplay * scale;
      boxH = boxW / ratio;
    } else {
      boxH = heightDisplay * scale;
      boxW = boxH * ratio;
    }

    const boxX = (widthDisplay - boxW) / 2;
    const boxY = (heightDisplay - boxH) / 2;

    setCropX(boxX);
    setCropY(boxY);
    setCropW(boxW);
    setCropH(boxH);
  };

  useEffect(() => {
    if (displayW > 0 && displayH > 0 && image) {
      const [wStr, hStr] = preset.px.split("×");
      const targetW = parseInt(wStr || "600", 10);
      const targetH = parseInt(hStr || "600", 10);
      adjustCropBox(displayW, displayH, cropScale, targetW / targetH);
    }
  }, [displayW, displayH, cropScale, selectedPreset, image]);

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!r.canceled && r.assets[0]) {
      const asset = r.assets[0];
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize ?? 500 * 1024,
      });
      setDone(false);
      setProcessedUri(null);
      setCropScale(0.85);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const process = async () => {
    if (!image || displayW <= 0 || displayH <= 0) return;
    setLoading(true);
    try {
      const [wStr, hStr] = preset.px.split("×");
      const targetW = parseInt(wStr || "600", 10);
      const targetH = parseInt(hStr || "600", 10);

      const origW = image.width;
      const origH = image.height;

      const scaleX = origW / displayW;
      const scaleY = origH / displayH;

      const originX = Math.round(cropX * scaleX);
      const originY = Math.round(cropY * scaleY);
      const width = Math.round(cropW * scaleX);
      const height = Math.round(cropH * scaleY);

      // Clamp dimensions to ensure boundaries safety
      const finalX = Math.max(0, Math.min(origW - 1, originX));
      const finalY = Math.max(0, Math.min(origH - 1, originY));
      const finalW = Math.max(1, Math.min(origW - finalX, width));
      const finalH = Math.max(1, Math.min(origH - finalY, height));

      const result = await ImageManipulator.manipulateAsync(
        image.uri,
        [
          { crop: { originX: finalX, originY: finalY, width: finalW, height: finalH } },
          { resize: { width: targetW, height: targetH } },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      setProcessedUri(result.uri);
      setDone(true);
      addProcessedFile({
        name: `${preset.label.replace(/ /g, "_")}_photo.jpg`,
        toolId: "passport-photo",
        toolName: "Passport Photo Maker",
        originalSize: image.fileSize,
        processedSize: Math.round(image.fileSize * (targetW * targetH) / (origW * origH)),
        type: "image",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert("Processing Failed", "Could not create passport photo.");
    } finally {
      setLoading(false);
    }
  };

  const savePhoto = async () => {
    if (!processedUri) return;
    setSaving(true);
    const r = await saveImageToDevice(processedUri, `${preset.label.replace(/ /g, "_")}_photo.jpg`);
    setSaving(false);
    if (r === "saved") {
      Alert.alert("✅ Saved!", "Passport photo saved to gallery in 'Creator Toolbox' album.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Passport Photo Maker" subtitle="Create photos for any country standard" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        
        {/* Preset Selector */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SELECT COUNTRY / PURPOSE STANDARD</Text>
          {PHOTO_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => { setSelectedPreset(p.id); setDone(false); }}
              style={[
                styles.presetItem,
                {
                  borderColor: selectedPreset === p.id ? ACCENT : colors.border,
                  backgroundColor: selectedPreset === p.id ? ACCENT + "11" : "transparent",
                  borderRadius: 10,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetName, { color: selectedPreset === p.id ? ACCENT : colors.foreground }]}>{p.label}</Text>
                <Text style={[styles.presetCountry, { color: colors.mutedForeground }]}>
                  {p.country} · {p.dims} · Max {p.maxKB} KB
                </Text>
              </View>
              <View style={[styles.sizeTag, { backgroundColor: selectedPreset === p.id ? ACCENT : colors.muted, borderRadius: 6 }]}>
                <Text style={[styles.sizeTagTxt, { color: selectedPreset === p.id ? "#FFF" : colors.mutedForeground }]}>{p.px}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Picker or Crop Canvas */}
        {!image ? (
          <TouchableOpacity
            onPress={pick}
            style={[styles.pickZone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}
          >
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "22", borderRadius: 16 }]}>
              <MaterialCommunityIcons name="camera-plus-outline" size={36} color={ACCENT} />
            </View>
            <Text style={[styles.pickTitle, { color: colors.foreground }]}>Pick Photo</Text>
            <Text style={[styles.pickDesc, { color: colors.mutedForeground }]}>Align and crop to required specifications</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Crop Canvas Pro Card */}
            <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.canvasTitle, { color: colors.mutedForeground }]}>ALIGN FACE WITHIN THE HIGH-LIGHTED AREA</Text>
              
              <View style={styles.canvasWrapper}>
                <View
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
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

                      {/* Path Overlay window */}
                      <Svg width={displayW} height={displayH} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Path
                          d={`M 0 0 L ${displayW} 0 L ${displayW} ${displayH} L 0 ${displayH} Z M ${cropX} ${cropY} L ${cropX} ${cropY + cropH} L ${cropX + cropW} ${cropY + cropH} L ${cropX + cropW} ${cropY} Z`}
                          fill="rgba(0,0,0,0.65)"
                          fillRule="evenodd"
                        />
                      </Svg>

                      {/* Draggable Bounding Box */}
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
                        <View style={styles.cropOutline} />
                        {/* Guideline Face Profile indicator inside passport crop */}
                        <MaterialCommunityIcons name="face-recognition" size={32} color="rgba(255,255,255,0.4)" />
                        
                        <View style={[styles.cornerHandle, { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                        <View style={[styles.cornerHandle, { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 }]} />
                        <View style={[styles.cornerHandle, { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                        <View style={[styles.cornerHandle, { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 }]} />
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Adjust Scale Controls */}
              <View style={styles.scaleContainer}>
                <Text style={[styles.scaleLabel, { color: colors.mutedForeground }]}>Face Zoom Adjust:</Text>
                <View style={styles.scaleRow}>
                  {[0.4, 0.6, 0.75, 0.9, 1.0].map((s) => (
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

              <View style={styles.previewInfo}>
                <View>
                  <Text style={[styles.previewTitle, { color: colors.foreground }]}>{preset.label} Standard</Text>
                  <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>
                    Output Dimensions: {preset.px} px · {preset.dims}
                  </Text>
                </View>
                <TouchableOpacity onPress={pick} style={[styles.changeBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                  <MaterialCommunityIcons name="refresh" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {image && (
          <View style={{ marginHorizontal: 16, gap: 10 }}>
            <TouchableOpacity
              onPress={process}
              disabled={loading}
              style={[styles.btn, { backgroundColor: done ? "#10B981" : ACCENT, borderRadius: colors.radius }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "card-account-details-outline"} size={20} color="#FFF" />
                  <Text style={styles.btnTxt}>{done ? "Photo Ready!" : `Create ${preset.label} Photo`}</Text>
                </>
              )}
            </TouchableOpacity>

            {done && processedUri && (
              <View style={{ gap: 10 }}>
                <View style={[styles.resultFrame, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, padding: 12 }]}>
                  <ExpoImage source={{ uri: processedUri }} style={styles.resultImg} contentFit="contain" />
                </View>
                <TouchableOpacity
                  onPress={savePhoto}
                  disabled={saving}
                  style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius }]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="download" size={20} color="#FFF" />
                      <Text style={styles.btnTxt}>Save to Gallery</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 8 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  presetItem: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1.5, gap: 10, marginBottom: 6 },
  presetName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  presetCountry: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  sizeTag: { paddingHorizontal: 8, paddingVertical: 4 },
  sizeTagTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pickZone: { alignItems: "center", padding: 40, borderWidth: 2, borderStyle: "dashed", gap: 10, marginBottom: 12 },
  iconBox: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  pickTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  pickDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
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
    height: 320,
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
  previewInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  previewTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  previewSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  changeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
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
