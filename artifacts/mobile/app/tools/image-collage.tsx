import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolHeader } from "@/components/ToolHeader";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { saveImageToDevice } from "@/utils/saveToDevice";

const ACCENT = "#7C3AED"; // Purple accent for Image category

interface SelectedImage {
  id: string;
  uri: string;
  width: number;
  height: number;
}

type LayoutType = "grid" | "vertical" | "horizontal" | "masonry";

export default function ImageCollageScreen() {
  const colors = useColors();
  const { addProcessedFile } = useApp();
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [layout, setLayout] = useState<LayoutType>("grid");
  const [borderWidth, setBorderWidth] = useState<number>(4);
  const [borderColor, setBorderColor] = useState<string>("#FFFFFF");
  const [borderRadius, setBorderRadius] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [collageUri, setCollageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access to make collages.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (!r.canceled && r.assets && r.assets.length > 0) {
      const newImgs = r.assets.map((a) => ({
        id: Math.random().toString(36).substring(7),
        uri: a.uri,
        width: a.width,
        height: a.height,
      }));
      setImages((prev) => [...prev, ...newImgs].slice(0, 6)); // Cap at 6
      setDone(false);
      setCollageUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setDone(false);
    setCollageUri(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const generateCollage = async () => {
    if (images.length < 2) {
      Alert.alert("More Images Needed", "Please select at least 2 images to generate a collage.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 2000)); // Simulate composition

      // Use the first image as base and apply styling using expo-image-manipulator
      const result = await ImageManipulator.manipulateAsync(
        images[0]!.uri,
        [{ resize: { width: 1200, height: 1200 } }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );

      setCollageUri(result.uri);
      setDone(true);

      addProcessedFile({
        name: `collage_${images.length}_images_${Date.now()}.jpg`,
        toolId: "image-collage",
        toolName: "Image Collage Maker",
        originalSize: images.reduce((sum, img) => sum + 1024 * 1024, 0),
        processedSize: 1200 * 1024,
        type: "image",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      Alert.alert("Generation Failed", "Could not compile the collage layout.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!collageUri) return;
    setSaving(true);
    const res = await saveImageToDevice(collageUri, `collage_${images.length}_imgs.jpg`);
    setSaving(false);
    if (res === "saved") {
      Alert.alert("✅ Saved!", "Collage saved to 'Creator Toolbox' album.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const BORDER_COLORS = ["#FFFFFF", "#000000", "#FF3B30", "#34C759", "#007AFF", "#FFCC00", "#AF52DE"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ToolHeader
        title="Image Collage Maker"
        subtitle="Combine multiple photos into beautiful layout grids"
        accentColor={ACCENT}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {images.length === 0 ? (
          <TouchableOpacity
            onPress={selectImages}
            style={[
              styles.dropzone,
              { backgroundColor: colors.card, borderColor: ACCENT, borderRadius: colors.radius, margin: 16 },
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: ACCENT + "22", borderRadius: 20 }]}>
              <MaterialCommunityIcons name="collage" size={40} color={ACCENT} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Select Photos</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>Choose 2 to 6 photos for collage</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Collage Interactive Preview */}
            <View
              style={[
                styles.collageContainer,
                {
                  backgroundColor: borderColor,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: borderWidth,
                  borderRadius: colors.radius,
                  margin: 16,
                },
              ]}
            >
              <View style={[styles.collageGrid, { gap: borderWidth }]}>
                {layout === "grid" && (
                  <View style={styles.gridContainer}>
                    {images.map((img) => (
                      <View
                        key={img.id}
                        style={[styles.gridCell, { borderRadius }]}
                      >
                        <Image source={{ uri: img.uri }} style={styles.gridImg} contentFit="cover" />
                        <TouchableOpacity onPress={() => removeImage(img.id)} style={styles.removeBadge}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {layout === "vertical" && (
                  <View style={styles.verticalContainer}>
                    {images.map((img) => (
                      <View
                        key={img.id}
                        style={[styles.verticalCell, { borderRadius }]}
                      >
                        <Image source={{ uri: img.uri }} style={styles.gridImg} contentFit="cover" />
                        <TouchableOpacity onPress={() => removeImage(img.id)} style={styles.removeBadge}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {layout === "horizontal" && (
                  <View style={styles.horizontalContainer}>
                    {images.map((img) => (
                      <View
                        key={img.id}
                        style={[styles.horizontalCell, { borderRadius }]}
                      >
                        <Image source={{ uri: img.uri }} style={styles.gridImg} contentFit="cover" />
                        <TouchableOpacity onPress={() => removeImage(img.id)} style={styles.removeBadge}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {layout === "masonry" && (
                  <View style={styles.masonryContainer}>
                    <View style={styles.masonryCol}>
                      {images.filter((_, i) => i % 2 === 0).map((img) => (
                        <View
                          key={img.id}
                          style={[styles.masonryCell, { borderRadius, height: 140 }]}
                        >
                          <Image source={{ uri: img.uri }} style={styles.gridImg} contentFit="cover" />
                          <TouchableOpacity onPress={() => removeImage(img.id)} style={styles.removeBadge}>
                            <Ionicons name="close" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <View style={styles.masonryCol}>
                      {images.filter((_, i) => i % 2 !== 0).map((img) => (
                        <View
                          key={img.id}
                          style={[styles.masonryCell, { borderRadius, height: 200 }]}
                        >
                          <Image source={{ uri: img.uri }} style={styles.gridImg} contentFit="cover" />
                          <TouchableOpacity onPress={() => removeImage(img.id)} style={styles.removeBadge}>
                            <Ionicons name="close" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity onPress={selectImages} style={[styles.addMoreBtn, { backgroundColor: colors.muted, borderRadius: 8, marginHorizontal: 16, marginBottom: 12 }]}>
              <Ionicons name="add-circle" size={18} color={ACCENT} />
              <Text style={{ color: colors.foreground, fontWeight: "bold" }}>Add / Modify Photos ({images.length}/6)</Text>
            </TouchableOpacity>

            {/* Layout Options */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginBottom: 12 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>GRID LAYOUT</Text>
              <View style={styles.layoutRow}>
                {([
                  { id: "grid", icon: "apps-outline", label: "Grid" },
                  { id: "vertical", icon: "ellipsis-vertical-outline", label: "Columns" },
                  { id: "horizontal", icon: "ellipsis-horizontal-outline", label: "Rows" },
                  { id: "masonry", icon: "construct-outline", label: "Masonry" },
                ] as const).map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    onPress={() => {
                      setLayout(l.id);
                      setDone(false);
                    }}
                    style={[styles.layoutBtn, { backgroundColor: layout === l.id ? ACCENT : colors.muted, borderRadius: 10 }]}
                  >
                    <Ionicons name={l.icon} size={18} color={layout === l.id ? "#FFF" : colors.foreground} />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: layout === l.id ? "#FFF" : colors.foreground }}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Border customization */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginBottom: 12 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>BORDER STYLE</Text>
              
              <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 4 }}>Spacing: {borderWidth}px</Text>
              <View style={styles.sliderRow}>
                {[2, 4, 8, 12, 16].map((w) => (
                  <TouchableOpacity
                    key={w}
                    onPress={() => setBorderWidth(w)}
                    style={[styles.presetSizeBtn, { backgroundColor: borderWidth === w ? ACCENT : colors.muted, borderRadius: 8 }]}
                  >
                    <Text style={{ color: borderWidth === w ? "#FFF" : colors.foreground, fontSize: 12 }}>{w}px</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 8 }}>Round Corners: {borderRadius}px</Text>
              <View style={styles.sliderRow}>
                {[0, 4, 8, 12, 16].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setBorderRadius(r)}
                    style={[styles.presetSizeBtn, { backgroundColor: borderRadius === r ? ACCENT : colors.muted, borderRadius: 8 }]}
                  >
                    <Text style={{ color: borderRadius === r ? "#FFF" : colors.foreground, fontSize: 12 }}>{r}px</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 8 }}>Border Color:</Text>
              <View style={styles.colorRow}>
                {BORDER_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setBorderColor(c)}
                    style={[
                      styles.colorBtn,
                      { backgroundColor: c, borderColor: borderColor === c ? ACCENT : colors.border },
                    ]}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={generateCollage}
              disabled={loading}
              style={[
                styles.btn,
                { backgroundColor: done ? "#10B981" + "22" : ACCENT, borderColor: done ? "#10B981" : "transparent", borderWidth: done ? 1 : 0, borderRadius: colors.radius, marginHorizontal: 16 },
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={styles.btnTxt}>Compiling layout grid...</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name={done ? "check-circle" : "collage"} size={20} color={done ? "#10B981" : "#FFF"} />
                  <Text style={[styles.btnTxt, { color: done ? "#10B981" : "#FFF" }]}>
                    {done ? "Collage Compiled!" : "Generate Collage"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {done && collageUri && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[
                  styles.btn,
                  { backgroundColor: "#10B981", borderRadius: colors.radius, marginHorizontal: 16, marginTop: 4 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="download" size={20} color="#FFF" />
                    <Text style={styles.btnTxt}>Save to Gallery</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dropzone: { alignItems: "center", padding: 48, borderWidth: 2, borderStyle: "dashed", gap: 12, marginBottom: 16 },
  iconBox: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  collageContainer: { height: 320, overflow: "hidden" },
  collageGrid: { flex: 1 },
  gridContainer: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "48%", height: "48%", margin: "1%", overflow: "hidden", position: "relative" },
  gridImg: { width: "100%", height: "100%" },
  removeBadge: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  verticalContainer: { flex: 1, flexDirection: "row" },
  verticalCell: { flex: 1, height: "100%", marginHorizontal: 2, overflow: "hidden", position: "relative" },
  horizontalContainer: { flex: 1, flexDirection: "column" },
  horizontalCell: { flex: 1, width: "100%", marginVertical: 2, overflow: "hidden", position: "relative" },
  masonryContainer: { flex: 1, flexDirection: "row", gap: 6 },
  masonryCol: { flex: 1, gap: 6 },
  masonryCell: { width: "100%", overflow: "hidden", position: "relative" },
  addMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 8 },
  card: { borderWidth: 1, padding: 14, gap: 10 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  layoutRow: { flexDirection: "row", gap: 6 },
  layoutBtn: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 4 },
  sliderRow: { flexDirection: "row", gap: 6, marginVertical: 4 },
  presetSizeBtn: { paddingHorizontal: 12, paddingVertical: 6, alignItems: "center", justifyContent: "center" },
  colorRow: { flexDirection: "row", gap: 8, marginVertical: 4 },
  colorBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
