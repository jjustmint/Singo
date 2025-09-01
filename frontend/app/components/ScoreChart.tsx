import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

export default function ScoreChart() {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        marginTop: 10,
      }}
    >
      {/* 2nd place */}
      <View style={{ alignItems: "center", marginHorizontal: 10 }}>
        <FontAwesome6 name="medal" size={24} color="#C0C0C0" />
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 35, marginBottom: 4 }}>
          2
        </Text>
        <View
          style={{
            width: 80,
            height: 140,
            borderRadius: 12,
            backgroundColor: "#8b5cf6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>420</Text>
        </View>
      </View>

      {/* 1st place */}
      <View style={{ alignItems: "center", marginHorizontal: 10 }}>
      <FontAwesome6 name="crown" size={30} color="#facc15" />
        <Text style={{ color: "#FFD700", fontWeight: "bold", fontSize: 50, marginBottom: 4 }}>
          1
        </Text>
        <View
          style={{
            width: 80,
            height: 180,
            borderRadius: 12,
            backgroundColor: "#ec4899",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>500</Text>
        </View>
      </View>

      {/* 3rd place */}
      <View style={{ alignItems: "center", marginHorizontal: 10 }}>
      <FontAwesome6 name="medal" size={24} color="#CD7F32" />
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 25, marginBottom: 4 }}>
          3
        </Text>
        <View
          style={{
            width: 80,
            height: 100,
            borderRadius: 12,
            backgroundColor: "#3b82f6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>350</Text>
        </View>
      </View>
    </View>
  );
}
