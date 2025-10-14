// ---------------- Leaderboard.tsx ----------------
import React, { useEffect, useState } from "react";
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

import { getLeaderboard } from "@/api/leaderboard";
import { LeaderboardEntryType } from "@/api/types/leaderboard";
import ScoreChart from "../components/ScoreChart";
import WeeklyRanking from "../components/WeeklyRanking"; 
import SongChallenge from "../components/SongChalleng";
import { resolveProfileImage } from "../components/ProfileInfo";

const { height } = Dimensions.get("window");
const CHALLENGE_DEFAULT_START = "2025-09-26";
const WEEKLY_CHALLENGE_VERSION_ID = 5;

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchLeaderboard();
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // ---------------- Fetch Leaderboard ----------------
  const getCurrentWeekStartDate = () => {
    const now = new Date();
    const day = now.getDay(); // Sunday = 0
    const diff = (day + 6) % 7; // convert to Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  const fetchLeaderboard = async () => {
    try {
      const startDate = getCurrentWeekStartDate();
      let leaderboardData = await getLeaderboard(startDate);

      let rawEntries: LeaderboardEntryType[] = Array.isArray(leaderboardData?.data)
        ? (leaderboardData.data as LeaderboardEntryType[])
        : [];

      if (rawEntries.length === 0 && startDate !== CHALLENGE_DEFAULT_START) {
        try {
          const fallbackData = await getLeaderboard(CHALLENGE_DEFAULT_START);
          if (Array.isArray(fallbackData?.data)) {
            rawEntries = fallbackData.data as LeaderboardEntryType[];
          }
        } catch (fallbackErr) {
          console.warn("Fallback leaderboard fetch failed", fallbackErr);
        }
      }

      if (!Array.isArray(rawEntries)) {
        rawEntries = [];
      }

      const data: User[] = rawEntries.map(
        (entry: LeaderboardEntryType) => {
          const profilePicturePath: string | null = entry.profilePicture ?? null;
          const normalizedProfile = resolveProfileImage(profilePicturePath ?? undefined) ?? undefined;

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
        }
      );

      const sortedData = [...data].sort(
        (a, b) => b.accuracyScore - a.accuracyScore
      );

      setWeeklyRanking(sortedData);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setWeeklyRanking([]);
    }
  };

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
  <SongChallenge audioId={WEEKLY_CHALLENGE_VERSION_ID} />
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
