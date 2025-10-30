import React from "react";
import { View, Text, Image, StyleSheet, FlatList } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import { resolveProfileImage } from "./ProfileInfo";

// ---------------- Types ----------------
interface User {
  recordId: string;
  userName: string;
  accuracyScore: number;
  profilePicture?: string;
}

interface WeeklyRankingProps {
  data: User[];
}

// ---------------- SongCard Component ----------------
interface SongCardProps {
  user: User;
  index: number;
}

const SongCard: React.FC<SongCardProps> = ({ user, index }) => {
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"]; // gold, silver, bronze
  const rankColor = rankColors[index] || "#fff";
  const rankSize = index < 3 ? 50 - index * 4 : 25;
  const accuracy = Number(user.accuracyScore ?? 0);
  const displayScore = isNaN(accuracy) ? "0.00" : accuracy.toFixed(2);
  const avatarUri =
    resolveProfileImage(user.profilePicture ?? null) ??
    "https://via.placeholder.com/96";

  return (
    <View style={styles.card}>
      <Text style={[styles.rank, { color: rankColor, fontSize: rankSize }]}>
        {index + 1}
      </Text>
      <Image source={{ uri: avatarUri }} style={styles.image} resizeMode="cover" />
      <View style={styles.textContainer}>
        <Text style={styles.Username} numberOfLines={1}>
          {user.userName}
        </Text>
        <Text style={styles.Score} numberOfLines={1}>
          {displayScore}%
        </Text>
      </View>
      <AntDesign name="right" size={30} color="white" style={styles.icon} />
    </View>
  );
};

// ---------------- WeeklyRanking Component ----------------
const WeeklyRanking: React.FC<WeeklyRankingProps> = ({ data }) => {
  return (
    <FlatList
      data={data.slice(0, 10)} // Top 10 users
      keyExtractor={(item) => item.recordId}
      renderItem={({ item, index }) => (
        <SongCard user={item} index={index} />
      )}
      contentContainerStyle={{ paddingBottom: 20 }}
      scrollEnabled={false}
      nestedScrollEnabled={true} // Allows it to scroll inside parent ScrollView
    />
  );
};

export default WeeklyRanking;

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
