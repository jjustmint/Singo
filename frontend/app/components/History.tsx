import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { HistoryType } from "../../../backend/src/types/getHistory";
import type { RootStackParamList } from "@/types/Navigation";
import { getAudioVerById } from "@/api/song/getAudioById";
import { getSong } from "@/api/song/getSong";
import { GlobalConstant } from "@/constant";

type HistoryNavigationProp = NativeStackNavigationProp<RootStackParamList, "Summary">;

type HistoryProps = {
  data?: HistoryType[];
  isLoading?: boolean;
};

type HistoryDetail = {
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
    return null;
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

const buildDetail = async (record: HistoryType): Promise<HistoryDetail> => {
  let title = `Recording #${record.record_id}`;
  let albumCover: string | null = null;
  let keyLabel = record.key ?? "Unknown key";
  let songId: number | null = null;

  try {
    if (record.version_id) {
      const audioRes = await getAudioVerById(record.version_id);
      if (audioRes.success && audioRes.data?.song_id) {
        songId = audioRes.data.song_id;
        const songRes = await getSong(audioRes.data.song_id);
        if (songRes.success && songRes.data) {
          const { title: songTitle, album_cover, key_signature } = songRes.data;
          title = songTitle || title;
          albumCover = resolveImage(album_cover);
          keyLabel = record.key ?? key_signature ?? keyLabel;
        }
      }
    }
  } catch (error) {
    console.error("Failed to enrich history detail:", error);
  }

  return {
    id: record.record_id.toString(),
    title,
    key: keyLabel || "Unknown key",
    albumCover: albumCover ?? "",
    dateLabel: formatDate(record.created_at),
    accuracyLabel: formatAccuracy(record.accuracy_score),
    recordId: record.record_id,
    score: typeof record.accuracy_score === "number" ? record.accuracy_score : 0,
    songId,
    versionId: record.version_id,
  };
};

const History: React.FC<HistoryProps> = ({ data = [], isLoading }) => {
  const navigation = useNavigation<HistoryNavigationProp>();
  const [visibleCount, setVisibleCount] = useState(10);
  const [detailsMap, setDetailsMap] = useState<Record<string, HistoryDetail>>({});
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setVisibleCount(10);
    setDetailsMap({});
  }, [data]);

  const recordings = useMemo(() => {
    if (data.length <= 1) {
      return [];
    }
    return data.slice(1, 1 + visibleCount);
  }, [data, visibleCount]);

  useEffect(() => {
    let isActive = true;

    const loadDetails = async () => {
      const missing = recordings.filter(
        (record) => !detailsMap[record.record_id.toString()]
      );

      if (!missing.length) {
        return;
      }

      setIsFetching(true);

      try {
        const results = await Promise.all(missing.map((item) => buildDetail(item)));

        if (!isActive) {
          return;
        }

        setDetailsMap((prev) => {
          const next = { ...prev };
          results.forEach((detail) => {
            next[detail.id] = detail;
          });
          return next;
        });
      } catch (error) {
        if (isActive) {
          console.error("Failed to load history details:", error);
        }
      } finally {
        if (isActive) {
          setIsFetching(false);
        }
      }
    };

    loadDetails();

    return () => {
      isActive = false;
    };
  }, [recordings, detailsMap]);

  const handleCardPress = (
    detail: HistoryDetail,
    record: HistoryType
  ) => {
    navigation.navigate("Summary", {
      score:
        typeof record.accuracy_score === "number"
          ? record.accuracy_score
          : detail.score,
      recordId: detail.recordId ?? record.record_id,
      song_id: detail.songId ?? 0,
      version_id: detail.versionId,
      localUri: null,
    });
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  const renderItem = ({ item }: { item: HistoryType }) => {
    const detail = detailsMap[item.record_id.toString()];

    if (!detail) {
      return (
        <View style={styles.skeletonItem}>
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonImage} />
            <LinearGradient
              colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0)"]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={styles.overlayShade}
            />
            <View style={styles.overlaySkeleton}>
              <View style={styles.skeletonLineLarge} />
              <View style={styles.skeletonLineMedium} />
              <View style={styles.skeletonLineSmall} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => handleCardPress(detail, item)}
        style={styles.card}
      >
        {detail.albumCover ? (
          <Image source={{ uri: detail.albumCover }} style={styles.image} />
        ) : (
          <View style={styles.coverFallback} />
        )}
        <LinearGradient
          colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0)"]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.overlayShade}
        />
        <View style={styles.overlay}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{detail.title}</Text>
            <Text style={styles.subtitle}>
              Key: {detail.key ?? item.key ?? "Unknown key"}
            </Text>
            <Text style={styles.meta}>
              {detail.dateLabel ?? formatDate(item.created_at)} • Accuracy {detail.accuracyLabel ?? formatAccuracy(item.accuracy_score)}
            </Text>
          </View>
          <View style={styles.iconWrapper}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalAvailable = Math.max(0, data.length - 1);
  const hasMore = recordings.length < totalAvailable;
  const showSkeleton = (isLoading || isFetching) && !recordings.length;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>History</Text>
      {showSkeleton ? (
        <View>
          {Array.from({ length: 3 }).map((_, index, array) => (
            <View
              key={index}
              style={[
                styles.skeletonItem,
                index !== array.length - 1 && styles.skeletonItemSpacing,
              ]}
            >
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonImage} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0)"]}
                  start={{ x: 0.5, y: 1 }}
                  end={{ x: 0.5, y: 0 }}
                  style={styles.overlayShade}
                />
                <View style={styles.overlaySkeleton}>
                  <View style={styles.skeletonLineLarge} />
                  <View style={styles.skeletonLineMedium} />
                  <View style={styles.skeletonLineSmall} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : recordings.length === 0 ? (
        <Text style={styles.emptyText}>No additional recordings yet.</Text>
      ) : (
        <FlatList
          data={recordings}
          renderItem={renderItem}
          keyExtractor={(item) => item.record_id.toString()}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            isFetching ? (
              <ActivityIndicator style={styles.loader} color="#5B5BF1" />
            ) : undefined
          }
          extraData={detailsMap}
        />
      )}
      {hasMore && !showSkeleton && (
        <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
          <Text style={styles.loadMoreText}>See More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 5,
    fontWeight: "bold",
  },
  card: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    height: 100,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlayShade: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 0,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
    justifyContent: "center",
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 6,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: "#ddd",
    fontSize: 14,
    marginTop: 4,
  },
  meta: {
    color: "#ddd",
    fontSize: 13,
    marginTop: 4,
  },
  emptyText: {
    color: "#bbb",
    fontSize: 16,
  },
  separator: {
    height: 18,
  },
  loader: {
    marginTop: 12,
  },
  loadMore: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#5B5BF1",
    borderRadius: 20,
  },
  loadMoreText: {
    color: "#fff",
    fontWeight: "bold",
  },
  skeletonItem: {
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonItemSpacing: {
    marginBottom: 18,
  },
  skeletonCard: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    height: 120,
    backgroundColor: "#1c1c1c",
  },
  skeletonImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1c1c1c",
  },
  overlaySkeleton: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
  },
  skeletonLineLarge: {
    width: "70%",
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2b2b2b",
  },
  skeletonLineMedium: {
    width: "55%",
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2b2b2b",
    marginTop: 10,
  },
  skeletonLineSmall: {
    width: "45%",
    height: 14,
    borderRadius: 8,
    backgroundColor: "#2b2b2b",
    marginTop: 8,
  },
  coverFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1c1c1c",
  },
});

export default History;
