import { Stack } from "expo-router";
import React from "react";

export default function ToolsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="word-counter" />
      <Stack.Screen name="json-formatter" />
      <Stack.Screen name="base64-tool" />
      <Stack.Screen name="unit-converter" />
      <Stack.Screen name="text-formatter" />
      <Stack.Screen name="qr-generator" />
      <Stack.Screen name="image-compressor" />
      <Stack.Screen name="image-resizer" />
      <Stack.Screen name="color-picker" />
      <Stack.Screen name="signature-maker" />
      <Stack.Screen name="caption-generator" />
      <Stack.Screen name="hashtag-generator" />
      <Stack.Screen name="target-resize" />
      <Stack.Screen name="pdf-target-resize" />
      <Stack.Screen name="pdf-compressor" />
      <Stack.Screen name="image-converter" />
      <Stack.Screen name="image-cropper" />
      <Stack.Screen name="passport-photo" />
      <Stack.Screen name="govt-photo" />
      <Stack.Screen name="image-enhancer" />
      <Stack.Screen name="youtube-title" />
      <Stack.Screen name="bio-generator" />
      <Stack.Screen name="prompt-generator" />
      <Stack.Screen name="social-toolkit" />
      <Stack.Screen name="thumbnail-utils" />
      <Stack.Screen name="pdf-merge" />
      <Stack.Screen name="pdf-split" />
      <Stack.Screen name="pdf-rotate" />
      <Stack.Screen name="pdf-watermark" />
      <Stack.Screen name="pdf-protect" />
      <Stack.Screen name="pdf-unlock" />
      <Stack.Screen name="file-size-analyzer" />
      <Stack.Screen name="qr-scanner" />
      <Stack.Screen name="image-watermark" />
      <Stack.Screen name="coming-soon" />
    </Stack>
  );
}
