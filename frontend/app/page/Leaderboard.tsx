import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import ScoreChart from "../components/ScoreChart";
import SongChallenge from "../components/SongChalleng";
import WeeklyRanking from "../components/WeeklyRanking";
import { getLeaderboard } from "@/api/leaderboard";
import { getSong } from "@/api/song/getSong";
import { getAudioVerById } from "@/api/song/getAudioById";

import styles from "../style/pagestyle/LeaderboardStyle"

const { height } = Dimensions.get("window");

export default function Leaderboard() {
  const audio_id = 5;
  const [songId, setSongId] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      await handleGetLeaderboard();
      await handleGetAudioById();
      await handleGetSongById();
    };
    fetchData();
  }, [songId]);

  const handleGetLeaderboard = async () => {
    const chartData = await getLeaderboard(audio_id);
    console.log("Fetched leaderboard data:", chartData);
    return chartData;
  };

  const handleGetAudioById = async () => {
    const audioData = await getAudioVerById(audio_id);
    setSongId(audioData.data.song_id);
    console.log("Fetched audio data:", audioData);
    return audioData;
  };

  const handleGetSongById = async () => {
    if (!songId) return;
    const songData = await getSong(songId);
    console.log("Fetched song data:", songData);
    return songData;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        {/* Background */}
        <View style={styles.backgroundContainer}>
          <View style={styles.circlePink} />
          <View style={styles.circlePurple} />
          <View style={styles.circleBlue} />
          <BlurView intensity={100} tint="dark" style={styles.blur} />
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>Leaderboard</Text>

          {/* Chart */}
          <ScoreChart />

          {/* Weekly Challenge */}
          <Text style={styles.sectionHeader}>Weekly Challenge Songs</Text>
          <SongChallenge />

          {/* Weekly Ranking */}
          <Text style={styles.sectionHeader}>Top 10 Weekly Ranking</Text>
          <WeeklyRanking />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
