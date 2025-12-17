import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { getSong } from "@/api/song/getSong";
import { getAudioVerById } from "@/api/song/getAudioById";
import { RootStackParamList } from "@/types/Navigation";
import { SongType } from "@/types/Song";
import { previewBus } from "@/util/previewBus";
import { resolveProfileImage } from "./ProfileInfo";

interface WeeklySong {
  songId: number;
  versionId: number;
  title: string;
  singer: string;
  albumCover: string | null;
  keySignature: string;
}

interface Props {
  audioId?: number | null;
}

export default function SongChallenge({ audioId }: Props) {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, "ChooseKey">>();

  const [weeklySong, setWeeklySong] = useState<WeeklySong | null>(null);
  const [loading, setLoading] = useState(true);

  const buildCoverUri = useCallback((albumCover: string | null | undefined) => {
    const resolved = resolveProfileImage(albumCover ?? null);
    if (resolved) {
      return resolved;
    }
    return "https://via.placeholder.com/150";
  }, []);

  const handleNavigate = useCallback(() => {
    if (!weeklySong) return;

    const songPayload: SongType = {
      id: String(weeklySong.songId),
      image: weeklySong.albumCover ?? "",
      songName: weeklySong.title,
      artist: weeklySong.singer,
    };

    previewBus.emit({ source: "navigation" });
    navigation.push("ChooseKey", {
      song: songPayload,
      selectedKey: weeklySong.keySignature,
      versionId: weeklySong.versionId,
    });
  }, [navigation, weeklySong]);

  useEffect(() => {
    let isMounted = true;

    const fetchWeeklySong = async () => {
      try {
        if (isMounted) {
          setLoading(true);
        }

        if (!audioId || audioId <= 0) {
          if (isMounted) {
            setWeeklySong(null);
          }
          return;
        }

        const audioData = await getAudioVerById(audioId);
        if (!isMounted) return;

        if (!audioData?.data?.song_id) {
          if (isMounted) {
            setWeeklySong(null);
          }
          return;
        }

        const songData = await getSong(audioData.data.song_id);
        if (!isMounted) return;

        if (!songData?.data) {
          if (isMounted) {
            setWeeklySong(null);
          }
          return;
        }

        if (isMounted) {
          setWeeklySong({
            songId: audioData.data.song_id,
            versionId: audioId,
            title: songData.data.title || "Unknown Title",
            singer: songData.data.singer || "Unknown Singer",
            albumCover: songData.data.album_cover || null,
            keySignature: audioData.data.key_signature || "N/A",
          });
        }
      } catch (err) {
        console.error("Failed to fetch weekly song:", err);
        if (isMounted) {
          setWeeklySong(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWeeklySong();

    return () => {
      isMounted = false;
    };
  }, [audioId]);

  if (loading) {
    return <ActivityIndicator size="large" color="white" style={{ marginTop: 20 }} />;
  }

  if (!weeklySong) {
    return <Text style={{ color: "gray", marginTop: 20 }}>No weekly song available</Text>;
  }

  const coverUri = buildCoverUri(weeklySong.albumCover);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handleNavigate}>
        <Image source={{ uri: coverUri }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{weeklySong.title}</Text>
          <Text style={styles.artist}>{weeklySong.singer}</Text>
          <Text style={styles.subtitle}>
            Tap to start the challenge
          </Text>
        </View>
        <View style={styles.keyBadge}>
          <Text style={styles.keyLabel}>Key</Text>
          <Text style={styles.keyValue}>{weeklySong.keySignature}</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

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
    gap: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
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
  subtitle: {
    color: "#c1c1c1",
    fontSize: 12,
    marginTop: 4,
  },
  keyBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  keyLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  keyValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
