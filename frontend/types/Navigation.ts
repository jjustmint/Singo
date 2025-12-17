import type { NavigatorScreenParams } from "@react-navigation/native";
import { SongType } from "./Song";
import { SongKeyType } from "./SongKey";

export type TabParamList = {
  Home: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  ChooseKey: { song: SongType; selectedKey?: string | null; versionId?: number; userKey?: string | null; };
  SettingScreen: undefined;
  SignIn: undefined;
  voicetest: undefined;
  params?: { song?: SongType & { selectedKey?: string } };
  MusicPlayer: {
    songKey: SongKeyType;
    vocalEnabled?: boolean;
    isWeeklyChallenge?: boolean;
  };
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

export type MusicPlayerParams = {
  songKey: SongKeyType;
  vocalEnabled?: boolean;
  isWeeklyChallenge?: boolean;
};

export type TabKey = "home" | "stats" | "profile";
