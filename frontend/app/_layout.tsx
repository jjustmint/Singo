// MainNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { RootStackParamList, TabParamList } from "@/types/Navigation";

import Home from "./page/Home";
import Leaderboard from "./page/Leaderboard";
import Profile from "./page/Profile";
import EditProfile from "./page/EditProfile";
import BottomNav from "./components/BottomNav";
import ChooseKey from "./page/ChooseKey";
import MusicPlayer from "./page/MusicPlayer";   // (keep if used elsewhere)         // (keep if used elsewhere)
import LoginScreen from "./pages/Login";
import SignupScreen from "./pages/Signup";
import VoiceTestScreen from "./page/voicetest";
import Summary from "./page/Summary";
import ResultScreen from "./page/ResultScreen";

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

export default function MainNavigator() {
  return (
      <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
        <Stack.Screen name="SignIn" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="ChooseKey" component={ChooseKey} />
        <Stack.Screen name="voicetest" component={VoiceTestScreen} />
        <Stack.Screen name="MusicPlayer" component={MusicPlayer} />
        <Stack.Screen name="Summary" component={Summary} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="EditProfile" component={EditProfile} />
      </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={({ navigation, state }) => (
        <CustomBottomNav navigation={navigation} state={state} />
      )}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Leaderboard" component={Leaderboard} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

function CustomBottomNav({ navigation, state }: { navigation: any; state: any }) {
  const handleTabPress = (key: "home" | "stats" | "profile") => {
    const routeName = key === "home" ? "Home" : key === "stats" ? "Leaderboard" : "Profile";
    navigation.navigate(routeName);
  };

  const active = state.routes[state.index]?.name;
  const activeTab = active === "Home" ? "home" : active === "Leaderboard" ? "stats" : "profile";

  return (
    <BottomNav
      active={activeTab}
      onTabPress={(key: string) => handleTabPress(key as "home" | "stats" | "profile")}
    />
  );
}
