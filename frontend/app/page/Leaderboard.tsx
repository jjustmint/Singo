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
import { getSong } from "@/api/song/getSong";
import { getAudioVerById } from "@/api/song/getAudioById";
import ScoreChart from "../components/ScoreChart";
import WeeklyRanking from "../components/WeeklyRanking"; 
import SongChallenge from "../components/SongChalleng";

const { height } = Dimensions.get("window");
const audio_id = 5;

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
  const [weeklySong, setWeeklySong] = useState<any | false | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchLeaderboard(), fetchWeeklySong()]);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // ---------------- Fetch Leaderboard ----------------
  const fetchLeaderboard = async () => {
    try {
      const leaderboardData = await getLeaderboard(audio_id);

      // map API data to User type and convert recordId to string
      const data: User[] = (leaderboardData?.data || []).map((user: any) => ({
        recordId: String(user.recordId), // <-- convert number to string
        userName: user.userName,
        accuracyScore: user.accuracyScore,
        profilePicture: user.profilePicture,
      }));

      const sortedData = [...data].sort(
        (a, b) => b.accuracyScore - a.accuracyScore
      );

      setWeeklyRanking(sortedData);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setWeeklyRanking([]);
    }
  };

  // ---------------- Fetch Weekly Song ----------------
  const fetchWeeklySong = async () => {
    try {
      const audioData = await getAudioVerById(audio_id);
      if (!audioData?.data?.song_id) {
        setWeeklySong(false);
        return;
      }
      const songData = await getSong(audioData.data.song_id);
      if (!songData?.data) {
        setWeeklySong(false);
        return;
      }
      setWeeklySong({
        title: songData.data.title || "Unknown Title",
        singer: songData.data.singer || "Unknown Singer",
        key: audioData.data.key_signature || "N/A",
      });
    } catch (err) {
      console.error("Failed to fetch weekly song info:", err);
      setWeeklySong(false);
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
  <SongChallenge audioId={audio_id} />
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
