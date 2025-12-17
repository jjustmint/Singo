import React from "react";
import { View, Text } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

type User = {
  userName: string;
  accuracyScore: number;
};

type ScoreChartProps = {
  top3?: User[];
};

export default function ScoreChart({ top3 = [] }: ScoreChartProps) {
  const first = top3[0] || { userName: "N/A", accuracyScore: 0 };
  const second = top3[1] || { userName: "N/A", accuracyScore: 0 };
  const third = top3[2] || { userName: "N/A", accuracyScore: 0 };

  const maxScore = Math.max(first.accuracyScore, second.accuracyScore, third.accuracyScore, 1);

  const scaleHeight = (score: number) => (score / maxScore) * 180;

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
      <View style={{ alignItems: "center", marginHorizontal: 10 }}>
        <FontAwesome6 name="medal" size={24} color="#C0C0C0" />
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 35, marginBottom: 4 }}>2</Text>
        <View
          style={{
            width: 80,
            height: scaleHeight(second.accuracyScore),
            borderRadius: 12,
            backgroundColor: "#8b5cf6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>
            {second.accuracyScore.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={{ alignItems: "center", marginHorizontal: 10 }}>
        <FontAwesome6 name="crown" size={30} color="#facc15" />
        <Text style={{ color: "#FFD700", fontWeight: "bold", fontSize: 50, marginBottom: 4 }}>1</Text>
        <View
          style={{
            width: 80,
            height: scaleHeight(first.accuracyScore),
            borderRadius: 12,
            backgroundColor: "#ec4899",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>
            {first.accuracyScore.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={{ alignItems: "center", marginHorizontal: 10 }}>
        <FontAwesome6 name="medal" size={24} color="#CD7F32" />
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 25, marginBottom: 4 }}>3</Text>
        <View
          style={{
            width: 80,
            height: scaleHeight(third.accuracyScore),
            borderRadius: 12,
            backgroundColor: "#3b82f6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>
            {third.accuracyScore.toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
}
