# LocalLens Deployment Guide 🚀

## Pre-Deployment Checklist

### Environment Configuration
- [ ] Firebase project configured with production settings
- [ ] Environment variables set in EAS secrets
- [ ] Google Maps API keys configured for production
- [ ] Apple Developer account and certificates ready (iOS)
- [ ] Google Play Console account ready (Android)

### Code Preparation
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance tests completed
- [ ] Security audit completed

### Firebase Production Setup
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Authentication methods configured
- [ ] Indexes created for all queries
- [ ] Backup and recovery configured

## EAS Build Configuration

### Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### Login to Expo
```bash
eas login
```

### Initialize EAS
```bash
eas build:configure
```

This creates `eas.json` with build profiles:

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Environment Secrets
Set production environment variables:

```bash
# Firebase configuration
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your-project.appspot.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your-sender-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your-app-id"

# Google Maps API
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "your-maps-api-key"
```

## iOS Deployment

### Apple Developer Setup
1. Create Apple Developer account
2. Generate App Store Connect API key
3. Create app identifier in Apple Developer portal
4. Set up provisioning profiles

### iOS Build Configuration
```bash
# Configure iOS credentials
eas credentials:configure

# Build for iOS
eas build --platform ios --profile production
```

### App Store Connect Setup
1. Create new app in App Store Connect
2. Upload app metadata, screenshots, descriptions
3. Set up app privacy information
4. Configure app review information

### Submit to App Store
```bash
# Submit build to App Store
eas submit --platform ios --profile production
```

### iOS App Store Metadata
Required information:
- App name and description
- Keywords for search
- Support URL and privacy policy
- Screenshots for all device types
- App category and age rating
- Pricing information

## Android Deployment

### Google Play Console Setup
1. Create Google Play Console account
2. Create new application
3. Generate upload key and certificate
4. Set up app signing

### Android Build Configuration
```bash
# Build for Android
eas build --platform android --profile production
```

### Google Play Store Metadata
Required information:
- App title and description
- Screenshots for phones and tablets
- Feature graphic and icon
- Content rating questionnaire
- Target audience and content warnings
- Store listing contact details

### Submit to Google Play
```bash
# Submit to Google Play
eas submit --platform android --profile production
```

## Production Configuration

### app.json Production Settings
```json
{
  "expo": {
    "name": "LocalLens",
    "slug": "locallens",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.locallens",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "LocalLens needs location access to show nearby notes and places of interest.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "LocalLens needs location access to show nearby notes and places of interest.",
        "NSCameraUsageDescription": "LocalLens needs camera access to take photos for your notes.",
        "NSPhotoLibraryUsageDescription": "LocalLens needs photo library access to attach images to your notes."
      },
      "config": {
        "googleMapsApiKey": "YOUR_IOS_GOOGLE_MAPS_API_KEY"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.yourcompany.locallens",
      "versionCode": 1,
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-location",
      "expo-image-picker",
      "expo-camera",
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you share them with your notes.",
          "cameraPermission": "The app accesses your camera to let you take photos for your notes."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### Firebase Production Security Rules

#### Firestore Rules (Production)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notes are publicly readable but only writable by authenticated users
    match /notes/{noteId} {
      allow read: if true;
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.authorId
        && validateNoteData(request.resource.data);
      allow update: if request.auth != null 
        && request.auth.uid == resource.data.authorId
        && validateNoteData(request.resource.data);
      allow delete: if request.auth != null 
        && (request.auth.uid == resource.data.authorId || isAdmin());
    }
    
    // Interactions (votes, comments)
    match /interactions/{interactionId} {
      allow read: if true;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId
        && validateInteractionData(request.resource.data);
      allow update: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null 
        && (request.auth.uid == resource.data.userId || isAdmin());
    }
    
    function validateNoteData(data) {
      return data.keys().hasAll(['title', 'content', 'authorId', 'location', 'geohash', 'createdAt'])
        && data.title is string && data.title.size() <= 100
        && data.content is string && data.content.size() <= 1000
        && data.geohash is string && data.geohash.size() >= 5
        && data.createdAt is timestamp;
    }
    
    function validateInteractionData(data) {
      return data.keys().hasAll(['noteId', 'userId', 'type', 'createdAt'])
        && data.type in ['vote', 'comment']
        && data.createdAt is timestamp;
    }
    
    function isAdmin() {
      return request.auth.token.admin == true;
    }
  }
}
```

#### Storage Rules (Production)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Note images
    match /notes/{noteId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null 
        && isValidImageUpload()
        && resource == null; // Prevent overwriting existing files
    }
    
    // User profile images
    match /users/{userId}/profile/{imageId} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && isValidImageUpload();
    }
    
    function isValidImageUpload() {
      return request.resource.size < 5 * 1024 * 1024 // 5MB limit
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Performance Optimization

### Bundle Optimization
```json
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Optimize asset handling
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
```

### Image Optimization
```typescript
// Optimize images before upload
const optimizeImage = async (uri: string) => {
  return await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }], // Max width 1080px
    { 
      compress: 0.7, // 70% quality
      format: ImageManipulator.SaveFormat.JPEG 
    }
  );
};
```

## Monitoring & Analytics

### Firebase Analytics Setup
```typescript
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics(app);

// Track custom events
logEvent(analytics, 'note_created', {
  category: 'engagement',
  location: 'map_screen'
});
```

### Crash Reporting
```bash
# Install Firebase Crashlytics
expo install expo-firebase-crashlytics
```

### Performance Monitoring
```bash
# Install Firebase Performance
expo install expo-firebase-performance
```

## Post-Deployment Monitoring

### Key Metrics to Track
- App store ratings and reviews
- User retention rates
- Note creation and interaction rates
- Crash rates and error logs
- App performance metrics
- Geographic usage patterns

### Update Strategy
- Semantic versioning (1.0.0 → 1.0.1)
- OTA updates for JavaScript changes
- App store updates for native changes
- Feature flags for gradual rollouts

### Maintenance Schedule
- Weekly: Review crash reports and user feedback
- Monthly: Performance optimization and bug fixes
- Quarterly: Major feature updates and platform updates
- Annually: Security audit and architecture review

## Rollback Strategy

### Emergency Rollback
```bash
# Quickly disable problematic OTA update
eas update --branch production --message "Emergency rollback"

# Or revert to previous app store version
# (requires new app store submission)
```

### Gradual Rollout
```bash
# Start with 10% of users
eas update --branch production --rollout-percentage 10

# Increase gradually if no issues
eas update --branch production --rollout-percentage 50
eas update --branch production --rollout-percentage 100
```

## Support and Maintenance

### User Support Channels
- In-app feedback system
- Email support
- Social media monitoring
- App store review responses

### Maintenance Checklist
- [ ] Monitor app store reviews weekly
- [ ] Review crash reports and error logs
- [ ] Update dependencies monthly
- [ ] Security patch management
- [ ] Performance optimization reviews
- [ ] User feedback analysis and feature planning

---

## Quick Deploy Commands

### Development Build
```bash
eas build --profile development --platform all
```

### Production Build
```bash
eas build --profile production --platform all
```

### Submit to Stores
```bash
eas submit --profile production --platform all
```

### Over-the-Air Update
```bash
eas update --branch production --message "Bug fixes and improvements"
```