# Creator Toolbox

A premium Android-first Creator Toolbox Super App — an all-in-one toolkit for creators, students, and professionals.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, React Native 0.81.5, expo-router ~6.0.17
- Fonts: Inter (400/500/600/700) via expo-google-fonts
- Icons: @expo/vector-icons (Ionicons, MaterialCommunityIcons, Feather, MaterialIcons)
- Storage: @react-native-async-storage/async-storage
- File Picking: expo-image-picker, expo-document-picker
- Other: expo-clipboard, expo-haptics, expo-blur, expo-linear-gradient
- API: Express 5 + esbuild

## Where things live

- `artifacts/mobile/` — main Expo mobile app
- `artifacts/mobile/app/` — expo-router file-based routing
- `artifacts/mobile/app/(tabs)/` — 4 main tabs (Home, Tools, Files, Settings)
- `artifacts/mobile/app/tools/` — all tool screens (~33 screens)
- `artifacts/mobile/constants/colors.ts` — dark/light color theme
- `artifacts/mobile/constants/tools.ts` — all 39 tool definitions
- `artifacts/mobile/context/AppContext.tsx` — global state with AsyncStorage
- `artifacts/mobile/hooks/useColors.ts` — color theme hook
- `artifacts/mobile/components/` — shared components (ToolHeader, ToolCard, CategoryCard)

## Architecture decisions

- File-based routing with expo-router; tools use a nested Stack under `app/tools/_layout.tsx`
- AppContext provides global state (recents, favorites, file history, dark mode) via AsyncStorage
- All PDF tools use expo-document-picker for file selection; image tools use expo-image-picker
- PDF processing is simulated (no native PDF library in Expo Go) with realistic UI & file history tracking
- Theme: `#09090F` background, `#8B5CF6` primary, `#22D3EE` accent — dark by default

## Product

**39 tools total — 33 fully implemented:**

### Image Tools (10 live)
- Image Compressor (with quality presets)
- Image Resizer (custom, percentage, social presets)
- Target File Size Resize (resize to exact KB)
- Image Converter (JPG/PNG/WEBP/BMP/TIFF)
- Image Cropper (aspect ratio presets via native crop)
- Passport Photo Maker (8 country presets)
- Govt Photo & Signature (Indian exam & document presets)
- AI Image Enhancer (denoise, sharpen, presets)
- Signature Maker (PanResponder SVG canvas)

### PDF Tools (8 live)
- PDF Merge (multi-file with reorder)
- PDF Split (range, every N, extract pages)
- PDF Compressor (quality presets + target size)
- PDF Target Resize (exact KB/MB targeting)
- PDF Rotate (90/180/270, page scope)
- PDF Watermark (text, position, opacity, color)
- PDF Protect (password + permissions)
- PDF Unlock (remove password)

### Utility Tools (9 live)
- QR Code Generator (real codes via API)
- QR Scanner (paste + detect URL/email/phone/WiFi)
- Color Picker (100+ swatches, HEX/RGB/HSL)
- JSON Formatter (format, minify, validate)
- Base64 Encode/Decode
- Word Counter (real-time stats)
- Text Formatter (12 case transforms)
- Unit Converter (5 categories)
- File Size Analyzer (storage analytics from history)

### Creator Tools (7 live)
- Caption Generator (7 niches × 5 tones)
- Hashtag Generator (8 niches × 5 platforms)
- YouTube Title Generator (8 categories, templates)
- Bio Generator (5 platforms × 4 tones)
- Prompt Generator (Midjourney/DALL·E/ChatGPT)
- Social Media Toolkit (character counter, hashtag extractor, emoji manager, platform limits)
- Thumbnail Utilities (platform specs, color combos, best practices)

## User preferences

- Android-first mobile app
- Premium dark purple/cyan theme — never change the color system
- All tools must have working UIs even when backend processing is simulated
- Do NOT call suggestDeploy() — this is an Expo/Android app, not a web app

## Gotchas

- Expo dev server accessed via `$REPLIT_EXPO_DEV_DOMAIN`, NOT localhost proxy
- Workflow name: `artifacts/mobile: expo`
- PDF tools cannot actually process PDFs in Expo Go (no native PDF library) — they simulate processing and save to file history
- Use `ImagePicker.MediaType.Images` (not deprecated `MediaTypeOptions.Images`)
- expo-document-picker `multiple: true` option may not work on all platforms

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo Go compatible library list and mobile guidelines
