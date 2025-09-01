import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import ScoreChart from "../components/ScoreChart";
import SongChallenge from "../components/SongChalleng";
import WeeklyRanking from "../components/WeeklyRanking";

export default function Leaderboard() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131313" }}>
      <LinearGradient
        colors={["#6d28d9", "#1e3a8a", "#131313"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 260,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ padding: 20, marginTop: 10 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
            }}
          >
            Leaderboard
          </Text>
        </View>

        <ScoreChart />

        <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "white",
              marginBottom: 10,
            }}
          >
            Weekly Challenge Songs
          </Text>
        </View>
        <SongChallenge />

        <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "white",
              marginBottom: 10,
            }}
          >
            Top 10 Weekly Ranking
          </Text>
          <WeeklyRanking />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

