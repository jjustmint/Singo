import React, { use, useEffect } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import ScoreChart from "../components/ScoreChart";
import SongChallenge from "../components/SongChalleng";
import WeeklyRanking from "../components/WeeklyRanking";
import { getLeaderboard } from "@/api/leaderboard";
import { getSong } from "@/api/song/getSong";
import { getAudioVerById } from "@/api/song/getAudioById";

const { height } = Dimensions.get("window");

export default function Leaderboard() {
  const audio_id = 5;
  const [songId, setSongId] = React.useState(0);
  useEffect(() => {
    const fetchData = async () => {
      await handleGetLeaderboard();
      await handleGetAudioById();
      await handleGetSongById();
    };
    fetchData();
  }, []);

  const handleGetLeaderboard = async() => {
    const chartData = await getLeaderboard(audio_id);
    console.log("Fetched leaderboard data:", chartData);
    return chartData;
  }
  const handleGetAudioById = async() => {
    const audioData = await getAudioVerById(audio_id);
    setSongId(audioData.data.song_id);
    console.log("Fetched audio data:", audioData);
    return audioData;
  }

  const handleGetSongById = async() => {
    const songData = await getSong(songId);
    console.log("Fetched song data:", songData);
    return songData;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131313" }} edges={["left", "right"]}>
      <View style={{ flex: 1, position: "relative" }}>
        {/* === Background Full Screen === */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
        >
          {/* Color Circles */}
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

          {/* Blur overlay to blend */}
          <BlurView
            intensity={100}
            tint="dark"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </View>

        {/* === Leaderboard Content === */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          style={{ flex: 1, zIndex: 2 }}
        >
          {/* Title */}
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                marginTop: 40,
              }}
            >
              Leaderboard
            </Text>
          </View>

          {/* Your Chart */}
          <ScoreChart />

          {/* Weekly Challenge Songs */}
          <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "white", marginBottom: 10 }}>
              Weekly Challenge Songs
            </Text>
          </View>
          <SongChallenge />

          {/* Weekly Ranking */}
          <View style={{ marginTop: 30, paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "white", marginBottom: 10 }}>
              Top 10 Weekly Ranking
            </Text>
            <WeeklyRanking />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
