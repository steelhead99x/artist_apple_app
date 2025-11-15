# Artist Space Mobile App

**Version:** 1.0.0
**Platform:** React Native + Expo
**Last Updated:** 2025-11-15

A professional, enterprise-secure mobile application for artists, musicians, and bands. Features end-to-end encrypted messaging, real-time video calls, payment processing, and beautiful UI/UX designed specifically for the music industry.

---

## 📚 Documentation Hub

**This README serves as the central navigation for all documentation.**

### 🚀 Quick Start (5 minutes)
- [Installation & Setup](./docs/QUICK_START.md)
- [Developer Onboarding](./docs/DEVELOPER_ONBOARDING.md)
- [Environment Configuration](./docs/ENVIRONMENT_SETUP.md)

### 🏗️ Development
- [Project Structure](./docs/PROJECT_STRUCTURE.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [State Management](./docs/STATE_MANAGEMENT.md)
- [API Documentation](./docs/API.md)
- [Component Library](./docs/COMPONENTS.md)

### 🎨 UI/UX
- [UI Improvements Guide](./UI_IMPROVEMENTS.md) - Complete design system
- [Quick UI Guide](./QUICK_UI_GUIDE.md) - Component usage examples
- [Theme System](./docs/STYLING.md) - Colors, typography, spacing

### 🔒 Security
- [Security Implementation Guide](./SECURITY_IMPLEMENTATION_GUIDE.md) - **START HERE**
- [Security Analysis](./SECURITY_ANALYSIS.md) - Audit results
- [Security Quick Reference](./SECURITY_QUICK_REFERENCE.md) - Quick lookup

### 🎥 Features
- [Authentication](./docs/features/AUTHENTICATION.md) - 4 auth methods
- [E2EE Messaging](./docs/features/E2EE_MESSAGING.md) - TweetNaCl encryption
- [LiveKit Integration](./LIVEKIT_INTEGRATION.md) - Real-time video/audio
- [Payment Processing](./docs/features/PAYMENTS.md) - Stripe, PayPal, crypto
- [File Uploads](./docs/features/FILE_UPLOADS.md) - Media handling

### 🚀 Deployment
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment
- [CI/CD Setup](./docs/CICD.md) - Automated pipelines
- [Monitoring](./docs/MONITORING.md) - Logging and alerts

### 🤝 Contributing
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute
- [Code Review Guide](./docs/CODE_REVIEW.md) - Review checklist
- [Testing Guide](./docs/TESTING.md) - Test strategies
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues

### 📋 Reference
- [Changelog](./CHANGELOG.md) - Version history
- [API Routes](./docs/api/ROUTES.md) - All endpoints
- [Database Schema](./docs/api/DATABASE.md) - Database structure
- [Type Definitions](./docs/api/TYPES.md) - TypeScript types

---

## ✨ Key Features

### Enterprise Security
- 🔐 **End-to-End Encryption** - TweetNaCl + LiveKit E2EE
- 🔑 **4 Authentication Methods** - Email, PIN, Biometric, Wallet
- 🛡️ **Rate Limiting** - Protection against attacks
- 📱 **Biometric Auth** - Face ID, Touch ID, Fingerprint
- 🔒 **Secure Storage** - Encrypted credential storage

### Real-Time Communications
- 🎥 **Video Calls** - LiveKit with E2EE on meet.artist-space.com
- 💬 **Real-Time Chat** - LiveKit on chat.artist-space.com
- 📞 **Screen Sharing** - Collaborate remotely
- 🎤 **HD Audio** - Crystal clear voice

### Beautiful UI/UX
- ✨ **Modern Design** - Glass-morphism and gradients
- 🎨 **Music-Themed** - Colors and features for artists
- ⚡ **Fast & Smooth** - 60fps animations
- 📱 **Intuitive** - Simple, easy to use
- 🎯 **Quick Actions** - Common tasks one tap away

### Payment & Financial
- 💳 **Multiple Gateways** - Stripe, PayPal, Braintree
- ₿ **Crypto Support** - Ethereum payments
- 📊 **Payment Tracking** - Ledger and history
- 📄 **W-2 Support** - Tax document handling

---

## 🛠️ Tech Stack

### Frontend
- **React Native** 0.76.5 with **Expo** 52.0
- **TypeScript** 5.3 for type safety
- **Expo Router** 4.0 for navigation
- **LiveKit** 2.5 for real-time communications
- **TweetNaCl** 1.0.3 for E2EE messaging
- **Axios** 1.7.7 for API calls

### Backend
- **Node.js** 18+ with **Express** 4.21
- **PostgreSQL** 8.11 with connection pooling
- **LiveKit Server SDK** 2.0 for video/audio
- **Stripe** 19.1, **PayPal**, **Braintree** for payments
- **Ethers.js** 6.13 for cryptocurrency
- **Bcrypt** for password hashing

### Infrastructure
- **Digital Ocean** - App Platform + PostgreSQL
- **LiveKit Cloud** - Real-time infrastructure
- **meet.artist-space.com** - Video meetings
- **chat.artist-space.com** - Real-time chat

---

## ⚡ Quick Start

### 1. Prerequisites
```bash
# Required
Node.js 18+
npm or yarn
Expo CLI

# Optional (for native builds)
Xcode (macOS only)
Android Studio
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

### 4. Start Development
```bash
npm start
```

**Full guide:** [Quick Start Documentation](./docs/QUICK_START.md)

---

## 📂 Project Structure

```
artist_apple_app/
├── docs/                          # 📚 All documentation
│   ├── features/                  # Feature-specific guides
│   ├── api/                       # API reference
│   ├── ARCHITECTURE.md            # System architecture
│   ├── COMPONENTS.md              # Component library
│   └── ...
├── src/                           # 💻 Source code
│   ├── components/                # Reusable UI components
│   │   └── common/                # Common components
│   ├── screens/                   # App screens
│   ├── services/                  # Business logic
│   │   ├── api.ts                 # API client
│   │   ├── encryption.ts          # E2EE service
│   │   ├── livekit.ts             # LiveKit service
│   │   ├── messages.ts            # Messaging service
│   │   └── AuthContext.tsx        # Authentication
│   ├── theme/                     # Design system
│   └── types/                     # TypeScript types
├── examples/backend/              # 🔧 Backend reference
│   ├── src/                       # Backend source
│   ├── schema.sql                 # Database schema
│   └── migration_*.sql            # Database migrations
├── .env.example                   # Environment template
├── SECURITY_IMPLEMENTATION_GUIDE.md  # Complete security guide
├── LIVEKIT_INTEGRATION.md         # LiveKit documentation
├── UI_IMPROVEMENTS.md             # Design system docs
└── README.md                      # This file (documentation hub)
```

**Detailed structure:** [Project Structure Guide](./docs/PROJECT_STRUCTURE.md)

---

## 🔧 Development Workflow

### Daily Development
```bash
# Start dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Clear cache if issues
npm start -- --clear
```

### Making Changes
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Update documentation
4. Test thoroughly
5. Create pull request
6. Code review
7. Merge to main

**Full workflow:** [Contributing Guide](./CONTRIBUTING.md)

---

## 🧪 Testing

```bash
# Run tests (when configured)
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format
```

**Testing guide:** [Testing Documentation](./docs/TESTING.md)

---

## 🚀 Building & Deployment

### Development Build
```bash
# For testing on physical devices
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production Build
```bash
# For App Store / Play Store
eas build --profile production --platform ios
eas build --profile production --platform android
```

### Deploy Backend
```bash
cd examples/backend
npm run build
npm start
```

**Full guide:** [Deployment Documentation](./DEPLOYMENT_GUIDE.md)

---

## 📖 Documentation Maintenance

### Keeping Docs Updated

**When to update documentation:**
- ✅ Adding features → Update feature docs
- ✅ Changing APIs → Update API docs
- ✅ Modifying UI → Update UI docs
- ✅ Security changes → Update security docs
- ✅ Fixing bugs → Update troubleshooting

**Documentation checklist before merging:**
- [ ] Updated relevant markdown files
- [ ] Added JSDoc comments to new code
- [ ] Updated changelog
- [ ] Checked links still work
- [ ] Added examples if new feature

### Documentation Structure
```
/docs/
├── QUICK_START.md              # Getting started
├── DEVELOPER_ONBOARDING.md     # New developer guide
├── ARCHITECTURE.md             # System design
├── API.md                      # API reference
├── COMPONENTS.md               # Component docs
├── features/                   # Feature guides
│   ├── AUTHENTICATION.md
│   ├── E2EE_MESSAGING.md
│   └── PAYMENTS.md
└── api/                        # API details
    ├── ROUTES.md
    ├── DATABASE.md
    └── TYPES.md
```

**More details:** See "Documentation Standards" section below

---

## 📊 Current Status

### Version 1.0.0

**Completed:**
- ✅ Enterprise-grade security (9/10 score)
- ✅ E2EE messaging (TweetNaCl)
- ✅ LiveKit integration (3 instances)
- ✅ Modern UI/UX design system
- ✅ 4 authentication methods
- ✅ Payment processing
- ✅ File upload handling
- ✅ Comprehensive documentation

**In Progress:**
- ⚠️ Additional feature documentation
- ⚠️ CI/CD pipeline setup
- ⚠️ Automated testing

**Planned:**
- 📋 Push notifications
- 📋 Offline mode
- 📋 Analytics dashboard

---

## 🆘 Getting Help

### Documentation
- 📚 Check this README for links to all docs
- 🔍 Search in `/docs/` directory
- 📖 Read inline code comments (JSDoc)

### Support Channels
- **Issues:** Create GitHub issue
- **Questions:** Check troubleshooting guide
- **Security:** See security documentation

### Common Issues
See [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

---

## 🤝 Contributing

We welcome contributions! Please see:
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Code Review Guide](./docs/CODE_REVIEW.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

---

## 📜 License

Private project for artist-space.com

---

## 📞 Contacts

**Project Maintainers:**
- Development Team

**Important Links:**
- Production: https://www.artist-space.com
- Staging: https://stage-www.artist-space.com
- LiveKit Meet: wss://meet.artist-space.com
- LiveKit Chat: wss://chat.artist-space.com

---

## 🎯 Documentation Standards

### File Naming
- Use `UPPERCASE.md` for top-level guides
- Use `lowercase.md` for specific features
- Use descriptive names: `AUTHENTICATION.md` not `auth.md`

### Writing Style
- **Clear and concise** - No unnecessary jargon
- **Examples included** - Show, don't just tell
- **Up-to-date** - Keep current with code
- **Well-organized** - Use headings and ToC
- **Cross-linked** - Link to related docs

### Maintenance
- Review quarterly
- Update on code changes
- Mark outdated sections
- Archive old docs

---

## 🔄 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

**Latest:**
- `1.0.0` (2025-11-15) - Initial release with full feature set

---

**Ready to start?** 🚀

→ New developers: [Developer Onboarding](./docs/DEVELOPER_ONBOARDING.md)
→ Need security info: [Security Guide](./SECURITY_IMPLEMENTATION_GUIDE.md)
→ Building features: [Architecture](./docs/ARCHITECTURE.md)
→ Deploying: [Deployment Guide](./DEPLOYMENT_GUIDE.md)

**Keep documentation updated!** Every change counts. 📝
