import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import EnhancedHomeScreen from '../screens/EnhancedHomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HelpScreen from '../screens/HelpScreen';
import CreateBand from '../screens/CreateBand';
import CreateTour from '../screens/CreateTour';
import TourDetails from '../screens/TourDetails';
import LiveStream from '../screens/LiveStream';
import theme from '../theme';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={EnhancedHomeScreen} />
      <HomeStack.Screen name="CreateBand" component={CreateBand} />
      <HomeStack.Screen name="CreateTour" component={CreateTour} />
      <HomeStack.Screen name="TourDetails" component={TourDetails} />
      <HomeStack.Screen name="LiveStream" component={LiveStream} />
    </HomeStack.Navigator>
  );
}

function CalendarStackScreen() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarMain" component={CalendarScreen} />
      <CalendarStack.Screen name="CreateTour" component={CreateTour} />
      <CalendarStack.Screen name="TourDetails" component={TourDetails} />
    </CalendarStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Help" component={HelpScreen} />
    </ProfileStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Discover':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.gray[400],
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopWidth: 1,
          borderTopColor: theme.colors.gray[200],
          paddingBottom: Platform.OS === 'web' ? 18 : 8,
          paddingTop: Platform.OS === 'web' ? 12 : 8,
          height: Platform.OS === 'web' ? 78 : 60,
          ...(Platform.OS === 'web' && {
            boxShadow: '0 -4px 12px rgba(15, 23, 42, 0.08)',
            position: 'sticky' as const,
            bottom: 0,
            zIndex: 200,
          }),
        },
        tabBarLabelStyle: {
          marginTop: 4,
          marginBottom: Platform.OS === 'web' ? 2 : 0,
        },
        tabBarIconStyle: {
          marginBottom: Platform.OS === 'web' ? 4 : 0,
        },
        headerStyle: {
          backgroundColor: theme.colors.background.primary,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
          fontWeight: theme.typography.fontWeights.semibold,
          fontSize: theme.typography.sizes.lg,
        },
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{ title: 'Artist Space' }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: 'Discover' }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarStackScreen}
        options={{ title: 'Calendar' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
