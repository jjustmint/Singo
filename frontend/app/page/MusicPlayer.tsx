import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

// --- Mock API call ---
const fetchSongData = async () => {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve({
        id: "1",
        image:
          "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg",
        title: "BIRDS OF THE FEATHER",
        artist: "Billie Eilish",
        duration: 210, // in seconds (3:30)
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        lyrics: [
          "I want you to stay",
          "'Til I'm in the grave",
          "'Til I rot away, dead and buried",
          "'Til I'm in the casket you carry",
          "If you go, I'm goin' too, uh",
          "'Cause it was always you",
          "(Alright)",
          "And if I'm turnin' blue, please",
          "don't save me",
          "Nothin' left to lose without",
          "my baby",
        ],
      });
    }, 800)
  );
};

export default function MusicPlayer() {
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data: any = await fetchSongData();
      setSong(data);
      setDuration(data.duration);
      setLoading(false);
    })();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // --- Play / Pause Function ---
  const togglePlay = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis / 1000);
          setDuration(status.durationMillis / 1000);
          setIsPlaying(status.isPlaying);
        }
      });
    } else {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    }
  };

  // --- Seek with Slider ---
  const onSeek = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value * 1000); // sec → ms
    }
  };

  // --- Recording Logic ---
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordingUri(uri);
    setRecording(null);
  };

  // --- Format Time Helper ---
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="white" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Album & Song Info */}
      <View style={styles.header}>
        <Image source={{ uri: song.image }} style={styles.albumArt} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <Text style={styles.artist}>{song.artist}</Text>
        </View>
      </View>

      {/* Lyrics */}
      <View style={styles.lyricsContainer}>
        {song.lyrics.map((line: string, index: number) => (
          <Text key={index} style={styles.lyrics}>
            {line}
          </Text>
        ))}
      </View>

      {/* Progress Bar with Slider */}
      <View style={styles.progressContainer}>
        <Slider
          style={{ flex: 1 }}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingComplete={onSeek}
          minimumTrackTintColor="#fff"
          maximumTrackTintColor="#ccc"
          thumbTintColor="#fff"
        />
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={togglePlay}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={36}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.micButton}
          onPress={recording ? stopRecording : startRecording}
        >
          <Ionicons name="mic" size={36} color="white" />
        </TouchableOpacity>

        <MaterialIcons name="done" size={28} color="white" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8a2be2", // replace with expo-linear-gradient if needed
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  albumArt: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  artist: {
    fontSize: 14,
    color: "#ddd",
  },
  lyricsContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  lyrics: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  progressContainer: {
    width: "100%",
    marginTop: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    color: "white",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "70%",
    marginTop: 40,
    alignItems: "center",
  },
  micButton: {
    backgroundColor: "#6c5ce7",
    padding: 20,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
});

