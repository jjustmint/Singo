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

  const [songList, setSongList] = useState<SongKeyType[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
      setIsLockedWeekly(true);
      return;
    }

    // Normal case: fetch all keys
    const fetchKeys = async () => {
      try {
        const data = await getSongkey(numericSongId);
        const keySignatures = data.data.map((item) => item.key_signature);
        setKeys(keySignatures);
        setSongList(data.data);

        console.log("🎵 userKey:", userKey);
        console.log("🎵 Available keys:", keySignatures);

        if (userKey) {
          const normalizedUserKey = userKey.toLowerCase().trim();

          // Find best match
          let index = keySignatures.findIndex(
            (k) => k.toLowerCase().trim() === normalizedUserKey
          );

          // Try tonic match if no exact match
          if (index === -1) {
            const userTonic = normalizedUserKey.split(" ")[0]; // e.g. "g" from "g minor"
            index = keySignatures.findIndex((k) =>
              k.toLowerCase().includes(userTonic)
            );
          }

          console.log("🎯 Found index for userKey:", index);
          setCurrentIndex(index !== -1 ? index : 0);
        } else {
          setCurrentIndex(0);
        }
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
      navigation.navigate("MusicPlayer", { songKey: songList[currentIndex] });
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

        <Text style={styles.keyText}>{keys[currentIndex]}</Text>

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
          const userTonic = userKey?.split(" ")[0].toUpperCase();

          // Check if this is the original key
          const isOriginal =
            normalizedCurrent && normalizedOriginal
              ? normalizedCurrent === normalizedOriginal
              : false;

          // Determine the closest key to user's tonic
          let closestIndex = -1;
          if (userTonic && keys.length > 0) {
            const pitchOrder = [
              "C",
              "C#",
              "D",
              "D#",
              "E",
              "F",
              "F#",
              "G",
              "G#",
              "A",
              "A#",
              "B",
            ];
            let minDistance = 12;

            keys.forEach((key, idx) => {
              const keyTonic = key.split(" ")[0].toUpperCase();
              const userIdx = pitchOrder.indexOf(userTonic);
              const keyIdx = pitchOrder.indexOf(keyTonic);
              if (userIdx !== -1 && keyIdx !== -1) {
                const distance = Math.min(
                  Math.abs(userIdx - keyIdx),
                  12 - Math.abs(userIdx - keyIdx)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  closestIndex = idx;
                }
              }
            });
          }

          const isSuggested = closestIndex === currentIndex;

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
});
