import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

type ColorPalette = typeof colors.light;

/**
 * Returns the design tokens for the current color scheme.
 *
 * Accepts an optional `isDarkOverride` from AppContext so the user's
 * Settings toggle takes effect. Falls back to system color scheme.
 *
 * Use `useAppColors()` from AppContext inside AppProvider components.
 * Use this hook directly only outside the provider (e.g. ErrorFallback).
 */
export function useColors(isDarkOverride?: boolean): ColorPalette & { radius: number } {
  const scheme = useColorScheme();
  const shouldUseDark = isDarkOverride !== undefined ? isDarkOverride : scheme === "dark";
  const palette: ColorPalette = shouldUseDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
