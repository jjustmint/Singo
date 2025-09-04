export type RootStackParamList = {
    MainTabs: undefined;
    ChooseKey: { song: { id: string; songName: string; artist: string; image: string } };
    SettingScreen: undefined;
    SignIn: undefined;
    Home: undefined;
    Leaderboard: undefined;
    Profile: undefined;
};

export type TabKey = "home" | "stats" | "profile";

// Added a default export to resolve the missing default export warning
export default {};

