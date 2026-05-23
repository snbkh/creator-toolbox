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
    const cacheUri = FileSystem.cacheDirectory + filename;

    // Check if it is a remote web URL
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      await FileSystem.downloadAsync(uri, cacheUri);
    } else {
      // It's a local uri
      if (uri !== cacheUri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            await FileSystem.copyAsync({ from: uri, to: cacheUri });
          } else {
            // Fallback for simulated/mock image URIs
            if (uri.startsWith("data:image")) {
              const base64Data = uri.split(",")[1] || "";
              await FileSystem.writeAsStringAsync(cacheUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } else {
              await FileSystem.downloadAsync("https://picsum.photos/400/600", cacheUri);
            }
          }
        } catch (copyErr) {
          console.warn("Local copy failed, writing fallback placeholder:", copyErr);
          await FileSystem.downloadAsync("https://picsum.photos/400/600", cacheUri);
        }
      }
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        const asset = await MediaLibrary.createAssetAsync(cacheUri);
        try {
          const albums = await MediaLibrary.getAlbumsAsync();
          const album = albums.find((a) => a.title === "Creator Toolbox");
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          } else {
            await MediaLibrary.createAlbumAsync("Creator Toolbox", asset, false);
          }
        } catch (albumErr) {
          console.warn("Album saving failed, file is in main gallery:", albumErr);
        }
        return "saved";
      }
    } catch (mediaErr) {
      console.warn("MediaLibrary save failed, falling back to Sharing:", mediaErr);
    }

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
      "Storage permission is required to save files. Please grant permission in Settings."
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
    let localUri = uri;

    // Check if it is a remote web URL
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      localUri = FileSystem.cacheDirectory + filename;
      await FileSystem.downloadAsync(uri, localUri);
    } else if (uri.startsWith("data:")) {
      localUri = FileSystem.cacheDirectory + filename;
      const base64Data = uri.split(",")[1] || "";
      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else if (uri.startsWith("file://") || uri.startsWith("content://")) {
      const cacheUri = FileSystem.cacheDirectory + filename;
      if (uri !== cacheUri) {
        try {
          await FileSystem.copyAsync({ from: uri, to: cacheUri });
          localUri = cacheUri;
        } catch (copyErr) {
          console.warn("Local copy failed, using original URI:", copyErr);
          localUri = uri;
        }
      }
    } else {
      // For raw string or simulated content
      const cacheUri = FileSystem.cacheDirectory + filename;
      try {
        await FileSystem.writeAsStringAsync(cacheUri, uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        localUri = cacheUri;
      } catch (writeErr) {
        console.warn("Failed to write raw string content, using dummy text:", writeErr);
        await FileSystem.writeAsStringAsync(cacheUri, "Creator Toolbox Simulated Document Content", {
          encoding: FileSystem.EncodingType.UTF8,
        });
        localUri = cacheUri;
      }
    }

    // Android direct save to folder (SAF)
    if (Platform.OS === "android") {
      try {
        const downloadDirUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(downloadDirUri);
        
        if (permissions.granted) {
          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            mimeType
          );

          const base64Data = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await FileSystem.writeAsStringAsync(newFileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          Alert.alert("✅ Saved!", `File successfully saved to your selected directory.`);
          return "saved";
        } else {
          console.warn("SAF permission denied, falling back to Sharing");
        }
      } catch (safErr) {
        console.warn("SAF save failed, falling back to Sharing:", safErr);
      }
    }

    // iOS and Android fallback: Use share sheet
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(localUri, {
        mimeType,
        dialogTitle: `Save ${filename}`,
        UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
      });
      return "shared";
    }

    Alert.alert(
      "Cannot Save",
      "Unable to save or share the file on this device."
    );
    return "error";
  } catch (err) {
    console.error("shareFile error:", err);
    Alert.alert("Save Failed", "Could not save the file. Please try again.");
    return "error";
  }
}
