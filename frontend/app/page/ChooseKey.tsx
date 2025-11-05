import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getSong } from "@/api/song/getSong";
import { getSongkey } from "@/api/getSongKey";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../Types/Navigation";
import { StackNavigationProp } from "@react-navigation/stack";
import { SongKeyType } from "../Types/SongKey";
import { buildAssetUri } from "../utils/assetUri";

const FALLBACK_COVER = "https://via.placeholder.com/600x600?text=No+Cover";

type ChooseKeyRouteProp = RouteProp<RootStackParamList, "ChooseKey">;
type ChooseKeyNavProp = StackNavigationProp<RootStackParamList, "ChooseKey">;

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const extractTonic = (value?: string | null): string | null => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const match = value.trim().match(/^([A-Ga-g])([#b♭]?)/);
  if (!match) {
    return null;
  }

  const letter = match[1].toUpperCase();
  let accidental = match[2] ?? "";
  if (accidental === "♭") {
    accidental = "b";
  }
  if (accidental === "#") {
    return `${letter}#`;
  }
  if (accidental === "b") {
    return `${letter}b`;
  }
  return letter;
};

const computeSuggestedIndex = (
  keySignatures: string[],
  userPreferredKey?: string | null
): number => {
  if (!Array.isArray(keySignatures) || keySignatures.length === 0) {
    return 0;
  }

  if (typeof userPreferredKey !== "string" || userPreferredKey.trim() === "") {
    return 0;
  }

  const normalizedPreferred = userPreferredKey.trim().toLowerCase();
  const exactMatchIndex = keySignatures.findIndex(
    (k) => (k ?? "").trim().toLowerCase() === normalizedPreferred
  );
  if (exactMatchIndex !== -1) {
    return exactMatchIndex;
  }

  const preferredTonic = extractTonic(userPreferredKey);
  if (!preferredTonic) {
    return 0;
  }

  const tonicMatchIndex = keySignatures.findIndex(
    (k) => extractTonic(k) === preferredTonic
  );
  if (tonicMatchIndex !== -1) {
    return tonicMatchIndex;
  }

  const preferredSemitone = NOTE_TO_SEMITONE[preferredTonic];
  if (preferredSemitone == null) {
    return 0;
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  keySignatures.forEach((signature, index) => {
    const candidateTonic = extractTonic(signature);
    if (!candidateTonic) {
      return;
    }
    const candidateSemitone = NOTE_TO_SEMITONE[candidateTonic];
    if (candidateSemitone == null) {
      return;
    }

    const rawDistance = Math.abs(preferredSemitone - candidateSemitone);
    const wrappedDistance = Math.min(rawDistance, 12 - rawDistance);

    if (wrappedDistance < bestDistance) {
      bestDistance = wrappedDistance;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const ChooseKey: React.FC = () => {
  const route = useRoute<ChooseKeyRouteProp>();
  const navigation = useNavigation<ChooseKeyNavProp>();

  const { song, selectedKey, versionId, userKey } = route.params;
  const songName = song.songName;
  const artist = song.artist;
  const song_id = song.id;
  const image = song.image;
  const numericSongId = Number.parseInt(song_id, 10);
  const originalKey = song.key_signature;

  const [vocalEnabled, setVocalEnabled] = useState(true);

  const [songList, setSongList] = useState<SongKeyType[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suggestedIndex, setSuggestedIndex] = useState(0);
  const [isLockedWeekly, setIsLockedWeekly] = useState(false);
  const [coverUri, setCoverUri] = useState<string>(
    buildAssetUri(image) ?? FALLBACK_COVER
  );

  // === Fetch keys and set initial index ===
  useEffect(() => {
    if (Number.isNaN(numericSongId)) {
      console.warn("Invalid song id:", song_id);
      return;
    }

    // Weekly challenge case
    if (selectedKey && versionId) {
      setKeys([selectedKey]);
      setSongList([
        {
          version_id: versionId,
          song_id: numericSongId,
          instru_path: "",
          ori_path: null,
          key_signature: selectedKey,
        },
      ]);
      setCurrentIndex(0);
      setSuggestedIndex(0);
      setIsLockedWeekly(true);
      return;
    }

    // Normal case: fetch all keys
    const fetchKeys = async () => {
      try {
        const data = await getSongkey(numericSongId);
        const keySignatures = data.data.map(
          (item) => item.key_signature ?? "Unknown"
        );
        setKeys(keySignatures);
        setSongList(data.data);

        console.log("🎵 userKey:", userKey);
        console.log("🎵 Available keys:", keySignatures);

        const recommendedIndex = computeSuggestedIndex(keySignatures, userKey);
        setSuggestedIndex(recommendedIndex);
        setCurrentIndex(recommendedIndex);
      } catch (error) {
        console.error("Error fetching keys:", error);
      }
    };

    fetchKeys();
  }, [numericSongId, selectedKey, versionId, userKey, song_id]);

  // === Fetch cover ===
  useEffect(() => {
    const resolvedCover = buildAssetUri(image) ?? FALLBACK_COVER;
    setCoverUri(resolvedCover);

    const fetchCover = async () => {
      try {
        const response = await getSong(numericSongId);
        if (response.success && response.data?.album_cover) {
          const apiCover = buildAssetUri(response.data.album_cover);
          if (apiCover) setCoverUri(apiCover);
        }
      } catch (error) {
        console.error("Error fetching song cover:", error);
      }
    };
    fetchCover();
  }, [image, numericSongId]);

  // === Navigation buttons ===
  const handleNext = () => {
    if (isLockedWeekly) return;
    if (currentIndex < keys.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (isLockedWeekly) return;
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleConfirm = () => {
    if (songList.length > 0) {
      navigation.navigate("MusicPlayer", {
        songKey: songList[currentIndex],
        vocalEnabled,
        isWeeklyChallenge: isLockedWeekly,
      });
    } else {
      console.error("No song selected");
    }
  };

  return (
    <ImageBackground source={{ uri: coverUri }} style={styles.bg}>
      <LinearGradient
        colors={["transparent", "transparent", "rgba(0,0,0,0.8)", "#000"]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradientOverlay}
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Feather name="arrow-left" size={28} color="white" />
      </TouchableOpacity>

      <View style={styles.songInfo}>
        <Text style={styles.title}>{songName ?? "No Title"}</Text>
        <View style={styles.artistRow}>
          <Feather name="user" size={16} color="white" />
          <Text style={styles.artist}>{artist ?? "Unknown Artist"}</Text>
        </View>
      </View>

      <View style={styles.keyContainer}>
        <TouchableOpacity
          onPress={handlePrev}
          disabled={isLockedWeekly}
          style={[
            styles.chevronButton,
            isLockedWeekly && styles.disabledChevron,
          ]}
        >
          <Feather name="chevron-left" size={40} color="white" />
        </TouchableOpacity>

        <Text style={styles.keyText}>
          {keys[currentIndex] ?? "No key available"}
        </Text>

        <TouchableOpacity
          onPress={handleNext}
          disabled={isLockedWeekly}
          style={[
            styles.chevronButton,
            isLockedWeekly && styles.disabledChevron,
          ]}
        >
          <Feather name="chevron-right" size={40} color="white" />
        </TouchableOpacity>
      </View>

      {/* === Key status text (Original, Recommended, Weekly, or both) === */}
      {isLockedWeekly ? (
        <Text style={styles.suggested}>Weekly challenge key</Text>
      ) : (
        (() => {
          const normalizedCurrent = keys[currentIndex]?.toUpperCase().trim();
          const normalizedOriginal = song.key_signature?.toUpperCase().trim();

          // Check if this is the original key
          const isOriginal =
            normalizedCurrent && normalizedOriginal
              ? normalizedCurrent === normalizedOriginal
              : false;

          const isSuggested =
            keys.length > 0 && currentIndex === suggestedIndex;

          // Decide what to display
          if (isOriginal && isSuggested)
            return <Text style={styles.suggested}>Original (Suggested)</Text>;
          if (isOriginal) return <Text style={styles.suggested}>Original</Text>;
          if (isSuggested)
            return <Text style={styles.suggested}>Suggested</Text>;
          return null;
        })()
      )}

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Feather name="check" size={32} color="#3A6DFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.vocalButton}
        onPress={() => setVocalEnabled(!vocalEnabled)}
      >
        <Feather
          name={vocalEnabled ? "mic" : "mic-off"}
          size={26}
          color="white"
        />
      </TouchableOpacity>
    </ImageBackground>
  );
};

export default ChooseKey;

const styles = StyleSheet.create({
  bg: { flex: 1, justifyContent: "flex-start" },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  backButton: { position: "absolute", top: 80, left: 20, zIndex: 2 },
  songInfo: { marginTop: 350, paddingHorizontal: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textTransform: "uppercase",
  },
  artistRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  artist: { fontSize: 16, color: "white" },
  keyContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  chevronButton: { padding: 10 },
  disabledChevron: { opacity: 0.4 },
  keyText: { fontSize: 50, color: "white", fontWeight: "bold" },
  suggested: {
    textAlign: "center",
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
  confirmButton: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "white",
    borderRadius: 50,
    padding: 20,
  },
  vocalButton: {
  position: "absolute",
  top: 80,
  right: 20,
  backgroundColor: "rgba(0,0,0,0.4)",
  borderRadius: 30,
  padding: 10,
  zIndex: 3,
},
});
