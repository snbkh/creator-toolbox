import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type ProcessedFile } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function FileRow({ file }: { file: ProcessedFile }) {
  const colors = useColors();
  const saved = file.originalSize - file.processedSize;
  const savePct =
    file.originalSize > 0
      ? Math.round((saved / file.originalSize) * 100)
      : 0;

  const iconMap: Record<ProcessedFile["type"], string> = {
    image: "image-outline",
    pdf: "document-text-outline",
    text: "document-outline",
    other: "cube-outline",
  };

  const colorMap: Record<ProcessedFile["type"], string> = {
    image: "#8B5CF6",
    pdf: "#DC2626",
    text: "#0EA5E9",
    other: "#6B7280",
  };

  const accent = colorMap[file.type];

  return (
    <View
      style={[
        styles.fileRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View
        style={[
          styles.fileIcon,
          { backgroundColor: accent + "22", borderRadius: 10 },
        ]}
      >
        <Ionicons name={iconMap[file.type] as never} size={22} color={accent} />
      </View>
      <View style={styles.fileMeta}>
        <Text
          style={[styles.fileName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {file.name}
        </Text>
        <Text style={[styles.fileTool, { color: colors.mutedForeground }]}>
          {file.toolName} · {formatTime(file.timestamp)}
        </Text>
        <View style={styles.fileSizes}>
          <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>
            {formatSize(file.originalSize)}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={12}
            color={colors.mutedForeground}
          />
          <Text style={[styles.fileSize, { color: accent }]}>
            {formatSize(file.processedSize)}
          </Text>
        </View>
      </View>
      {savePct > 0 && (
        <View
          style={[
            styles.saveBadge,
            { backgroundColor: "#10B981" + "22", borderRadius: 8 },
          ]}
        >
          <Text style={[styles.saveText, { color: "#10B981" }]}>
            -{savePct}%
          </Text>
        </View>
      )}
    </View>
  );
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { processedFiles, clearHistory } = useApp();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const handleClear = () => {
    Alert.alert(
      "Clear History",
      "This will remove all processed files from history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: clearHistory,
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Files
        </Text>
        {processedFiles.length > 0 && (
          <Pressable onPress={handleClear}>
            <Text style={[styles.clearBtn, { color: colors.destructive }]}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={processedFiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 90 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="folder-open-outline"
              size={56}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No files yet
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Files processed using tools will appear here
            </Text>
            <Pressable
              onPress={() => router.push("/tools" as never)}
              style={[
                styles.emptyBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[styles.emptyBtnText, { color: colors.primaryForeground }]}
              >
                Browse Tools
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <FileRow file={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  clearBtn: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 16,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: {
    flex: 1,
    gap: 3,
  },
  fileName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  fileTool: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  fileSizes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  fileSize: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  saveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  saveText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
