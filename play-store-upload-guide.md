# Google Play Store Upload & Publishing Guide

## Prerequisites Checklist

Before starting the upload process, ensure you have:

- [ ] **Signed release build** (.aab file) from EAS Build
- [ ] **Google Play Console account** (requires $25 one-time registration fee)
- [ ] **Privacy Policy** hosted online (required for apps that collect data)
- [ ] **App screenshots** (minimum 2, recommended 8)
- [ ] **High-resolution app icon** (512x512 px)
- [ ] **Feature graphic** (1024x500 px)
- [ ] **App description and metadata**
- [ ] **Content rating questionnaire** completed

---

## Step 1: Set Up Google Play Console

### 1.1 Create Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your Google account
3. Pay the $25 one-time registration fee
4. Complete developer profile information
5. Verify your identity (may take 24-48 hours)

### 1.2 Create New Application
1. Click "Create app" in the Play Console
2. Enter app details:
   - **App name**: "Hockey Accountability App"
   - **Default language**: English (United States)
   - **App type**: App
   - **Free or paid**: Free
3. Accept Play Console Developer Programme Policies
4. Click "Create app"

---

## Step 2: Complete Store Listing

### 2.1 App Details
Navigate to **Store listing** in the left sidebar:

**App name**: Hockey Accountability App

**Short description** (80 characters):
```
Hockey team fitness tracking with workouts, leaderboards & team accountability
```

**Full description** (4000 characters):
```
[Use the full description from play-store-listing.md]
```

### 2.2 Graphics and Images

#### App Icon
- Upload: `assets/adaptive-icon.png` (already have)
- Requirements: 512x512 pixels, PNG format

#### Feature Graphic
- **Required**: 1024x500 pixels, JPG or PNG
- **Content**: App logo with team/hockey theme
- **Text**: Minimal text, focus on visual appeal

#### Screenshots
**Required**: Minimum 2 screenshots per supported device type
**Recommended**: 4-8 screenshots showing key features

Screenshots needed:
1. **Coach Dashboard** - Team overview and management
2. **Player Dashboard** - Workout logging interface
3. **Workout Tracking** - Photo capture and logging
4. **Team Leaderboard** - Rankings and progress
5. **AI Workouts** - Personalized training plans
6. **Team Messages** - Communication features
7. **Achievements** - Badges and progress tracking
8. **Settings** - Team and profile management

**Screenshot specifications**:
- **Phone**: 16:9 or 9:16 aspect ratio
- **Minimum dimensions**: 320px
- **Maximum dimensions**: 3840px
- **Format**: JPG or PNG (no alpha channel)

### 2.3 Categorization
- **Category**: Health & Fitness
- **Tags**: hockey, fitness, team, workout, training, sports

---

## Step 3: Content Rating

### 3.1 Complete Content Rating Questionnaire
1. Go to **Content rating** section
2. Select "Start questionnaire"
3. Answer questions honestly:

**Key responses for Hockey Accountability App**:
- Does your app contain user-generated content? **Yes** (team messages, workout photos)
- Does your app contain social features? **Yes** (team communication)
- Does your app share user data with third parties? **Yes** (Firebase/Google services)
- Does your app contain digital purchases? **No**
- Does your app contain ads? **No**
- Age-appropriate content: **Teen 13+**

4. Submit questionnaire and receive content rating

---

## Step 4: Set Up App Access

### 4.1 App Availability
1. Go to **Countries/regions**
2. Select countries where you want to distribute
3. **Recommended**: Select "Add all countries" for maximum reach
4. Review restricted countries list

### 4.2 Pricing and Distribution
1. Confirm app is **Free**
2. Check distribution channels:
   - [x] Google Play
   - [x] Google Play Games (if applicable)
   - [x] Google Play for Education (if applicable)

---

## Step 5: Privacy and Data Safety

### 5.1 Data Safety Section
1. Navigate to **Data safety**
2. Complete data collection disclosure:

**Data types collected**:
- Personal info (name, email)
- Health and fitness (workout data)
- Photos and videos (workout verification)
- App activity (usage analytics)
- App info and performance

**Data usage purposes**:
- App functionality
- Analytics
- Account management
- Communications

**Data sharing**:
- Data shared with team members (workout progress, messages)
- Data shared with service providers (Firebase, analytics)

### 5.2 Privacy Policy
1. Add privacy policy URL (must be hosted online)
2. Ensure privacy policy covers all collected data types
3. Include contact information for privacy requests

---

## Step 6: Upload Release Build

### 6.1 Prepare Release
1. Navigate to **Release** → **Production**
2. Click "Create new release"

### 6.2 Upload AAB File
1. Click "Upload" in the App bundles section
2. Select your signed .aab file from EAS Build
3. Wait for upload and processing to complete
4. Review app bundle details

### 6.3 Release Details
**Release name**: "1.0 - Initial Release"

**Release notes**:
```
🏒 Initial release of Hockey Accountability App!

Features:
• Team management for coaches and players
• Workout tracking with photo verification
• AI-powered personalized training plans
• Team leaderboards and achievements
• Built-in team messaging
• Progress tracking and statistics

Perfect for hockey teams looking to improve fitness and accountability!
```

---

## Step 7: Review and Publish

### 7.1 Pre-launch Checklist
Verify all sections are complete:
- [ ] Store listing (description, graphics)
- [ ] Content rating
- [ ] Data safety
- [ ] Privacy policy
- [ ] Target audience
- [ ] App access (countries/regions)
- [ ] Release build uploaded

### 7.2 Release Timeline
1. Click "Review release"
2. Address any warnings or errors
3. Click "Start rollout to production"

**Expected timeline**:
- **Review process**: 1-3 days (first-time apps may take longer)
- **Gradual rollout**: Can set to specific percentage initially
- **Full availability**: Within 2-4 hours after approval

---

## Step 8: Post-Launch Management

### 8.1 Monitor Release
1. Check **Release dashboard** for:
   - Install numbers
   - Crash reports
   - User reviews
   - Performance metrics

### 8.2 Respond to Feedback
- Monitor user reviews daily
- Respond to user feedback professionally
- Address reported issues promptly
- Plan updates based on user feedback

### 8.3 Update Process
For future updates:
1. Build new release with EAS Build
2. Upload new AAB to **Internal testing** first
3. Test thoroughly
4. Promote to **Production** with updated release notes

---

## Common Issues and Solutions

### Upload Issues
- **Build rejected**: Check for missing permissions or invalid signatures
- **Review delays**: Ensure compliance with Play policies
- **Content policy violations**: Review and update content as needed

### Optimization Tips
- **ASO (App Store Optimization)**: Use relevant keywords in description
- **Screenshots**: Show key features clearly with minimal text
- **Ratings**: Encourage satisfied users to leave reviews
- **Updates**: Regular updates improve search ranking

---

## Support Resources

- **Google Play Console Help**: https://support.google.com/googleplay/android-developer
- **Policy Guidelines**: https://play.google.com/about/developer-content-policy/
- **Developer Forums**: https://groups.google.com/g/android-developers
- **EAS Build Documentation**: https://docs.expo.dev/build/introduction/

---

## Compliance Notes

### Age Requirements
- App rated **Teen (13+)** due to social features
- Comply with COPPA for any users under 13
- Consider parental consent mechanisms if needed

### Data Protection
- Ensure GDPR compliance for EU users
- Implement data deletion capabilities
- Provide clear data usage explanations

### Accessibility
- Test app with accessibility tools
- Ensure compatibility with screen readers
- Follow Android accessibility guidelines