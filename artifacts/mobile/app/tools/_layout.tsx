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
      <Stack.Screen name="coming-soon" />
    </Stack>
  );
}
