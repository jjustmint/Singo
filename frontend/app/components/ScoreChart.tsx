import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { AntDesign } from "@expo/vector-icons";

interface Props {
  title: string;
  artist: string;
  image: string;
}

const Recent: React.FC<Props> = ({ title, artist, image }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent</Text>
      <View style={styles.card}>
        <Image source={{ uri: "https://i.ytimg.com/vi/eCZDaH0WvPU/maxresdefault.jpg" }} style={styles.image} />
        <View style={styles.overlay}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.artist}>{artist}</Text>
        </View>
      </View>
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
