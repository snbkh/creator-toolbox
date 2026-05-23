import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image as RNImage,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path, Image as SvgImage, ClipPath, Defs, G } from "react-native-svg";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { saveImageToDevice, shareFile } from "@/utils/saveToDevice";

const ACCENT = "#A855F7";

const CHECKERBOARD_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABW3uiXAAAAL0lEQVR42mNkoBL4jwVjEwQpGKoGkGgoGBwhCsaqgSQaCoaCEaKgoGBwhCgYqgYAr7wOCW2H5kIAAAAASUVORK5CYII=";

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

type BgProvider = "local" | "removebg" | "manual_cutout";

export default function BackgroundRemoverScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    selectedBgProvider,
    setSelectedBgProvider,
    removeBgKey,
    addProcessedFile,
  } = useApp();

  const [activeMethod, setActiveMethod] = useState<BgProvider>(
    selectedBgProvider === "removebg" ? "removebg" : "local"
  );
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [previewBg, setPreviewBg] = useState<string>("checker");
  const [customColor, setCustomColor] = useState<string>("#FF3B30");
  const [showColorInput, setShowColorInput] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  // Manual Cutout States
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cutoutDone, setCutoutDone] = useState(false);
  const [brushWidth, setBrushWidth] = useState(4);
  const [frameSize, setFrameSize] = useState({ width: 320, height: 260 });

  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [loading]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 256],
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => activeMethod === "manual_cutout" && !cutoutDone,
    onMoveShouldSetPanResponder: () => activeMethod === "manual_cutout" && !cutoutDone,
    onPanResponderGrant: (evt) => {
      if (activeMethod !== "manual_cutout" || cutoutDone) return;
      const { locationX, locationY } = evt.nativeEvent;
      setPoints([{ x: locationX, y: locationY }]);
      setIsDrawing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderMove: (evt) => {
      if (activeMethod !== "manual_cutout" || cutoutDone) return;
      const { locationX, locationY } = evt.nativeEvent;
      setPoints((prev) => [...prev, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      if (activeMethod !== "manual_cutout" || cutoutDone) return;
      setIsDrawing(false);
    },
  });

  const getSvgPath = () => {
    if (points.length === 0) return "";
    let path = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i]!.x.toFixed(1)} ${points[i]!.y.toFixed(1)}`;
    }
    if (cutoutDone) {
      path += " Z";
    }
    return path;
  };

  const sanitizeColor = (color: string) => {
    let cleaned = color.trim();
    if (cleaned === "checker") return "transparent";
    if (/^[0-9A-F]{6}$/i.test(cleaned)) return `#${cleaned}`;
    if (/^[0-9A-F]{3}$/i.test(cleaned)) return `#${cleaned}`;
    if (!cleaned.startsWith("#") && cleaned.length > 0) return `#${cleaned}`;
    return cleaned || "transparent";
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize ?? 450 * 1024,
      });
      setProcessedUri(null);
      setPoints([]);
      setCutoutDone(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setLoading(true);

    if (activeMethod === "removebg") {
      if (!removeBgKey.trim()) {
        setLoading(false);
        Alert.alert(
          "API Key Required",
          "Please configure your Remove.bg API key in Settings to use the Cloud API.",
          [
            { text: "Go to Settings", onPress: () => router.push("/settings") },
            { text: "Use Free AI instead", onPress: () => setActiveMethod("local") },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      setLoadingStep("Uploading to Remove.bg...");
      try {
        const formData = new FormData();
        formData.append("image_file", {
          uri: image.uri,
          name: "image.jpg",
          type: "image/jpeg",
        } as any);
        formData.append("size", "auto");

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: { "X-Api-Key": removeBgKey },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "API call failed");
        }

        setLoadingStep("Processing response...");
        const blob = await response.blob();
        const base64: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("FileReader failed"));
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            resolve(resultStr.split(",")[1] || "");
          };
          reader.readAsDataURL(blob);
        });

        const outputUri = FileSystem.cacheDirectory + `no_bg_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(outputUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setProcessedUri(outputUri);
        addProcessedFile({
          name: `no_bg_${Date.now()}.png`,
          toolId: "background-remover",
          toolName: "Background Remover",
          originalSize: image.fileSize,
          processedSize: Math.round(image.fileSize * 0.75),
          type: "image",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        console.error(err);
        Alert.alert("Cloud Process Failed", err.message || "An error occurred with Remove.bg API.");
      } finally {
        setLoading(false);
      }
    } else if (activeMethod === "local") {
      try {
        setLoadingStep("Reading image file...");
        const base64Data = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mimeType = image.uri.endsWith(".png") ? "image/png" : "image/jpeg";
        const dataUri = `data:${mimeType};base64,${base64Data}`;

        setLoadingStep("Running AI Segmentation...");
        const response = await fetch("https://not-lain-background-removal.hf.space/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: [dataUri], fn_index: 0 }),
        });

        if (!response.ok) {
          throw new Error(`AI Engine returned status ${response.status}`);
        }

        const resJson = await response.json();
        const data = resJson.data;
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error("Could not parse transparent background data.");
        }

        const item = data[1] || data[0];
        let processedPath = "";
        if (typeof item === "string") {
          processedPath = item;
        } else if (item && typeof item === "object") {
          processedPath = item.path || item.url || "";
        }

        if (!processedPath) {
          throw new Error("Failed to extract cutout image.");
        }

        const downloadUrl = processedPath.startsWith("http")
          ? processedPath
          : `https://not-lain-background-removal.hf.space/file=${processedPath}`;

        setLoadingStep("Downloading cutout image...");
        const outputUri = FileSystem.cacheDirectory + `no_bg_${Date.now()}.png`;
        const downloadRes = await FileSystem.downloadAsync(downloadUrl, outputUri);

        setProcessedUri(downloadRes.uri);
        addProcessedFile({
          name: `free_no_bg_${Date.now()}.png`,
          toolId: "background-remover",
          toolName: "Background Remover",
          originalSize: image.fileSize,
          processedSize: Math.round(image.fileSize * 0.5),
          type: "image",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        console.error("Free AI background removal error:", err);
        Alert.alert(
          "Free AI Engine Offline",
          "The free AI server is currently busy or offline. Please draw a manual outline using the 'Manual Cutout' method for 100% offline operation.",
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!processedUri) return;
    setSaving(true);
    let saveUri = processedUri;

    if (previewBg !== "checker" && image) {
      try {
        const bgVal = sanitizeColor(previewBg);
        const info = await ImageManipulator.manipulateAsync(processedUri, []);
        const compositeResult = await ImageManipulator.manipulateAsync(
          processedUri,
          [
            {
              extent: {
                width: info.width,
                height: info.height,
                originX: 0,
                originY: 0,
                backgroundColor: bgVal,
              },
            },
          ],
          { format: ImageManipulator.SaveFormat.PNG }
        );
        saveUri = compositeResult.uri;
      } catch (err) {
        console.error("Failed to paint background color with extent:", err);
      }
    }

    const filename = previewBg === "checker" ? `no_bg_${Date.now()}.png` : `bg_replaced_${Date.now()}.png`;
    const res = await saveImageToDevice(saveUri, filename);
    setSaving(false);

    if (res === "saved") {
      Alert.alert("✅ Saved!", "Cutout image saved to gallery.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleExportManualCutout = async () => {
    if (!image || points.length < 3) return;
    setSaving(true);
    try {
      const base64Data = await FileSystem.readAsStringAsync(image.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = image.uri.endsWith(".png") ? "image/png" : "image/jpeg";

      const scaleX = image.width / frameSize.width;
      const scaleY = image.height / frameSize.height;

      const pathData = points
        .map((p, idx) => `${idx === 0 ? "M" : "L"} ${(p.x * scaleX).toFixed(1)} ${(p.y * scaleY).toFixed(1)}`)
        .join(" ") + " Z";

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.width} ${image.height}" width="${image.width}" height="${image.height}">
        <defs>
          <clipPath id="cutoutClip">
            <path d="${pathData}" fill="black" />
          </clipPath>
        </defs>
        <g clip-path="url(#cutoutClip)">
          <image href="data:${mime};base64,${base64Data}" width="${image.width}" height="${image.height}" />
        </g>
      </svg>`;

      const filename = `manual_cutout_${Date.now()}.svg`;
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, svgString, { encoding: FileSystem.EncodingType.UTF8 });

      const shareRes = await shareFile(fileUri, filename, "image/svg+xml");
      addProcessedFile({
        name: filename,
        toolId: "background-remover",
        toolName: "Background Remover (Manual)",
        originalSize: image.fileSize,
        processedSize: svgString.length,
        type: "image",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert("Export Failed", "Could not compile the cutout SVG file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader title="Background Remover" subtitle="Remove image backgrounds offline" accentColor={ACCENT} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        
        {/* Method Toggle Selector */}
        <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
          <Text style={[styles.toggleLabel, { color: colors.mutedForeground }]}>PROCESSING METHOD</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => { setActiveMethod("local"); setPoints([]); setCutoutDone(false); }}
              style={[styles.toggleBtn, { backgroundColor: activeMethod === "local" ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
            >
              <Text style={[styles.toggleBtnTxt, { color: activeMethod === "local" ? "#FFF" : colors.foreground }]}>Free AI</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => { setActiveMethod("manual_cutout"); setPoints([]); setCutoutDone(false); }}
              style={[styles.toggleBtn, { backgroundColor: activeMethod === "manual_cutout" ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
            >
              <Text style={[styles.toggleBtnTxt, { color: activeMethod === "manual_cutout" ? "#FFF" : colors.foreground }]}>Manual Cutout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setActiveMethod("removebg"); setPoints([]); setCutoutDone(false); }}
              style={[styles.toggleBtn, { backgroundColor: activeMethod === "removebg" ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
            >
              <Text style={[styles.toggleBtnTxt, { color: activeMethod === "removebg" ? "#FFF" : colors.foreground }]}>Pro Cloud</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!image ? (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.dropzone, { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, marginHorizontal: 16 }]}
          >
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "15", borderRadius: 16 }]}>
              <MaterialCommunityIcons name="image-remove" size={36} color={ACCENT} />
            </View>
            <Text style={[styles.dropTitle, { color: colors.foreground }]}>Select an Image</Text>
            <Text style={[styles.dropDesc, { color: colors.mutedForeground }]}>JPG, PNG, or WEBP supported</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Main Interactive Canvas Frame */}
            <View style={[styles.previewContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
                {activeMethod === "manual_cutout" ? "DRAW CONTOUR OUTLINE" : "IMAGE PREVIEW"}
              </Text>
              
              <View
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setFrameSize({ width, height });
                }}
                style={[styles.imageFrame, { backgroundColor: previewBg === "checker" ? "transparent" : previewBg }]}
                {...panResponder.panHandlers}
              >
                {previewBg === "checker" && (
                  <RNImage source={{ uri: CHECKERBOARD_BASE64 }} style={StyleSheet.absoluteFill} resizeMode="repeat" />
                )}

                {/* Normal preview or SVG clipped preview */}
                {activeMethod === "manual_cutout" && cutoutDone ? (
                  <View style={StyleSheet.absoluteFill}>
                    <Svg width={frameSize.width} height={frameSize.height}>
                      <Defs>
                        <ClipPath id="viewClip">
                          <Path d={getSvgPath()} fill="black" />
                        </ClipPath>
                      </Defs>
                      <G clipPath="url(#viewClip)">
                        <SvgImage href={image.uri} width={frameSize.width} height={frameSize.height} preserveAspectRatio="xMidYMid slice" />
                      </G>
                    </Svg>
                  </View>
                ) : (
                  <Image source={{ uri: processedUri || image.uri }} style={styles.previewImage} contentFit="contain" />
                )}

                {/* Draw Outline Overlay */}
                {activeMethod === "manual_cutout" && points.length > 0 && (
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg width={frameSize.width} height={frameSize.height}>
                      <Path
                        d={getSvgPath()}
                        fill={cutoutDone ? "transparent" : "transparent"}
                        stroke={ACCENT}
                        strokeWidth={brushWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((p, idx) => (
                        <Path key={idx} d={`M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y}`} stroke="#FFF" strokeWidth={2} />
                      ))}
                    </Svg>
                  </View>
                )}

                {loading && <Animated.View style={[styles.scanningLine, { transform: [{ translateY }] }]} />}
              </View>

              {/* Reset drawing buttons */}
              {activeMethod === "manual_cutout" && (
                <View style={styles.drawingControls}>
                  <TouchableOpacity
                    onPress={() => { setPoints([]); setCutoutDone(false); }}
                    style={[styles.drawBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.foreground} />
                    <Text style={{ color: colors.foreground, fontSize: 12 }}>Clear Path</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { if (points.length > 2) { setCutoutDone(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } }}
                    disabled={points.length < 3 || cutoutDone}
                    style={[styles.drawBtn, { backgroundColor: cutoutDone ? "#10B981" + "22" : ACCENT, borderRadius: 8 }]}
                  >
                    <Ionicons name="cut-outline" size={16} color={cutoutDone ? "#10B981" : "#FFF"} />
                    <Text style={{ color: cutoutDone ? "#10B981" : "#FFF", fontSize: 12 }}>Confirm Cutout</Text>
                  </TouchableOpacity>
                </View>
              )}

              {processedUri && (
                <View style={{ gap: 12 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose Background Color</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
                    <TouchableOpacity onPress={() => { setPreviewBg("checker"); setShowColorInput(false); }} style={[styles.colorCircle, { borderColor: previewBg === "checker" ? ACCENT : colors.border, borderWidth: previewBg === "checker" ? 3 : 1 }]}>
                      <Ionicons name="apps-outline" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                    {[
                      { hex: "#FFFFFF" }, { hex: "#000000" }, { hex: "#EF4444" }, { hex: "#3B82F6" }, { hex: "#10B981" }, { hex: "#F59E0B" }, { hex: "#8B5CF6" }
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        onPress={() => { setPreviewBg(item.hex); setShowColorInput(false); }}
                        style={[styles.colorCircle, { backgroundColor: item.hex, borderColor: previewBg === item.hex ? ACCENT : colors.border, borderWidth: previewBg === item.hex ? 3 : 1 }]}
                      />
                    ))}
                    <TouchableOpacity onPress={() => { setShowColorInput(true); setPreviewBg(customColor); }} style={[styles.colorCircle, { backgroundColor: "#E2E8F0", borderColor: showColorInput ? ACCENT : colors.border, borderWidth: showColorInput ? 3 : 1, justifyContent: "center", alignItems: "center" }]}>
                      <Ionicons name="color-palette-outline" size={18} color="#475569" />
                    </TouchableOpacity>
                  </ScrollView>

                  {showColorInput && (
                    <View style={[styles.customColorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.customColorLabel, { color: colors.mutedForeground }]}>ENTER CUSTOM HEX COLOR:</Text>
                      <View style={styles.hexInputRow}>
                        <Text style={[styles.hexHash, { color: colors.foreground }]}>#</Text>
                        <TextInput
                          style={[styles.hexInput, { color: colors.foreground, borderColor: colors.border }]}
                          value={customColor.replace("#", "")}
                          onChangeText={(val) => {
                            const cleaned = val.replace("#", "");
                            setCustomColor(`#${cleaned}`);
                            setPreviewBg(`#${cleaned}`);
                          }}
                          placeholder="FF3B30"
                          placeholderTextColor={colors.mutedForeground}
                          maxLength={6}
                        />
                        <View style={[styles.colorPreviewBubble, { backgroundColor: sanitizeColor(customColor) }]} />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Offline manual exporter button */}
            {activeMethod === "manual_cutout" ? (
              <TouchableOpacity
                onPress={handleExportManualCutout}
                disabled={points.length < 3 || saving}
                style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16 }]}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#FFF" />
                    <Text style={styles.btnTxt}>Export Offline Cutout SVG</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ marginHorizontal: 16, gap: 10 }}>
                {!processedUri ? (
                  <TouchableOpacity
                    onPress={processImage}
                    disabled={loading}
                    style={[styles.btn, { backgroundColor: ACCENT, borderRadius: colors.radius }]}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#FFF" />
                        <Text style={styles.btnTxt}>{loadingStep}</Text>
                      </View>
                    ) : (
                      <>
                        <Ionicons name="sparkles-outline" size={20} color="#FFF" />
                        <Text style={styles.btnTxt}>Remove Background</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={saving}
                      style={[styles.btn, { backgroundColor: "#10B981", borderRadius: colors.radius }]}
                    >
                      {saving ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <Ionicons name="download-outline" size={20} color="#FFF" />
                          <Text style={styles.btnTxt}>Save to Gallery</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => { setProcessedUri(null); setImage(null); }}
                      style={[styles.btnSec, { borderColor: colors.border, borderRadius: colors.radius }]}
                    >
                      <Ionicons name="refresh-outline" size={20} color={colors.foreground} />
                      <Text style={[styles.btnSecTxt, { color: colors.foreground }]}>Clear and Restart</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  toggleCard: { borderWidth: 1, padding: 12, gap: 8 },
  toggleLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  toggleRow: { flexDirection: "row", gap: 6 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  toggleBtnTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dropzone: { borderWidth: 2, borderStyle: "dashed", padding: 36, alignItems: "center", justifyContent: "center", gap: 12 },
  iconBox: { width: 68, height: 68, alignItems: "center", justifyContent: "center" },
  dropTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  dropDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  previewContainer: { borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  imageFrame: { height: 260, borderRadius: 10, overflow: "hidden", position: "relative", justifyContent: "center", alignItems: "center" },
  previewImage: { width: "100%", height: "100%" },
  scanningLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#A855F7",
    zIndex: 10,
  },
  drawingControls: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  drawBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, gap: 6 },
  colorScroll: { paddingVertical: 4, gap: 10, alignItems: "center" },
  colorCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 4 },
  customColorCard: { borderWidth: 1, padding: 12, borderRadius: 8, marginTop: 4, gap: 8 },
  customColorLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  hexInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hexHash: { fontSize: 18, fontFamily: "Inter_700Bold" },
  hexInput: { flex: 1, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  colorPreviewBubble: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  btnSec: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderWidth: 1, gap: 8, marginBottom: 12 },
  btnSecTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
