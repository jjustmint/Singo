import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { HistoryType } from "../../../backend/src/types/getHistory";
import type { RootStackParamList } from "../Types/Navigation";
import { getAudioVerById } from "@/api/song/getAudioById";
import { getSong } from "@/api/song/getSong";
import { GlobalConstant } from "@/constant";
import { LinearGradient } from "expo-linear-gradient";

type RecentNavigationProp = NativeStackNavigationProp<RootStackParamList, "Summary">;

type RecentProps = {
  data?: HistoryType[];
  isLoading?: boolean;
};

const PLACEHOLDER_IMAGE =
  "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png";

type RecentDetail = {
  id: string;
  title: string;
  key: string;
  albumCover: string;
  dateLabel: string;
  accuracyLabel: string;
  recordId: number;
  score: number;
  songId?: number | null;
  versionId?: number | null;
};

const formatDate = (value?: string | Date | null) => {
  if (!value) {
    return "Unknown date";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString();
};

const formatAccuracy = (value?: number | null) => {
  if (value == null) {
    return "N/A";
  }
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
};

const resolveImage = (path?: string | null) => {
  if (!path) {
    return PLACEHOLDER_IMAGE;
  }

  const normalised = path.replace(/\\/g, "/");

  if (normalised.startsWith("http://") || normalised.startsWith("https://")) {
    return normalised;
  }

  const trimmed = normalised.replace(/^\/+/, "");
  const withoutDataPrefix = trimmed.startsWith("data/")
    ? trimmed.replace(/^data\//, "")
    : trimmed;

  return `${GlobalConstant.API_URL}/${withoutDataPrefix}`;
};

const Recent: React.FC<RecentProps> = ({ data = [], isLoading }) => {
  const navigation = useNavigation<RecentNavigationProp>();
  const [recentDetail, setRecentDetail] = useState<RecentDetail | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const handleCardPress = () => {
    if (!recentDetail) return;
    navigation.navigate("Summary", {
      score: recentDetail.score,
      recordId: recentDetail.recordId,
      song_id: recentDetail.songId ?? 0,
      version_id: recentDetail.versionId,
      localUri: null,
    });
  };

  useEffect(() => {
    let isActive = true;

    const loadRecent = async () => {
      if (!data.length) {
        if (isActive) {
          setRecentDetail(null);
          setIsFetching(false);
        }
        return;
      }

      setIsFetching(true);

      const latest = data[0];
      let title = `Recording #${latest.record_id}`;
      let albumCover = PLACEHOLDER_IMAGE;
      let keyLabel = latest.key ?? "Unknown key";
      let songId: number | null = null;
      const versionId = latest.version_id;

      try {
        if (latest.version_id) {
          const audioRes = await getAudioVerById(latest.version_id);
          if (audioRes.success && audioRes.data?.song_id) {
            songId = audioRes.data.song_id;
            const songRes = await getSong(audioRes.data.song_id);
            if (songRes.success && songRes.data) {
              const { title: songTitle, album_cover, key_signature } = songRes.data;
              title = songTitle || title;
              albumCover = resolveImage(album_cover);
              keyLabel = latest.key ?? key_signature ?? keyLabel;
            }
          }
        }
      } catch (error) {
        console.error("Failed to load recent recording details:", error);
      } finally {
        if (isActive) {
          setRecentDetail({
            id: latest.record_id.toString(),
            title,
            key: keyLabel || "Unknown key",
            albumCover,
            dateLabel: formatDate(latest.created_at),
            accuracyLabel: formatAccuracy(latest.accuracy_score),
            recordId: latest.record_id,
            score:
              typeof latest.accuracy_score === "number"
                ? latest.accuracy_score
                : 0,
            songId,
            versionId,
          });
          setIsFetching(false);
        }
      }
    };

    loadRecent();

    return () => {
      isActive = false;
    };
  }, [data]);

  const showSkeleton = isLoading || isFetching;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent</Text>
      {showSkeleton ? (
        <View style={[styles.card, styles.skeletonCard]}>
          <View style={styles.skeletonImage} />
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0)"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.overlayShade}
          />
          <View style={styles.overlay}>
            <View style={styles.skeletonLineLarge} />
            <View style={styles.skeletonLineSmall} />
            <View style={styles.skeletonLineSmall} />
          </View>
        </View>
      ) : !recentDetail ? (
        <Text style={styles.emptyText}>No recordings yet. Start singing!</Text>
      ) : (
        <TouchableOpacity
          key={recentDetail.id}
          onPress={() => handleCardPress()}
          style={styles.card}
        >
          <Image source={{ uri: recentDetail.albumCover }} style={styles.image} />
          <LinearGradient
            colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0)"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.overlayShade}
          />
          <View style={styles.overlay}>
            <Text style={styles.title}>{recentDetail.title}</Text>
            <Text style={styles.subtitle}>Key: {recentDetail.key}</Text>
            <Text style={styles.meta}>
              {recentDetail.dateLabel} • Accuracy {recentDetail.accuracyLabel}
            </Text>
          </View>
        </TouchableOpacity>
      )}
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
    borderRadius: 12,
    overflow: "hidden",
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
  overlayShade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#ddd",
    fontSize: 18,
    fontWeight: "600",
  },
  meta: {
    color: "#ddd",
    fontSize: 16,
    marginTop: 6,
  },
  emptyText: {
    color: "#bbb",
    fontSize: 16,
  },
  skeletonCard: {
    backgroundColor: "#1c1c1c",
    height: 188,
  },
  skeletonImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1c1c1c",
  },
  skeletonLineLarge: {
    width: "70%",
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2b2b2b",
    marginBottom: 12,
  },
  skeletonLineSmall: {
    width: "50%",
    height: 16,
    borderRadius: 10,
    backgroundColor: "#2b2b2b",
    marginTop: 6,
  },
});

export default Recent;
