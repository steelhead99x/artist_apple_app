# Contributing to Artist Space

Thank you for contributing to Artist Space! This guide will help you get started.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Documentation](#documentation)
6. [Pull Request Process](#pull-request-process)
7. [Testing](#testing)
8. [Security](#security)

---

## 👥 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Report unacceptable behavior

---

## 🚀 Getting Started

### 1. Fork & Clone
```bash
git clone https://github.com/your-username/artist_apple_app.git
cd artist_apple_app
npm install
```

### 2. Create Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your values
```

---

## 🔄 Development Workflow

### 1. Make Changes
- Write clean, documented code
- Follow coding standards
- Add tests if applicable
- Update documentation

### 2. Test Locally
```bash
npm start
npm test
npm run lint
```

### 3. Commit
```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Message Format:**
```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(auth): add biometric authentication
fix(messages): resolve encryption key issue
docs(api): update endpoint documentation
```

### 4. Push & PR
```bash
git push origin feature/your-feature-name
```

Then create Pull Request on GitHub.

---

## 📝 Coding Standards

### TypeScript
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return apiService.get<User>(`/users/${id}`);
}

// ❌ Bad
function getUser(id) {
  return apiService.get('/users/' + id);
}
```

### React Components
```typescript
// ✅ Good - Functional component with TypeScript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}

// ❌ Bad - No types, unclear props
export function Button(props) {
  return <TouchableOpacity onPress={props.onPress}>...</TouchableOpacity>;
}
```

### File Organization
```
src/
├── components/
│   └── common/          # Shared components
│       ├── Button.tsx
│       ├── Card.tsx
│       └── index.ts     # Export all
├── screens/             # One file per screen
│   └── HomeScreen.tsx
├── services/            # Business logic
│   ├── api.ts
│   └── auth.ts
└── types/               # TypeScript types
    └── index.ts
```

### Naming Conventions
- **Components:** PascalCase (`Button`, `HomeScreen`)
- **Files:** PascalCase for components (`Button.tsx`)
- **Functions:** camelCase (`getUserData`, `handlePress`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces:** PascalCase (`User`, `ButtonProps`)

---

## 📚 Documentation

### JSDoc Comments
```typescript
/**
 * Fetches user data from the API
 *
 * @param userId - The unique user identifier
 * @returns Promise resolving to User object
 * @throws ApiError if request fails
 *
 * @example
 * const user = await getUser('123');
 * console.log(user.name);
 */
export async function getUser(userId: string): Promise<User> {
  return await apiService.get(`/users/${userId}`);
}
```

### Component Documentation
```typescript
/**
 * Primary button component with multiple variants
 *
 * @component
 * @example
 * <Button
 *   title="Save"
 *   onPress={handleSave}
 *   variant="primary"
 *   loading={isSaving}
 * />
 */
export function Button({ title, onPress, variant, loading }: ButtonProps) {
  // ...
}
```

### Update Documentation Files
When you:
- Add a feature → Update feature docs
- Change API → Update API docs
- Modify UI → Update UI docs
- Fix bug → Update troubleshooting

---

## 🔍 Pull Request Process

### PR Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests pass
- [ ] No console errors
- [ ] Builds successfully

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Manual testing completed
- [ ] Unit tests added/updated

## Screenshots (if UI changes)
[Add screenshots]

## Related Issues
Fixes #123

## Checklist
- [ ] Documentation updated
- [ ] Tests passing
- [ ] No breaking changes
```

### Review Process
1. **Automated checks** run (lint, type-check, build)
2. **Code review** by team member
3. **Testing** on devices if needed
4. **Approval** required before merge
5. **Merge** to main branch

---

## 🧪 Testing

### Manual Testing
```bash
# Start app
npm start

# Test on iOS
npm run ios

# Test on Android
npm run android
```

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

### Before Submitting
- [ ] App launches successfully
- [ ] No console errors/warnings
- [ ] Features work as expected
- [ ] UI looks correct on both platforms
- [ ] No performance issues

---

## 🔒 Security

### Security-Sensitive Changes
If your PR touches:
- Authentication
- Encryption
- API tokens
- User data
- Payments

**Extra requirements:**
1. Security review by maintainer
2. Test security implications
3. Update security documentation
4. Consider OWASP top 10

### Reporting Security Issues
**Do NOT** create public issues for security vulnerabilities.

Instead:
1. Email security contact (see README)
2. Provide detailed description
3. Include steps to reproduce
4. Allow time for fix before disclosure

---

## 📊 Project-Specific Guidelines

### State Management
- Use React Context for global state
- Use local state for component-specific data
- Keep state as close to usage as possible

### API Calls
- Use `apiService` from `src/services/api.ts`
- Handle errors gracefully
- Show loading states
- Cache when appropriate

### Styling
- Use theme system (`src/theme/index.ts`)
- Follow design system guidelines
- Maintain consistent spacing
- Support both light/dark mode (future)

### Performance
- Lazy load heavy components
- Use `React.memo` for expensive renders
- Optimize images
- Minimize bundle size

---

## 🎯 Best Practices

### Do's ✅
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names
- Handle edge cases
- Test on real devices
- Update documentation

### Don'ts ❌
- Hardcode values
- Ignore TypeScript errors
- Skip error handling
- Leave console.logs
- Commit secrets/keys
- Make breaking changes without discussion
- Ignore review feedback

---

## 📞 Getting Help

### Questions?
- Check existing documentation
- Search closed issues/PRs
- Ask in team chat
- Create discussion (not issue)

### Stuck?
- Review similar code in codebase
- Check React Native docs
- Consult Expo documentation
- Ask for help (we're friendly!)

---

## 🎉 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Appreciated in team meetings

Thank you for making Artist Space better! 🙏

---

**Questions?** Check [README.md](./README.md) or create a discussion.
