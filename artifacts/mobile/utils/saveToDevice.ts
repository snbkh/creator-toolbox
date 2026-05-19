/**
 * utils/saveToDevice.ts
 * Reusable utility to save any image URI to the device's gallery.
 * Uses expo-media-library for gallery save + expo-sharing as fallback.
 */
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

export type SaveResult = "saved" | "shared" | "error";

/**
 * Saves an image URI to the device photo gallery.
 * On Android < 10 requests WRITE_EXTERNAL_STORAGE permission.
 * Falls back to share-sheet if gallery save is unavailable.
 *
 * @param uri     - The image file URI (file://... or content://...)
 * @param filename - Desired filename, e.g. "compressed_image.jpg"
 * @returns "saved" | "shared" | "error"
 */
export async function saveImageToDevice(
  uri: string,
  filename: string = "image.jpg"
): Promise<SaveResult> {
  try {
    // Copy or download to cache first so we have a stable file:// URI
    const cacheUri = FileSystem.cacheDirectory + filename;
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      await FileSystem.downloadAsync(uri, cacheUri);
    } else {
      await FileSystem.copyAsync({ from: uri, to: cacheUri });
    }

    try {
      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status === "granted") {
        // Save to gallery
        const asset = await MediaLibrary.createAssetAsync(cacheUri);
        // Try to add to "Creator Toolbox" album
        try {
          const albums = await MediaLibrary.getAlbumsAsync();
          const album = albums.find((a) => a.title === "Creator Toolbox");
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          } else {
            await MediaLibrary.createAlbumAsync("Creator Toolbox", asset, false);
          }
        } catch {
          // Album creation failed, asset is still in gallery
        }
        return "saved";
      }
    } catch (mediaErr) {
      console.warn("MediaLibrary save failed, falling back to Sharing:", mediaErr);
    }

    // Permission denied or MediaLibrary failed — try sharing instead
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(cacheUri, {
        mimeType: "image/jpeg",
        dialogTitle: "Save or share image",
      });
      return "shared";
    }

    Alert.alert(
      "Cannot Save",
      "Storage permission is required to save files. Please grant permission in Settings.",
      [{ text: "OK" }]
    );
    return "error";
  } catch (err) {
    console.error("saveImageToDevice error:", err);
    Alert.alert("Save Failed", "Could not save the image. Please try again.");
    return "error";
  }
}

/**
 * Saves any file (PDF, etc.) using the share-sheet.
 * This is the recommended approach for non-image files on Android.
 */
export async function shareFile(
  uri: string,
  filename: string,
  mimeType: string = "application/octet-stream"
): Promise<SaveResult> {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Sharing not available", "Cannot share files on this device.");
      return "error";
    }

    // Ensure we have a file:// URI
    let localUri = uri;
    if (!uri.startsWith("file://")) {
      localUri = FileSystem.cacheDirectory + filename;
      await FileSystem.downloadAsync(uri, localUri);
    } else {
      const cacheUri = FileSystem.cacheDirectory + filename;
      await FileSystem.copyAsync({ from: uri, to: cacheUri });
      localUri = cacheUri;
    }

    await Sharing.shareAsync(localUri, {
      mimeType,
      dialogTitle: `Save ${filename}`,
      UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
    });
    return "shared";
  } catch (err) {
    console.error("shareFile error:", err);
    Alert.alert("Share Failed", "Could not share the file. Please try again.");
    return "error";
  }
}
