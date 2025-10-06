import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface HistoryItem {
  id: string;
  title: string;
  artist: string;
  image: string;
}

const Recent: React.FC<{ data?: HistoryItem[] }> = ({ data = [] }) => {
  const navigation = useNavigation();

  const handleCardPress = () => {
    navigation.navigate("Summary"); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent</Text>
      {data.map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => handleCardPress()}
          style={styles.card}
        >
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={styles.overlay}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.artist}>{item.artist}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  header: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 188,
    borderRadius: 12,
  },
  overlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  artist: {
    color: "#ddd",
    fontSize: 24,
  },
  actions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 16,
  },
});

export default Recent;
