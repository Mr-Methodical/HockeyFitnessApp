export default {
  expo: {
    name: "Hockey Accountability App",
    slug: "hockey-accountability-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    privacy: "public",
    platforms: ["ios", "android"],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to take photos for workout logs.",
        NSPhotoLibraryUsageDescription: "This app accesses the photo library to select images for workout logs.",
        ITSAppUsesNonExemptEncryption: false
      },
      bundleIdentifier: "com.ryanhowe07.hockeyaccountabilityapp"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      package: "com.ryanhowe07.hockeyaccountabilityapp"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "e76079f6-4788-4b4c-b56b-3c0c820b4390"
      }
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
          recordAudioAndroid: false
        }
      ]
    ]
  }
};