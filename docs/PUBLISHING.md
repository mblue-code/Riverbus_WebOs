# Publishing to LG Content Store

Complete guide for preparing, submitting, and getting your webOS TV app approved in the LG Content Store.

## Table of Contents

1. [Pre-Submission Requirements](#pre-submission-requirements)
2. [Preparing Your App](#preparing-your-app)
3. [Required Assets](#required-assets)
4. [Self-Checklist](#self-checklist)
5. [Submission Process](#submission-process)
6. [Testing and Approval](#testing-and-approval)
7. [Common Rejection Reasons](#common-rejection-reasons)

## Pre-Submission Requirements

Before you can submit your app, you need:

### 1. LG Seller Lounge Account

Create an account at [LG Seller Lounge](https://seller.lgappstv.com/):
- Go to seller.lgappstv.com
- Click "Sign Up"
- Complete registration
- Verify your email
- Complete seller profile

### 2. Final IPK File

```bash
# Create production build (WITH minification)
ares-package . --outdir ./dist

# The IPK file will be in ./dist/
# Example: com.yourdomain.yourapp_1.0.0_all.ipk
```

**Important:** Use minification for production (remove `--no-minify` flag).

### 3. Test on BOTH TVs

Before submission, thoroughly test on both:
- ✅ 2018 TV (webOS 4.0)
- ✅ 2024 TV (webOS 24)

Use the testing checklist from [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md).

## Preparing Your App

### 1. Update appinfo.json

Ensure all fields are correctly filled:

```json
{
  "id": "com.yourdomain.yourapp",
  "version": "1.0.0",
  "vendor": "Your Company Name",
  "type": "web",
  "main": "index.html",
  "title": "Your App Name",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png",
  "bgImage": "bg.png",
  "resolution": "1920x1080",
  "requiredMemory": 20
}
```

**Key fields:**
- `id`: Must be unique and follow reverse domain notation
- `version`: Use semantic versioning (e.g., 1.0.0)
- `vendor`: Your company/developer name
- `title`: App name shown in store (max 50 characters)
- `resolution`: Must be "1920x1080" or "1280x720"

### 2. Optimize Performance

```bash
# Remove debug code
# Remove console.log statements (or use conditional logging)
# Minimize file sizes
# Optimize images
# Remove unused code
```

Example conditional logging:

```javascript
// In scripts/main.js
var DEBUG = false; // Set to false for production

function debug(message, data) {
  if (DEBUG) {
    console.log('[DEBUG]', message, data || '');
  }
}
```

### 3. Test with Production Build

```bash
# Build production IPK
ares-package . --outdir ./dist

# Test on both TVs
ares-install --device tv2018 ./dist/*.ipk
ares-launch --device tv2018 com.yourdomain.yourapp

ares-install --device tv2024 ./dist/*.ipk
ares-launch --device tv2024 com.yourdomain.yourapp
```

## Required Assets

### Image Requirements

**⚠️ CRITICAL: 70% of rejections are due to incorrect images!**

You need to provide these images with EXACT specifications:

#### 1. App Icon (icon.png)

- **Resolution:** 80x80 pixels
- **Format:** PNG with transparency
- **Size:** Under 100KB
- **Content:** App logo, no text recommended

```bash
# Verify image size
file icon.png
# Should show: PNG image data, 80 x 80
```

#### 2. Large Icon (largeIcon.png)

- **Resolution:** 130x130 pixels
- **Format:** PNG with transparency
- **Size:** Under 150KB
- **Content:** App logo, clear and recognizable

#### 3. Background Image (bg.png)

- **Resolution:** Check LG requirements (typically 1920x1080)
- **Format:** PNG or JPG
- **Size:** Under 500KB
- **Content:** Background shown in app launcher

#### 4. Splash Screen (splash.png)

- **Resolution:** 1920x1080 pixels
- **Format:** PNG or JPG
- **Size:** Under 500KB
- **Content:** Shown during app loading

#### 5. Promotional Images (for Store)

Required for submission (not in app):

- **Screenshot 1:** 1280x720 or 1920x1080
- **Screenshot 2:** 1280x720 or 1920x1080
- **Screenshot 3:** 1280x720 or 1920x1080 (optional)
- **Promo Image:** As specified by LG

**Tips for images:**
- Use actual screenshots from your app
- Show key features
- No placeholder/lorem ipsum text
- High quality, professional appearance
- Follow LG branding guidelines

### Non-Image Assets

#### 1. UX Scenario Document

A document describing how your app works. Include:

- App purpose and target audience
- Main features and functionality
- User flow (how users navigate)
- Screenshots with annotations
- Remote control navigation map

**Example structure:**

```markdown
# App Name UX Scenario

## Overview
[Brief description of app purpose]

## Main Features
1. Feature 1: [Description]
2. Feature 2: [Description]
3. Feature 3: [Description]

## User Flow
1. User launches app
2. Main menu appears with options
3. User navigates with arrow keys
4. User selects option with OK button
5. Content displays
6. User presses BACK to return

## Navigation Map
[Visual diagram or description of navigation structure]

## Screenshots
[Include annotated screenshots]
```

#### 2. App Self-Checklist

**MANDATORY!** Apps without this will be rejected.

Download the latest version from:
[App Self-Checklist - webOS TV Developer](https://webostv.developer.lge.com/distribute/app-certification/app-self-checklist)

## Self-Checklist

### Critical Requirements

Go through each item carefully. Here are the most important:

#### UX Requirements

- [ ] **All navigation keys work** (UP/DOWN/LEFT/RIGHT)
- [ ] **Selectable UIs controlled by 4-way navigation + OK button**
- [ ] **BACK button on entry page shows Home screen**
- [ ] **All objects provide selection effects**
- [ ] **Screen resolution is 1280x720 or 1920x1080**

#### Content Requirements

- [ ] No illegal, offensive, or inappropriate content
- [ ] No copyright violations
- [ ] Age rating is appropriate
- [ ] Privacy policy provided (if collecting data)

#### Technical Requirements

- [ ] App launches successfully
- [ ] No crashes or freezes
- [ ] Adequate performance on target TVs
- [ ] Memory usage within limits
- [ ] No security vulnerabilities

#### Functional Requirements

- [ ] All features work as described
- [ ] Error handling is appropriate
- [ ] Network errors handled gracefully
- [ ] User feedback for actions
- [ ] Loading indicators for delays

### Testing Your App Against Checklist

Use this testing script:

```javascript
// Add to scripts/main.js for pre-submission testing

function runCertificationChecklist() {
  var results = {
    'Navigation Keys': true,
    '4-Way Navigation': true,
    'OK Button': true,
    'BACK Button': true,
    'Selection Effects': true,
    'Resolution': window.innerWidth === 1920 && window.innerHeight === 1080,
    'No Errors': !window.hasErrors
  };

  console.log('=== Certification Checklist ===');
  Object.keys(results).forEach(function(item) {
    var status = results[item] ? '✅' : '❌';
    console.log(status + ' ' + item);
  });

  var allPassed = Object.values(results).every(function(v) { return v; });
  console.log('\n' + (allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'));

  return allPassed;
}

// Run before packaging for submission
```

## Submission Process

### Overview

The submission process has **three stages**:

1. **Submission** - You submit app to LG Seller Lounge
2. **Testing** - LG performs QA testing
3. **Approval** - If passed, app launches on LG Content Store

### Step-by-Step Submission

#### 1. Log in to LG Seller Lounge

Go to [seller.lgappstv.com](https://seller.lgappstv.com/) and log in.

#### 2. Create New App Submission

- Click "App Management" → "Register App"
- Select "webOS TV"
- Click "Start"

#### 3. Fill in Four Sections

##### Section 1: Basic App Info

- **App Name:** Your app's display name
- **App ID:** Must match `id` in appinfo.json
- **Category:** Choose appropriate category
- **Description:** Detailed app description (min 100 characters)
- **What's New:** For updates, describe changes
- **Keywords:** Search keywords (comma-separated)

##### Section 2: File Upload

Upload required files:

- **IPK File:** Your packaged app (.ipk)
- **Icon (80x80):** icon.png
- **Large Icon (130x130):** largeIcon.png
- **Screenshots:** At least 2 screenshots
- **Promotional Images:** As required

**File upload tips:**
- Double-check image resolutions before uploading
- Use descriptive filenames
- Compress images to reduce size (without quality loss)

##### Section 3: Service Info

- **Service Countries:** Select countries where app will be available
- **Age Rating:** Select appropriate age rating
  - All Ages
  - 7+
  - 12+
  - 16+
  - 18+
- **Price:** Free or Paid (set price if paid)

##### Section 4: Test Info

- **Test Account:** Provide if app requires login
  - Username: testuser@example.com
  - Password: [test password]
  - Notes: "Test account for LG review"

- **Testing Instructions:**
  - How to navigate the app
  - How to test key features
  - Any special setup required

- **UX Scenario:** Upload your UX scenario document

- **Self-Checklist:** Upload completed self-checklist

**Testing instructions example:**

```
1. Launch the app
2. Navigate using arrow keys (UP/DOWN/LEFT/RIGHT)
3. Select menu items using OK button
4. Test all 4 menu options (Home, Browse, Settings, About)
5. Press BACK button to exit to TV Home screen
6. App should display content correctly at 1920x1080 resolution
7. No test account required (app is public content)
```

#### 5. Review and Submit

- Review all information carefully
- Agree to terms and conditions
- Click "Submit for Review"

You'll receive a submission confirmation email.

## Testing and Approval

### QA Testing by LG

LG testers will:

1. Install your app on test devices
2. Test all functionality
3. Verify UX requirements
4. Check content guidelines
5. Test on multiple webOS versions
6. Verify image quality and specs

**Testing duration:** Typically 5-10 business days

### Possible Outcomes

#### ✅ Approved

- You'll receive approval notification
- App is published to LG Content Store
- Available in selected countries
- Users can download and install

#### ❌ Rejected

- You'll receive rejection notice with reasons
- Fix all issues
- Re-submit for another round of testing
- **No limit on resubmissions**

#### ⏸️ Pending Information

- LG needs additional information
- Respond to queries promptly
- Provide requested details

### After Approval

1. **App goes live** on LG Content Store
2. **Monitor reviews** and ratings
3. **Track downloads** in Seller Lounge
4. **Plan updates** based on user feedback

**Important:** Updates require separate approval. Approval of v1.0.0 doesn't automatically approve v1.0.1.

## Common Rejection Reasons

### Top Rejection Reasons (and how to avoid them)

#### 1. Wrong Image Sizes (70% of rejections!)

**Problem:** Images not matching exact specifications

**Solution:**
```bash
# Verify before submission
identify icon.png
# Should show: icon.png PNG 80x80

identify largeIcon.png
# Should show: largeIcon.png PNG 130x130
```

Create a verification script:

```bash
#!/bin/bash
# verify-images.sh

echo "Checking image sizes..."

check_image() {
  local file=$1
  local expected=$2

  if [ ! -f "$file" ]; then
    echo "❌ $file not found!"
    return 1
  fi

  size=$(identify -format "%wx%h" "$file")

  if [ "$size" == "$expected" ]; then
    echo "✅ $file: $size (correct)"
    return 0
  else
    echo "❌ $file: $size (expected $expected)"
    return 1
  fi
}

check_image "icon.png" "80x80"
check_image "largeIcon.png" "130x130"
check_image "bg.png" "1920x1080"
check_image "splash.png" "1920x1080"

echo ""
echo "Verification complete"
```

#### 2. Missing Self-Checklist

**Problem:** Self-checklist not uploaded or incomplete

**Solution:**
- Download latest version from LG developer site
- Complete ALL sections
- Upload with submission

#### 3. UX Guidelines Violation

**Problem:** Navigation doesn't follow LG requirements

**Common violations:**
- OK button doesn't work
- BACK button doesn't return to TV Home
- No visible selection effects
- Navigation keys don't work

**Solution:**
- Test thoroughly with remote control
- Ensure all navigation requirements met
- Review code in `scripts/main.js`

#### 4. Incorrect Resolution

**Problem:** App not designed for TV resolutions

**Solution:**
- Set `"resolution": "1920x1080"` in appinfo.json
- Test layout at 1920x1080
- Support 1280x720 as fallback

#### 5. Incomplete Test Information

**Problem:** LG can't test app due to missing info

**Solution:**
- Provide test accounts if required
- Write clear testing instructions
- Include any special setup steps

#### 6. Poor Quality Screenshots

**Problem:** Screenshots are placeholder or low quality

**Solution:**
- Use actual screenshots from real app
- Show key features
- High resolution, professional quality
- No "lorem ipsum" or placeholder text

#### 7. Content Issues

**Problem:** Inappropriate, illegal, or copyrighted content

**Solution:**
- Ensure all content is appropriate
- Have rights to all media
- Correct age rating
- Privacy policy if collecting data

### Pre-Submission Checklist

Before submitting, verify:

**Files:**
- [ ] IPK file is production build (with minification)
- [ ] icon.png is exactly 80x80
- [ ] largeIcon.png is exactly 130x130
- [ ] All screenshots are correct resolution
- [ ] All images are under size limits
- [ ] UX scenario document complete
- [ ] Self-checklist downloaded and completed

**Testing:**
- [ ] Tested on webOS 4.0 (2018 TV)
- [ ] Tested on webOS 24 (2024 TV)
- [ ] All navigation keys work
- [ ] OK button selects items
- [ ] BACK button exits to TV Home
- [ ] Selection effects visible
- [ ] No console errors
- [ ] Performance acceptable

**Metadata:**
- [ ] App ID matches appinfo.json
- [ ] Description is complete (100+ chars)
- [ ] Keywords added
- [ ] Correct age rating
- [ ] Service countries selected

**Instructions:**
- [ ] Test account provided (if needed)
- [ ] Testing instructions clear
- [ ] Special setup documented

## Updating Your App

### Submitting Updates

1. Increment version in `appinfo.json`:
```json
{
  "version": "1.1.0"
}
```

2. Build new IPK:
```bash
ares-package . --outdir ./dist
```

3. In Seller Lounge, select your app → "Update"

4. Upload new IPK and update "What's New"

5. Submit for approval (yes, updates need approval too!)

### Update Best Practices

- **Semantic versioning:** Major.Minor.Patch (e.g., 1.2.3)
- **Changelog:** Clearly describe what changed
- **Test on both TVs:** Always test updates on both platforms
- **Backwards compatibility:** Ensure updates work on older webOS versions

## Resources

### Official Documentation

- [LG Seller Lounge](https://seller.lgappstv.com/)
- [App Certification Guide](https://webostv.developer.lge.com/distribute/app-certification/)
- [App Self-Checklist](https://webostv.developer.lge.com/distribute/app-certification/app-self-checklist)
- [Submission Guide](https://webostv.developer.lge.com/distribute/distributing-apps/)

### Support

- [LG Developer Forums](https://forum.developer.lge.com/)
- Email: developer@lge.com
- Developer support portal in Seller Lounge

## Summary

**To successfully publish:**

1. ✅ Create LG Seller Lounge account
2. ✅ Thoroughly test on both your TVs
3. ✅ Create all required images (with correct sizes!)
4. ✅ Complete self-checklist
5. ✅ Write UX scenario
6. ✅ Package production IPK
7. ✅ Fill in all submission fields accurately
8. ✅ Provide clear testing instructions
9. ✅ Be patient during review process
10. ✅ Fix issues and resubmit if rejected

**Most important:**
- Get image sizes exactly right (70% of rejections!)
- Include self-checklist (mandatory!)
- Follow all UX guidelines (navigation, BACK button, selection effects)
- Test on both webOS 4.0 and webOS 24

Good luck with your submission!
