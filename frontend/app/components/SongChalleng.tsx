import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const challenges = [
  {
    id: "1",
    title: "Love Story",
    artist: "Taylor Swift",
    image:
      "https://cdn-images.dzcdn.net/images/cover/cce4e99be496acc9dc2e4365c5b288fc/1900x1900-000000-80-0-0.jpg",
    keySignature:"D", 
  },
  {
    id: "2",
    title: "Rap God",
    artist: "Eminem",
    image:
      "https://cdn-images.dzcdn.net/images/cover/cce4e99be496acc9dc2e4365c5b288fc/1900x1900-000000-80-0-0.jpg",
    keySignature: "B♭", 
  },
];

export default function SongChallenge() {
  return (
    <View style={styles.container}>
      {challenges.map((item) => (
        <View key={item.id} style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.artist}>{item.artist}</Text>
          </View>
          <Text style={styles.keyText}>{item.keySignature}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center", 
    alignItems: "center", 
  },
  card: {
    height: 80,
    width: "85%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 10,
    position: "relative",
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  artist: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  keyText: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
    marginRight:30,
  },
});
