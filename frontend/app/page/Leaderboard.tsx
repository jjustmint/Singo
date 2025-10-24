// ---------------- Leaderboard.tsx ----------------
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Image,
  StyleSheet,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect } from "@react-navigation/native";

import { getLeaderboard } from "@/api/leaderboard";
import { ChallengeSongType, LeaderboardEntryType, LeaderboardPayload } from "@/api/types/leaderboard";
import ScoreChart from "../components/ScoreChart";
import WeeklyRanking from "../components/WeeklyRanking"; 
import SongChallenge from "../components/SongChalleng";
import { resolveProfileImage } from "../components/ProfileInfo";

const { height } = Dimensions.get("window");
const CHALLENGE_DEFAULT_START = "2025-09-26"; //comment: replace with actual default start date
const CHALLENGE_LOOKBACK_DAYS = 14;

// ---------------- Types ----------------
interface User {
  recordId: string; // convert to string
  userName: string;
  accuracyScore: number;
  profilePicture?: string;
}

// ---------------- Leaderboard Screen ----------------
export default function Leaderboard() {
  const [weeklyRanking, setWeeklyRanking] = useState<User[] | null>(null);
  const [challengeVersionId, setChallengeVersionId] = useState<number | null>(null);

  const parseResponse = useCallback((payload?: LeaderboardPayload | null) => {
    const leaderBoard: LeaderboardEntryType[] = Array.isArray(
      payload?.leaderBoard
    )
      ? (payload?.leaderBoard as LeaderboardEntryType[])
      : [];
    const challengeSong: ChallengeSongType | null =
      payload?.challengeSong ?? null;

    return {
      leaderBoard,
      challengeSong,
    };
  }, []);

  const findLatestChallenge = useCallback(async () => {
    const today = new Date();

    for (let offset = 0; offset < CHALLENGE_LOOKBACK_DAYS; offset += 1) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() - offset);
      const isoDate = candidate.toISOString().split("T")[0];

      try {
        const response = await getLeaderboard(isoDate);
        const parsed = parseResponse(response?.data);
        const hasChallenge = Boolean(parsed.challengeSong);
        const hasLeaderboard = parsed.leaderBoard.length > 0;

        if (hasChallenge || hasLeaderboard) {
          return parsed;
        }
      } catch (err) {
        console.warn(`Leaderboard fetch failed for ${isoDate}`, err);
      }
    }

    try {
      const fallbackResponse = await getLeaderboard(CHALLENGE_DEFAULT_START);
      return parseResponse(fallbackResponse?.data);
    } catch (err) {
      console.warn("Fallback leaderboard fetch failed", err);
      return {
        leaderBoard: [],
        challengeSong: null,
      };
    }
  }, [parseResponse]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { leaderBoard: rawEntries, challengeSong } =
        await findLatestChallenge();
      const normalisedEntries: LeaderboardEntryType[] = Array.isArray(
        rawEntries
      )
        ? rawEntries
        : [];

      const data: User[] = normalisedEntries.map((entry: LeaderboardEntryType) => {
        const profilePicturePath: string | null = entry.profilePicture ?? null;
        const normalizedProfile =
          resolveProfileImage(profilePicturePath ?? undefined) ?? undefined;

        return {
          recordId: String(
            entry.record_id ??
              entry.user_id ??
              Math.floor(Date.now() + Math.random() * 1000)
          ),
          userName: entry.userName ?? "Unknown",
          accuracyScore: entry.accuracyScore ?? 0,
          profilePicture: normalizedProfile,
        };
      });

      const sortedData = [...data].sort(
        (a, b) => b.accuracyScore - a.accuracyScore
      );

      setWeeklyRanking(sortedData);
      setChallengeVersionId(challengeSong?.version_id ?? null);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setWeeklyRanking([]);
      setChallengeVersionId(null);
    }
  }, [findLatestChallenge]);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [fetchLeaderboard])
  );

  // ---------------- UI ----------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131313" }} edges={["left", "right"]}>
      <View style={{ flex: 1, position: "relative" }}>
        {/* Background Shapes */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
          <View
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: 150,
              backgroundColor: "rgba(255, 102, 204, 1)",
              top: -80,
              left: -60,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: 130,
              backgroundColor: "rgba(160, 102, 255, 1)",
              top: 10,
              right: -80,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 300,
              height: 200,
              borderRadius: 110,
              backgroundColor: "rgba(102, 140, 255, 1)",
              top: 150,
              left: -40,
            }}
          />
          <BlurView intensity={100} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} style={{ flex: 1, zIndex: 2 }}>
          {/* Title */}
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 32, fontWeight: "bold", color: "white", textAlign: "center", marginTop: 40 }}>
              Leaderboard
            </Text>
          </View>

          {/* Top 3 Score Chart */}
          <ScoreChart
            top3={weeklyRanking ? weeklyRanking.slice(0, 3) : []}
          />

          {/* Weekly Challenge Song */}
          <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "white", marginBottom: 10 }}>
              Weekly Challenge Song
            </Text>

            {/* Use the modular SongChallenge component */}
            <SongChallenge audioId={challengeVersionId} />
          </View>

          {/* Top 10 Weekly Ranking */}
          <View style={{ marginTop: 30, paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "white", marginBottom: 10 }}>
              Top 10 Weekly Ranking
            </Text>

            {weeklyRanking === null ? (
              <Text style={{ color: "white" }}>Loading...</Text>
            ) : weeklyRanking.length === 0 ? (
              <Text style={{ color: "gray" }}>No rankings available</Text>
            ) : (
              <WeeklyRanking data={weeklyRanking} />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
  },
  rank: {
    width: 30,
    textAlign: "center",
    fontWeight: "bold",
    marginRight: 8,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  Username: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
  },
  Score: {
    fontSize: 15,
    color: "#bbb",
    marginTop: 2,
  },
  icon: {
    marginLeft: 10,
    alignSelf: "center",
  },
});
