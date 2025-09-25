// app/screens/Summary.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getMistakes } from "@/api/getMistakes";

type Issue = {
  /** seconds from start of track */
  at: number;
  /** e.g., "Duration : Too slow" */
  label: string;
};

type Track = {
  title: string;
  artist: string;
  image: string;
  /** seconds */
  durationSec: number;
};

type RouteParams = {
  track?: Track;
  score?: number; 
  issues?: Issue[];
};

const DEFAULT_TRACK: Track = {
  title: "Snacks & Wine",
  artist: "WIM",
  image:
    "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg",
  durationSec: 210, // 3:30
};

const DEFAULT_ISSUES: Issue[] = [
  { at: 5, label: "Duration : Too slow" },
  { at: 30, label: "Off Key : Too high" },
  { at: 40, label: "Off Key : Too high" },
  { at: 45, label: "Duration : Too slow" },
  { at: 59, label: "Off Key : Too high" },
  { at: 100, label: "Off Key : Too low" }, // 1:40
  { at: 115, label: "Off Key : Too high" }, // 1:55
  { at: 122, label: "Off Key : Too low" },  // 2:02
];

export default function Summary() {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const { track, score, issues }: RouteParams = route.params || {};

  const theTrack = track ?? DEFAULT_TRACK;
  const theIssues = issues ?? DEFAULT_ISSUES;
  const theScore = typeof score === "number" ? score : 80;

  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const posLabel = useMemo(() => formatTime(position), [position]);
  const durLabel = useMemo(
    () => formatTime(theTrack.durationSec),
    [theTrack.durationSec]
  );

  useEffect(() => {
  }, []);

  const fetchMistakes = async () => { 
    try {
      const response = await getMistakes(1);
      console.log("Fetched mistakes:", response);
    } catch (error) {
      console.error("Error fetching mistakes:", error);
    }}

  return (
    <LinearGradient
      colors={["#8C5BFF", "#8C5BFF", "#120a1a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.5 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack?.()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top card: artwork + title + score */}
          <View style={styles.topRow}>
            <Image source={{ uri: theTrack.image }} style={styles.art} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.title}>{theTrack.title}</Text>
              <Text style={styles.artist}>{theTrack.artist}</Text>
            </View>
            <Text style={styles.scoreText}>{theScore}%</Text>
          </View>

          {/* Slider */}
          <View style={{ marginTop: 18, paddingHorizontal: 22 }}>
            <Slider
              minimumValue={0}
              maximumValue={theTrack.durationSec}
              value={position}
              onValueChange={setPosition}
              minimumTrackTintColor="#ff82c6"
              maximumTrackTintColor="#ffffff66"
              thumbTintColor="#ff7abf"
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{posLabel}</Text>
              <Text style={styles.timeLabel}>{durLabel}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <RoundIcon
              name="play-skip-back"
              onPress={() => setPosition((p) => Math.max(0, p - 10))}
            />
            <RoundIcon
              big
              name={isPlaying ? "pause" : "play"}
              onPress={() => setIsPlaying((s) => !s)}
            />
            <RoundIcon
              name="play-skip-forward"
              onPress={() =>
                setPosition((p) => Math.min(theTrack.durationSec, p + 10))
              }
            />
          </View>

          {/* Missing Part */}
          <Text style={styles.sectionTitle}>Missing part</Text>

          <View style={styles.issueFrame}>
            {theIssues.map((it, idx) => (
              <TouchableOpacity
                key={`${it.at}-${idx}`}
                activeOpacity={0.8}
                style={styles.issueItem}
                onPress={() => setPosition(it.at)}
              >
                <Text style={styles.issueTime}>{formatTime(it.at)}</Text>
                <Text style={styles.issueText}>{it.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/** Helpers & small components */
function formatTime(totalSec: number) {
  const mm = Math.floor(totalSec / 60);
  const ss = Math.floor(totalSec % 60);
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function RoundIcon({
  name,
  onPress,
  big = false,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  big?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.iconWrap, big && styles.iconWrapBig]}
    >
      <Ionicons name={name} size={big ? 26 : 22} color="#fff" />
    </TouchableOpacity>
  );
}

/** Styles */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  topRow: {
    marginTop: 8,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  art: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#ffffff22",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  artist: {
    color: "#ffffffcc",
    fontSize: 12,
    marginTop: 2,
  },
  scoreText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginLeft: 8,
  },

  timeRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeLabel: {
    color: "#ffffffcc",
    fontSize: 12,
    fontWeight: "600",
  },

  controlsRow: {
    paddingHorizontal: 22,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  sectionTitle: {
    marginTop: 24,
    paddingHorizontal: 22,
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },

  issueFrame: {
    marginTop: 12,
    marginHorizontal: 18,
    padding: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  issueItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  issueTime: {
    width: 60,
    color: "#111",
    fontWeight: "800",
    fontSize: 14,
  },
  issueText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "600",
  },
});
