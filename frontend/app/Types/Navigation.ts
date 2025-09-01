export type RootStackParamList = {
    MainTabs: undefined;
    ChooseKey: { song: { id: string; songName: string; artist: string; image: string } };
    SettingScreen: undefined;
    SignIn: undefined;
  };
  
  export type TabKey = "home" | "stats" | "chooseKey" | "profile";
