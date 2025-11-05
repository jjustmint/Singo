import React, { useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/Navigation";

// ✅ Type navigation and route props
type ResultNavProp = StackNavigationProp<RootStackParamList, "Result">;
type ResultRouteProp = RouteProp<RootStackParamList, "Result">;

interface Props {
  route: ResultRouteProp;
}

const ResultScreen: React.FC<Props> = ({ route }) => {
  const { score, recordId, song_id, version_id, localUri } = route.params;
  const navigation = useNavigation<ResultNavProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Navigate to Summary with all params
      navigation.navigate("Summary", {
        score,
        recordId,
        song_id,
        version_id,
        localUri,
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation, score, recordId, song_id, version_id, localUri]);

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
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  score: { fontSize: 72, fontWeight: "bold", color: "#fff" },
});
