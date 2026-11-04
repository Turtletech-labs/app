import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef, useNavigation, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChevronLeft, ConciergeBell, House, MessageCircle, Siren, User } from 'lucide-react-native';
import { colors } from './theme';
import { useApp } from './state/AppState';
import type { PostType } from './lib/types';
import { Loading } from './components/ui';
import { attachWebHistory, canSyncWebHistory } from './lib/webHistory';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ProfileFormScreen } from './screens/ProfileFormScreen';
import { RulesScreen } from './screens/RulesScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PostScreen } from './screens/PostScreen';
import { ComposeScreen } from './screens/ComposeScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { ChatScreen } from './screens/ChatScreen';
import { MemberScreen } from './screens/MemberScreen';
import { SafetyScreen } from './screens/SafetyScreen';
import { EmergencyCardScreen } from './screens/EmergencyCardScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import { GuideScreen, GuideTopicScreen } from './screens/GuidesScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { ServiceRequestScreen } from './screens/ServiceRequestScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CirclesScreen } from './screens/CirclesScreen';

export type TabParamList = { Home: undefined; Messages: undefined; Safety: undefined; Services: undefined; Profile: undefined };

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Post: { id: string };
  Compose: { type?: PostType } | undefined;
  Chat: { id: string; name: string; otherId: string };
  Member: { id: string };
  Guide: { id: string };
  GuideTopic: { guideId: string; topicId: string };
  ServiceRequest: { serviceId: string };
  EmergencyCard: undefined;
  Contacts: undefined;
  Circles: undefined;
  Rules: undefined;
  EditProfile: undefined;
  Onboarding: undefined;
};

export type ScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, text: colors.ink, primary: colors.teal, border: colors.line } };

// A clear Back control for every screen opened on top of the tabs: bigger than
// the default arrow, labelled, and easy to hit with a thumb.
function BackButton({ canGoBack }: { canGoBack?: boolean }) {
  const navigation = useNavigation();
  if (!canGoBack) return null;
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 16 }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingRight: 8, opacity: pressed ? 0.6 : 1 })}
    >
      <ChevronLeft size={28} color={colors.teal} />
      <Text style={{ color: colors.teal, fontSize: 16, fontWeight: '600' }}>Back</Text>
    </Pressable>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600', flexShrink: 0 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Community', tabBarLabel: 'Community', tabBarIcon: ({ color }) => <House color={color} size={22} /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} /> }} />
      <Tab.Screen name="Safety" component={SafetyScreen} options={{ tabBarIcon: ({ focused }) => <Siren color={focused ? colors.sos : colors.muted} size={22} />, tabBarActiveTintColor: colors.sos }} />
      <Tab.Screen name="Services" component={ServicesScreen} options={{ tabBarIcon: ({ color }) => <ConciergeBell color={color} size={22} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { ready, session, profile } = useApp();
  // On the web, tie the browser's back button to the app's screens.
  const webHistory = useMemo(() => (canSyncWebHistory()
    ? attachWebHistory({
        getRootState: () => navigationRef.getRootState() as never,
        goBack: () => navigationRef.goBack(),
        goHome: () => navigationRef.navigate('Tabs', { screen: 'Home' }),
      })
    : null), []);
  useEffect(() => () => webHistory?.dispose(), [webHistory]);
  if (!ready) return <Loading />;
  return (
    <NavigationContainer ref={navigationRef} theme={theme} onStateChange={webHistory?.onStateChange}>
      <Stack.Navigator screenOptions={{ headerTintColor: colors.teal, headerTitleStyle: { color: colors.ink }, headerBackTitle: 'Back', headerLeft: (p) => <BackButton canGoBack={p.canGoBack} /> }}>
        {!session ? (
          <Stack.Screen name="Tabs" component={WelcomeScreen} options={{ headerShown: false }} />
        ) : !profile ? (
          <Stack.Screen name="Onboarding" component={ProfileFormScreen} options={{ title: 'Set up your profile', headerBackVisible: false }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="Post" component={PostScreen} options={{ title: '' }} />
            <Stack.Screen name="Compose" component={ComposeScreen} options={{ title: 'New post', presentation: 'modal' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params.name })} />
            <Stack.Screen name="Member" component={MemberScreen} options={{ title: 'Member' }} />
            <Stack.Screen name="Guide" component={GuideScreen} options={{ title: 'Guide' }} />
            <Stack.Screen name="GuideTopic" component={GuideTopicScreen} options={{ title: 'Guide' }} />
            <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} options={{ title: 'Request a service' }} />
            <Stack.Screen name="EmergencyCard" component={EmergencyCardScreen} options={{ title: 'Emergency card' }} />
            <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Trusted contacts' }} />
            <Stack.Screen name="Circles" component={CirclesScreen} options={{ title: 'Your circles' }} />
            <Stack.Screen name="Rules" component={RulesScreen} options={{ title: 'Rules and privacy' }} />
            <Stack.Screen name="EditProfile" component={ProfileFormScreen} options={{ title: 'Edit profile' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
