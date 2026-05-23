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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { saveImageToDevice } from "@/utils/saveToDevice";

const ACCENT = "#A855F7"; // Purple accent for background remover

// 12x12 checkerboard pattern PNG base64 representation
const CHECKERBOARD_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABW3uiXAAAAL0lEQVR42mNkoBL4jwVjEwQpGKoGkGgoGBwhCsaqgSQaCoaCEaKgoGBwhCgYqgYAr7wOCW2H5kIAAAAASUVORK5CYII=";

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

export default function BackgroundRemoverScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    selectedBgProvider,
    setSelectedBgProvider,
    removeBgKey,
    addProcessedFile,
  } = useApp();

  const [image, setImage] = useState<ImageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [previewBg, setPreviewBg] = useState<string>("checker");
  const [customColor, setCustomColor] = useState<string>("#FF3B30");
  const [showColorInput, setShowColorInput] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [loading]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 256], // 260px is the height of imageFrame, 256 keeps it bounds-aligned
  });

  const sanitizeColor = (color: string) => {
    let cleaned = color.trim();
    if (cleaned === "checker") return "transparent";
    if (/^[0-9A-F]{6}$/i.test(cleaned)) {
      return `#${cleaned}`;
    }
    if (/^[0-9A-F]{3}$/i.test(cleaned)) {
      return `#${cleaned}`;
    }
    if (!cleaned.startsWith("#") && cleaned.length > 0) {
      return `#${cleaned}`;
    }
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setLoading(true);

    if (selectedBgProvider === "removebg") {
      if (!removeBgKey.trim()) {
        setLoading(false);
        Alert.alert(
          "API Key Required",
          "Please configure your Remove.bg API key in Settings to use the Cloud API.",
          [
            { text: "Go to Settings", onPress: () => router.push("/settings") },
            { text: "Use Local Engine instead", onPress: () => setSelectedBgProvider("local") },
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
          headers: {
            "X-Api-Key": removeBgKey,
          },
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
        Alert.alert(
          "Cloud Process Failed",
          err.message || "An error occurred with Remove.bg API. Please try again or switch to Local Engine."
        );
      } finally {
        setLoading(false);
      }
    } else {
      // Free AI Engine using BiRefNet model on Hugging Face
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: [dataUri],
            fn_index: 0,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI Engine returned status ${response.status}`);
        }

        const resJson = await response.json();
        const data = resJson.data;
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error("Could not parse transparent background data.");
        }

        // Extract the path of the processed image from the slider output (second item)
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
          "The free AI server is currently busy or offline. Please try again or switch to Cloud (Remove.bg) in settings.",
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

    // Composite onto custom background color if not transparent
    if (previewBg !== "checker" && image) {
      try {
        const bgVal = sanitizeColor(previewBg);
        
        // Dynamically measure the processed image dimensions first
        const info = await ImageManipulator.manipulateAsync(processedUri, []);
        const processedWidth = info.width;
        const processedHeight = info.height;

        const compositeResult = await ImageManipulator.manipulateAsync(
          processedUri,
          [
            {
              extent: {
                width: processedWidth,
                height: processedHeight,
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
      Alert.alert(
        "✅ Saved!",
        previewBg === "checker"
          ? "Transparent background image saved to gallery."
          : "Image saved to gallery with chosen background color."
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (res === "shared") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Background Remover"
        subtitle="Remove image backgrounds instantly"
        accentColor={ACCENT}
      />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Engine toggle */}
        <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, margin: 16 }]}>
          <Text style={[styles.toggleLabel, { color: colors.mutedForeground }]}>PROCESSING METHOD</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setSelectedBgProvider("local")}
              style={[styles.toggleBtn, { backgroundColor: selectedBgProvider === "local" ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
            >
              <Ionicons name="sparkles-outline" size={16} color={selectedBgProvider === "local" ? "#FFF" : colors.mutedForeground} />
              <Text style={[styles.toggleBtnTxt, { color: selectedBgProvider === "local" ? "#FFF" : colors.foreground }]}>Free AI (BiRefNet)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedBgProvider("removebg")}
              style={[styles.toggleBtn, { backgroundColor: selectedBgProvider === "removebg" ? ACCENT : "transparent", borderRadius: colors.radius - 4 }]}
            >
              <Ionicons name="rocket-outline" size={16} color={selectedBgProvider === "removebg" ? "#FFF" : colors.mutedForeground} />
              <Text style={[styles.toggleBtnTxt, { color: selectedBgProvider === "removebg" ? "#FFF" : colors.foreground }]}>Pro AI (Remove.bg)</Text>
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
            <Text style={[styles.dropDesc, { color: colors.mutedForeground }]}>Works best with distinct subjects (people, products, animals)</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Input / Output Preview Grid */}
            <View style={[styles.previewContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>IMAGE PREVIEW</Text>
              
              <View style={[styles.imageFrame, { backgroundColor: previewBg === "checker" ? "transparent" : previewBg }]}>
                {previewBg === "checker" && (
                  <RNImage
                    source={{ uri: CHECKERBOARD_BASE64 }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="repeat"
                  />
                )}
                
                <Image
                  source={{ uri: processedUri || image.uri }}
                  style={styles.previewImage}
                  contentFit="contain"
                />

                {loading && (
                  <Animated.View
                    style={[
                      styles.scanningLine,
                      {
                        transform: [{ translateY }],
                      },
                    ]}
                  />
                )}
              </View>

              {processedUri && (
                <View style={{ gap: 12 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose Background Color</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
                    {/* Transparent / Checkers */}
                    <TouchableOpacity
                      onPress={() => {
                        setPreviewBg("checker");
                        setShowColorInput(false);
                      }}
                      style={[
                        styles.colorCircle,
                        { borderColor: previewBg === "checker" ? ACCENT : colors.border, borderWidth: previewBg === "checker" ? 3 : 1 },
                      ]}
                    >
                      <Ionicons name="apps-outline" size={18} color={colors.foreground} />
                    </TouchableOpacity>

                    {/* Presets */}
                    {[
                      { hex: "#FFFFFF", label: "White" },
                      { hex: "#000000", label: "Black" },
                      { hex: "#EF4444", label: "Red" },
                      { hex: "#3B82F6", label: "Blue" },
                      { hex: "#10B981", label: "Green" },
                      { hex: "#F59E0B", label: "Yellow" },
                      { hex: "#8B5CF6", label: "Purple" },
                      { hex: "#EC4899", label: "Pink" },
                      { hex: "#F97316", label: "Orange" },
                      { hex: "#14B8A6", label: "Teal" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        onPress={() => {
                          setPreviewBg(item.hex);
                          setShowColorInput(false);
                        }}
                        style={[
                          styles.colorCircle,
                          {
                            backgroundColor: item.hex,
                            borderColor: previewBg === item.hex ? ACCENT : colors.border,
                            borderWidth: previewBg === item.hex ? 3 : 1,
                          },
                        ]}
                      />
                    ))}

                    {/* Custom Color Selector */}
                    <TouchableOpacity
                      onPress={() => {
                        setShowColorInput(true);
                        setPreviewBg(customColor);
                      }}
                      style={[
                        styles.colorCircle,
                        {
                          backgroundColor: "#E2E8F0",
                          borderColor: showColorInput ? ACCENT : colors.border,
                          borderWidth: showColorInput ? 3 : 1,
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
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
                          autoCapitalize="characters"
                        />
                        <View style={[styles.colorPreviewBubble, { backgroundColor: sanitizeColor(customColor) }]} />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Info notice about Free model */}
            {selectedBgProvider === "local" && (
              <View style={[styles.infoCard, { backgroundColor: colors.muted, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <Ionicons name="information-circle" size={18} color={ACCENT} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  Free AI Engine runs online using BiRefNet model. No API Key required. For high resolution output or specific subjects, you can configure your Remove.bg API key under Settings.
                </Text>
              </View>
            )}

            {/* Action buttons */}
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
                <>
                  <TouchableOpacity
                    onPress={handleSave}
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
                    onPress={pickImage}
                    style={[styles.btnSec, { borderColor: colors.border, borderRadius: colors.radius }]}
                  >
                    <Ionicons name="refresh-outline" size={20} color={colors.foreground} />
                    <Text style={[styles.btnSecTxt, { color: colors.foreground }]}>Choose Different Image</Text>
                  </TouchableOpacity>
                </>
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
  toggleCard: { borderWidth: 1, padding: 12, gap: 8 },
  toggleLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  toggleRow: { flexDirection: "row", gap: 6 },
  toggleBtn: { flex: 1, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  toggleBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  colorScroll: {
    paddingVertical: 4,
    gap: 10,
    alignItems: "center",
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  customColorCard: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    gap: 8,
  },
  customColorLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  hexInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hexHash: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  colorPreviewBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoCard: {
    flexDirection: "row",
    padding: 14,
    marginHorizontal: 16,
    gap: 10,
    alignItems: "center",
  },
  infoText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  btnSec: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderWidth: 1, gap: 8 },
  btnSecTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
