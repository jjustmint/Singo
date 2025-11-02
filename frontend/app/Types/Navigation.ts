// navigation.ts
import type { NavigatorScreenParams } from "@react-navigation/native";
import { SongType } from "./Song";
import { SongKeyType } from "./SongKey";

// Bottom tabs live in their own param list
export type TabParamList = {
  Home: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

// Root stack references the tabs via NavigatorScreenParams
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>; // <-- important
  ChooseKey: { song: SongType; selectedKey?: string | null; versionId?: number; userKey?: string | null; };
  SettingScreen: undefined;
  SignIn: undefined;
  voicetest: undefined;
  params?: { song?: SongType & { selectedKey?: string } };
  MusicPlayer: { songKey: any; vocalEnabled?: boolean };
  Result: { score: number; song_id: number; recordId: number; version_id: number; localUri?: string | null };
  Summary: {
    score: number;
    song_id: number;
    recordId: number;
    version_id?: number | null;
    localUri?: string | null;
  };
  Signup: undefined;
  EditProfile: undefined;
};

export type ChooseKeyParams = { song: SongType; selectedKey?: string | null; versionId?: number };

export type MusicPlayerParams = { songKey: SongKeyType };

export type TabKey = "home" | "stats" | "profile";
