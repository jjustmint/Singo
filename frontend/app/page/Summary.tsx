// app/screens/Summary.tsx
import React, { useEffect, useState, useMemo } from "react";
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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "../Types/Navigation";
import { getMistakes } from "@/api/getMistakes";
import { getSong } from "@/api/song/getSong";
import { SongType as ApiSongType } from "@/api/types/song"; // API version

// ------------------- APP TYPES -------------------
export type SongType = {
  id: string;
  songName: string;
  artist: string;
  image: string;
};

type Issue = {
  at: number;
  label: string;
};

// ------------------- MAPPER -------------------
function mapApiSongToAppSong(song: ApiSongType): SongType {
  return {
    id: song.song_id.toString(),
    songName: song.title,
    artist: song.singer,
    image: song.album_cover ?? "https://placehold.co/300x300",
  };
}

// ------------------- SUMMARY SCREEN -------------------
type SummaryRouteProp = RouteProp<RootStackParamList, "Summary">;

export default function SummaryScreen() {
  const route = useRoute<SummaryRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const { score, recordId, song_id } = route.params;

  const [track, setTrack] = useState<SongType | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const DEFAULT_ISSUES: Issue[] = [
    { at: 5, label: "Duration : Too slow" },
    { at: 30, label: "Off Key : Too high" },
  ];

  const theTrack = track ?? {
    id: "0",
    songName: "Unknown Song",
    artist: "Unknown Artist",
    image: "https://placehold.co/300x300",
  };
  const theIssues = issues.length > 0 ? issues : DEFAULT_ISSUES;
  const theScore = typeof score === "number" ? score : 0;

  const posLabel = useMemo(() => formatTime(position), [position]);

  // ------------------- FETCH SONG -------------------
  useEffect(() => {
    const fetchSong = async () => {
      try {
        if (!song_id) return;

        const res = await getSong(song_id);
        if (res.success && res.data) {
          const mapped = mapApiSongToAppSong(res.data);
          setTrack(mapped);
        }
      } catch (err) {
        console.error("Error fetching song:", err);
      }
    };
    fetchSong();
  }, [song_id]);

  // ------------------- FETCH MISTAKES -------------------
  useEffect(() => {
    const fetchMistakes = async () => {
      if (!recordId) return;
      try {
        const res = await getMistakes(recordId);
        if (res.success && res.data.length > 0) {
          const mappedIssues = res.data.map(mistakeToIssue);
          setIssues(mappedIssues);
        } else {
          setIssues(DEFAULT_ISSUES);
        }
      } catch (err) {
        console.error("Error fetching mistakes:", err);
        setIssues(DEFAULT_ISSUES);
      }
    };
    fetchMistakes();
  }, [recordId]);

  // ------------------- RENDER -------------------
  return (
    <LinearGradient colors={["#8C5BFF", "#120a1a"]} style={{ flex: 1 }}>
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
          {/* Top card */}
          <View style={styles.topRow}>
            <Image source={{ uri: theTrack.image }} style={styles.art} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.title}>{theTrack.songName}</Text>
              <Text style={styles.artist}>{theTrack.artist}</Text>
            </View>
            <Text style={styles.scoreText}>{theScore}%</Text>
          </View>

          {/* Slider */}
          <View style={{ marginTop: 18, paddingHorizontal: 22 }}>
            <Slider
              minimumValue={0}
              maximumValue={120} // placeholder duration
              value={position}
              onValueChange={setPosition}
              minimumTrackTintColor="#ff82c6"
              maximumTrackTintColor="#ffffff66"
              thumbTintColor="#ff7abf"
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{posLabel}</Text>
              <Text style={styles.timeLabel}>2:00</Text>
            </View>
          </View>

          {/* Missing Part */}
          <Text style={styles.sectionTitle}>Mistakes</Text>
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

// ------------------- HELPERS -------------------
function mistakeToIssue(m: any): Issue {
  const at = Math.max(0, m.start_time ?? 0);
  let label = "";

  switch (m.reason) {
    case "missing":
      label = `Missing part (${formatSeconds(m.duration)})`;
      break;
    case "off-key":
      label = `Off-key issue`;
      break;
    default:
      label = m.reason ?? "Unknown issue";
  }

  return { at, label };
}

function formatTime(sec: number) {
  const mm = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function formatSeconds(sec?: number) {
  if (!sec || sec <= 0) return "0s";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m${s ? ` ${s}s` : ""}`;
}

// ------------------- STYLES -------------------
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  artist: { color: "#ffffffcc", fontSize: 12, marginTop: 2 },
  scoreText: { color: "#fff", fontSize: 28, fontWeight: "800", marginLeft: 8 },
  timeRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeLabel: { color: "#ffffffcc", fontSize: 12, fontWeight: "600" },
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
  },
  issueTime: { width: 60, color: "#111", fontWeight: "800", fontSize: 14 },
  issueText: { color: "#111", fontSize: 14, fontWeight: "600" },
});
