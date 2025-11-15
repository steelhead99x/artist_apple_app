// Mock Expo modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const MockIcon = (props) => {
    return React.createElement(Text, props, `Icon-${props.name}`);
  };

  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    FontAwesome: MockIcon,
    MaterialCommunityIcons: MockIcon,
    AntDesign: MockIcon,
    Entypo: MockIcon,
    EvilIcons: MockIcon,
    Feather: MockIcon,
    FontAwesome5: MockIcon,
    Foundation: MockIcon,
    Octicons: MockIcon,
    SimpleLineIcons: MockIcon,
    Zocial: MockIcon,
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
