# Production Assets Guide for Hockey Accountability App

## Current Assets Status

### ✅ Available Assets
- **App Icon**: `icon.png` (1024x1024)
- **Adaptive Icon**: `adaptive-icon.png` (1024x1024)
- **Splash Icon**: `splash-icon.png` (for splash screen)
- **Favicon**: `favicon.png` (for web)

### 🔲 Missing Assets Needed for Play Store

#### 1. Feature Graphic (REQUIRED)
**File**: `feature-graphic.png`
**Dimensions**: 1024 x 500 pixels
**Format**: PNG or JPG (no alpha channel)
**Content**: Hockey-themed graphic showcasing the app

**Design Guidelines**:
- Minimal text (will be overlaid by store elements)
- High contrast, visually appealing
- Showcase hockey/fitness theme
- Professional appearance

#### 2. Screenshots (REQUIRED - Minimum 2, Recommended 8)
**Dimensions**: Phone screenshots 16:9 or 9:16 aspect ratio
**Min Size**: 320px shortest side
**Max Size**: 3840px longest side
**Format**: PNG or JPG

**Screenshots Needed**:
1. **Coach Dashboard** - Team overview and management features
2. **Player Dashboard** - Workout logging interface
3. **Workout Logging** - Photo capture and workout details
4. **Team Leaderboard** - Rankings and progress tracking
5. **AI Workouts** - Personalized training plans
6. **Team Messages** - Communication features
7. **Achievements** - Badges and streaks display
8. **Settings/Profile** - Team and user management

## How to Create Missing Assets

### Feature Graphic Creation
You can create this using:
- **Canva**: Use 1024x500 template with hockey theme
- **Figma**: Create custom design with hockey elements
- **Adobe Creative Suite**: Professional design tools
- **Online tools**: Various free graphic design websites

**Content suggestions**:
- App logo prominently displayed
- Hockey stick, puck, or ice hockey imagery
- Team silhouettes or fitness elements
- Modern, clean design with your brand colors

### Screenshots Creation
**Method 1: Device Screenshots**
1. Run app on Android device/emulator
2. Navigate to each key screen
3. Take screenshots (ensure UI is clean, no notifications)
4. Use Android Studio Device Manager for consistent screenshots

**Method 2: Expo Preview**
1. Use `npx expo start` and scan QR code
2. Navigate through app features
3. Take screenshots on your device
4. Transfer to computer for processing

**Screenshot Guidelines**:
- Show actual app content (not placeholder text)
- Ensure good lighting and clear UI
- Remove or blur any personal information
- Use consistent device frame if possible
- Show key features and benefits clearly

### Asset Processing Tips
- **Compression**: Optimize file sizes for faster loading
- **Naming**: Use descriptive names (coach-dashboard.png, etc.)
- **Backup**: Keep original high-resolution versions
- **Testing**: Preview how they look in Play Console

## File Organization
```
assets/
├── icon.png (✅ Ready)
├── adaptive-icon.png (✅ Ready)
├── splash-icon.png (✅ Ready)
├── favicon.png (✅ Ready)
├── feature-graphic.png (🔲 Needed)
└── screenshots/
    ├── 01-coach-dashboard.png (🔲 Needed)
    ├── 02-player-dashboard.png (🔲 Needed)
    ├── 03-workout-logging.png (🔲 Needed)
    ├── 04-leaderboard.png (🔲 Needed)
    ├── 05-ai-workouts.png (🔲 Needed)
    ├── 06-team-messages.png (🔲 Needed)
    ├── 07-achievements.png (🔲 Needed)
    └── 08-settings.png (🔲 Needed)
```

## Play Store Asset Requirements Summary

| Asset Type | Dimensions | Format | Required | Status |
|------------|------------|---------|----------|--------|
| App Icon | 512x512 | PNG | ✅ | ✅ Ready |
| Feature Graphic | 1024x500 | PNG/JPG | ✅ | 🔲 Need to create |
| Phone Screenshots | 16:9 or 9:16 | PNG/JPG | ✅ (min 2) | 🔲 Need to capture |
| Promo Video | N/A | MP4 | ❌ Optional | ❌ Skip for now |

## Next Steps

1. **Create Feature Graphic**: Design 1024x500 hockey-themed promotional image
2. **Capture Screenshots**: Take 6-8 high-quality app screenshots
3. **Optimize Assets**: Compress and optimize all images
4. **Upload to Play Console**: Add assets during store listing creation

## Tools and Resources

### Free Design Tools
- **Canva**: Templates and easy design
- **GIMP**: Free alternative to Photoshop
- **Figma**: Professional design tool
- **Pixlr**: Online photo editor

### Screenshot Tools
- **Android Studio**: Device emulator with screenshot capture
- **scrcpy**: Mirror Android device to computer
- **ADB**: Command-line screenshot capture
- **Device**: Native screenshot on your phone

### Stock Images (if needed)
- **Unsplash**: Free high-quality photos
- **Pexels**: Free stock photos and videos
- **Pixabay**: Free images and graphics
- **Freepik**: Graphics and vectors (some free)

Remember: All assets should reflect the professional, sports-focused nature of your hockey accountability app while meeting Google Play Store requirements.