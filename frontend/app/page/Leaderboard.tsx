// ---------------- Leaderboard.tsx ----------------
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getLeaderboard } from "@/api/leaderboard";
import { ChallengeSongType, LeaderboardEntryType, LeaderboardPayload } from "@/api/types/leaderboard";
import ScoreChart from "../components/ScoreChart";
import WeeklyRanking from "../components/WeeklyRanking"; 
import SongChallenge from "../components/SongChalleng";
import { resolveProfileImage } from "../components/ProfileInfo";

const { height } = Dimensions.get("window");
const CHALLENGE_DEFAULT_START = "2025-09-26"; //comment: replace with actual default start date
const CHALLENGE_LOOKBACK_DAYS = 14;
const LEADERBOARD_CACHE_KEY = "leaderboard:weekly-cache:v1";
const LEADERBOARD_CACHE_MAX_AGE_MS = 1000 * 60 * 5;

// ---------------- Types ----------------
interface User {
  recordId: string; // convert to string
  userName: string;
  accuracyScore: number;
  profilePicture?: string;
  userId?: number | null;
}

type LeaderboardCachePayload = {
  fetchedAt?: number;
  weeklyRanking?: User[];
  challengeVersionId?: number | null;
};

// ---------------- Leaderboard Screen ----------------
export default function Leaderboard() {
  const [weeklyRanking, setWeeklyRanking] = useState<User[] | null>(null);
  const [challengeVersionId, setChallengeVersionId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef(false);

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
    if (isFetchingRef.current) return;

    const now = Date.now();
    if (
      lastFetchRef.current &&
      now - lastFetchRef.current < LEADERBOARD_CACHE_MAX_AGE_MS
    ) {
      return;
    }

    isFetchingRef.current = true;
    try {
      const { leaderBoard: rawEntries, challengeSong } =
        await findLatestChallenge();
      const normalisedEntries: LeaderboardEntryType[] = Array.isArray(
        rawEntries
      )
        ? rawEntries
        : [];

      const data: User[] = normalisedEntries.map((entry: LeaderboardEntryType) => {
        const cleanedProfile =
          typeof entry.profilePicture === "string"
            ? entry.profilePicture.trim()
            : null;
        const baseProfilePath: string | null =
          cleanedProfile && cleanedProfile.length > 0
            ? cleanedProfile
            : entry.user_id != null
            ? `uploads/users/${entry.user_id}/photo/photo.jpg`
            : null;
        const stampedProfile =
          baseProfilePath != null
            ? `${baseProfilePath}${baseProfilePath.includes("?") ? "&" : "?"}t=${
                entry.record_id ?? entry.user_id ?? Date.now()
              }`
            : undefined;
        const normalizedProfile = resolveProfileImage(stampedProfile) ?? undefined;

        return {
          recordId: String(
            entry.record_id ??
              entry.user_id ??
              Math.floor(Date.now() + Math.random() * 1000)
          ),
          userName: entry.userName ?? "Unknown",
          accuracyScore: entry.accuracyScore ?? 0,
          profilePicture: normalizedProfile,
          userId: entry.user_id ?? null,
        };
      });

      const sortedData = [...data].sort(
        (a, b) => b.accuracyScore - a.accuracyScore
      );

      setWeeklyRanking(sortedData);
      setChallengeVersionId(challengeSong?.version_id ?? null);
      lastFetchRef.current = Date.now();

      AsyncStorage.setItem(
        LEADERBOARD_CACHE_KEY,
        JSON.stringify({
          fetchedAt: lastFetchRef.current,
          weeklyRanking: sortedData,
          challengeVersionId: challengeSong?.version_id ?? null,
        })
      ).catch(() => undefined);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setWeeklyRanking((prev) => (prev === null ? [] : prev));
      setChallengeVersionId(null);
    } finally {
      isFetchingRef.current = false;
    }
  }, [findLatestChallenge]);

  useEffect(() => {
    let cancelled = false;

    const restoreCache = async () => {
      try {
        const cachedRaw = await AsyncStorage.getItem(LEADERBOARD_CACHE_KEY);
        if (!cachedRaw) return;
        const cached = JSON.parse(cachedRaw) as LeaderboardCachePayload;
        if (cancelled) return;

        const cachedWeeklyRanking: User[] | undefined = cached?.weeklyRanking;
        if (Array.isArray(cachedWeeklyRanking)) {
          setWeeklyRanking((prev) =>
            prev === null ? cachedWeeklyRanking : prev
          );
        }

        if (cached?.challengeVersionId !== undefined) {
          setChallengeVersionId((prev) => {
            if (prev !== null) return prev;
            const value = cached.challengeVersionId;
            return value === null ? null : Number(value);
          });
        }

        if (typeof cached?.fetchedAt === "number") {
          lastFetchRef.current = cached.fetchedAt;
        }
      } catch (err) {
        console.warn("Failed to load cached leaderboard", err);
      }
    };

    restoreCache();

    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [fetchLeaderboard])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    lastFetchRef.current = 0;
    await fetchLeaderboard();
    setIsRefreshing(false);
  }, [fetchLeaderboard]);

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          style={{ flex: 1, zIndex: 2 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#ffffff"
            />
          }
        >
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
