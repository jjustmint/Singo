// ---------------- SongChallenge.tsx ----------------
import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { getSong } from "@/api/song/getSong";
import { getAudioVerById } from "@/api/song/getAudioById";

interface WeeklySong {
  id: string;
  title: string;
  artist: string;
  image: string;
  keySignature: string;
}

interface Props {
  audioId: number;
}

export default function SongChallenge({ audioId }: Props) {
  const [weeklySong, setWeeklySong] = useState<WeeklySong | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklySong = async () => {
      try {
        setLoading(true);
        const audioData = await getAudioVerById(audioId);
        if (!audioData?.data?.song_id) {
          setWeeklySong(null);
          return;
        }

        const songData = await getSong(audioData.data.song_id);
        if (!songData?.data) {
          setWeeklySong(null);
          return;
        }

        setWeeklySong({
          id: String(songData.data.id || audioData.data.song_id),
          title: songData.data.title || "Unknown Title",
          artist: songData.data.singer || "Unknown Singer",
          image: songData.data.image || "https://via.placeholder.com/150", // fallback image
          keySignature: audioData.data.key_signature || "N/A",
        });
      } catch (err) {
        console.error("Failed to fetch weekly song:", err);
        setWeeklySong(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklySong();
  }, [audioId]);

  if (loading) {
    return <ActivityIndicator size="large" color="white" style={{ marginTop: 20 }} />;
  }

  if (!weeklySong) {
    return <Text style={{ color: "gray", marginTop: 20 }}>No weekly song available</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Image source={{ uri: weeklySong.image }} style={styles.image} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{weeklySong.title}</Text>
          <Text style={styles.artist}>{weeklySong.artist}</Text>
        </View>
        <Text style={styles.keyText}>{weeklySong.keySignature}</Text>
      </View>
    </ScrollView>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: "center",
  },
  card: {
    height: 100,
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  artist: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  keyText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
