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

