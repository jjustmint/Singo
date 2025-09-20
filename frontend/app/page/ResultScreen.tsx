import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const ResultScreen: React.FC<{ route: { params: { score: number } } }> = ({ route }) => {
  const { score } = route.params;

  return (
    <LinearGradient
      colors={["#5A62FF", "#C56FFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.content}>
        <Text style={styles.title}>Your Score</Text>
        <Text style={styles.score}>{score}%</Text>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ResultScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  score: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#fff",
  },
});
