import React from "react";
import { View, Text } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import styles from "../style/componentstyle/ScoreChartStyle";

export default function ScoreChart() {
  return (
    <View style={styles.container}>
      {/* 2nd place */}
      <View style={styles.playerContainer}>
        <FontAwesome6 name="medal" size={24} color="#C0C0C0" />
        <Text style={[styles.rankText, { fontSize: 35, color: "white" }]}>2</Text>
        <View style={[styles.scoreBox, { height: 140, backgroundColor: "#8b5cf6" }]}>
          <Text style={styles.scoreText}>420</Text>
        </View>
      </View>

      {/* 1st place */}
      <View style={styles.playerContainer}>
        <FontAwesome6 name="crown" size={30} color="#facc15" />
        <Text style={[styles.rankText, { fontSize: 50, color: "#FFD700" }]}>1</Text>
        <View style={[styles.scoreBox, { height: 180, backgroundColor: "#ec4899" }]}>
          <Text style={styles.scoreText}>500</Text>
        </View>
      </View>

      {/* 3rd place */}
      <View style={styles.playerContainer}>
        <FontAwesome6 name="medal" size={24} color="#CD7F32" />
        <Text style={[styles.rankText, { fontSize: 25, color: "white" }]}>3</Text>
        <View style={[styles.scoreBox, { height: 100, backgroundColor: "#3b82f6" }]}>
          <Text style={styles.scoreText}>350</Text>
        </View>
      </View>
    </View>
  );
}
