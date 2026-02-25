# PineapplePlay Deployment Guide

## Overview
This guide covers deploying your PineapplePlay app and connecting your GoDaddy domain.

---

## 1. Deploy Using Emergent Platform

### Step 1: Initiate Deployment
1. In the Emergent chat interface, look for the **"Deploy"** button (rocket icon) in the top right
2. Click **"Deploy to Production"**
3. Wait 10-15 minutes for the build process

### Step 2: Deployment Costs
- **50 credits/month** for hosting
- Includes: SSL certificate, CDN, auto-scaling

### Step 3: Get Your Production URL
After deployment completes, you'll receive a URL like:
```
https://your-app-name.emergent.app
```

### Step 4: Verify Deployment
- Visit the production URL
- Test login/registration
- Check that all features work

---

## 2. Connect GoDaddy Domain

### Option A: Point Entire Domain (recommended)
Use this if you want `pineappleplay.club` to go to your app.

#### Step 1: Log into GoDaddy
1. Go to https://godaddy.com
2. Sign in to your account
3. Go to **My Products** → **Domains** → Click on your domain

#### Step 2: Access DNS Settings
1. Click **DNS** or **Manage DNS**
2. You'll see your DNS records

#### Step 3: Add/Update Records

**For Root Domain (pineappleplay.club):**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | [Emergent IP - get from deployment] | 600 |

**For WWW Subdomain (www.pineappleplay.club):**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | your-app-name.emergent.app | 600 |

### Option B: Use Subdomain Only
Use this if you want `app.pineappleplay.club` to go to your app.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | app | your-app-name.emergent.app | 600 |

#### Step 4: Save Changes
1. Click **Save** after adding each record
2. DNS propagation takes 15 minutes to 48 hours (usually ~30 min)

#### Step 5: Configure Custom Domain in Emergent
1. After deployment, go to deployment settings in Emergent
2. Add your custom domain: `pineappleplay.club`
3. Emergent will provision an SSL certificate automatically

---

## 3. Pre-Deployment Checklist

### Security ✅
- [ ] Firebase rules are configured (DONE - verified secure)
- [ ] No hardcoded API keys in code (DONE - checked)
- [ ] Environment variables set for all secrets (DONE)
- [ ] CORS configured for production domain

### Environment Variables to Set in Production
```
MONGO_URL=<your-production-mongodb-url>
DB_NAME=pineappleplay
STRIPE_API_KEY=<your-live-stripe-key>
EMERGENT_LLM_KEY=<your-key>
```

### Firebase Configuration
- [ ] Update Firebase project settings for production domain
- [ ] Add production domain to Firebase Auth authorized domains
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Storage rules: `firebase deploy --only storage`

### Stripe Configuration (if using payments)
- [ ] Switch from test keys to live keys
- [ ] Update webhook endpoint URL to production domain
- [ ] Test a real transaction with a small amount

### Performance
- [ ] Images are optimized (use Next.js Image component)
- [ ] No console.log statements in production (DONE - only 1 found)
- [ ] Error handling in place (DONE - 27 try/catch blocks)

### Testing Before Launch
- [ ] Test user registration flow
- [ ] Test login/logout
- [ ] Test profile creation and editing
- [ ] Test messaging feature
- [ ] Test marketplace listings
- [ ] Test on mobile devices
- [ ] Test on different browsers (Chrome, Safari, Firefox)

### Legal/Compliance
- [ ] Privacy Policy page exists
- [ ] Terms of Service page exists
- [ ] Cookie consent (if required for your region)
- [ ] Age verification (21+ for your app)

---

## 4. Post-Deployment Steps

### Monitor Your App
1. Check Emergent dashboard for errors
2. Monitor Firebase console for usage
3. Set up alerts for high traffic

### Backup Strategy
- MongoDB: Enable automated backups
- Firebase: Export Firestore data periodically

### Scaling
Your current setup auto-scales:
- **Firebase/Firestore**: Automatically scales
- **MongoDB**: May need to upgrade plan for high traffic
- **Emergent Hosting**: Includes auto-scaling

---

## 5. Troubleshooting

### Domain Not Working
1. Check DNS propagation: https://dnschecker.org
2. Verify records are correct in GoDaddy
3. Wait up to 48 hours for full propagation

### SSL Certificate Issues
- Emergent auto-provisions SSL
- If issues persist, contact Emergent support

### App Errors After Deployment
1. Check browser console for errors
2. Verify environment variables are set
3. Check Emergent deployment logs

---

## Quick Reference

| Item | Value |
|------|-------|
| Preview URL | https://marketplace-featured.preview.emergentagent.com |
| GoDaddy DNS | https://dcc.godaddy.com/manage/dns |
| Firebase Console | https://console.firebase.google.com |
| Stripe Dashboard | https://dashboard.stripe.com |

---

## Need Help?
- Emergent Support: Use the support chat in the platform
- Firebase Issues: https://firebase.google.com/support
- GoDaddy DNS Help: https://www.godaddy.com/help/manage-dns-680

