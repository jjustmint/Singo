import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { View, Text } from "react-native";
import Home from "./page/Home";
import Leaderboard from "./page/Leaderboard";
import Profile from "./page/Profile";
import BottomNav from "./components/BottomNav";
import ChooseKey from "./page/ChooseKey";
import MusicPlayer from "./page/MusicPlayer";
import Summary from "./page/Summary";
import LoginScreen from "./pages/Login";
import SignupScreen from "./pages/Signup";
import VoiceTestScreen from "./page/voicetest";


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true, // Enable swipe gestures
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="ChooseKey" component={ChooseKey} />
      <Stack.Screen name="MusicPlayer" component={MusicPlayer} />
      <Stack.Screen name="Summary" component={Summary} />
      <Stack.Screen name="voicetest" component={require("./page/voicetest").default} />
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

const TABS = ["home", "stats", "profile"];

function CustomBottomNav({
  navigation,
  state,
}: {
  navigation: any;
  state: any;
}) {
  const handleTabPress = (key: string) => {
    const routeName =
      key === "home"
        ? "Home"
        : key === "stats"
        ? "Leaderboard"
        : key === "profile"
        ? "Profile"
        : null;

    if (routeName) {
      navigation.navigate(routeName);
    } else {
      console.warn(`Invalid tab key: ${key}`); // Changed to a string template
    }
  };

  const activeTab =
    state.routes[state.index]?.name === "Home"
      ? "home"
      : state.routes[state.index]?.name === "Leaderboard"
      ? "stats"
      : state.routes[state.index]?.name === "Profile"
      ? "profile"
      : "home"; // Default to "home" if no match

  return (
    <View style={{ position: "absolute", bottom: 50, left: 0, right: 0 }}> {/* Adjusted bottom position to 50px */}
      <BottomNav
        active={activeTab}
        onTabPress={(key: string) => {
          handleTabPress(key);
        }}
      />
    </View>
  );
}

