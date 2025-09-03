import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

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
        duration: 210, // seconds
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
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null); // Countdown state

  const [animationValue] = useState(new Animated.Value(0)); // State for animation
  const [volume, setVolume] = useState(0); // State for volume

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

  // Ensure countdown triggers recording automatically and finish icon stops recording.
  useEffect(() => {
    if (!loading && countdown === null) {
        setCountdown(3); // Start countdown after loading
    }
}, [loading]);

useEffect(() => {
    if (countdown !== null) {
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev !== null && prev <= 1) {
                    clearInterval(interval);
                    if (prev === 1) {
                        startRecording(); // Automatically start recording when countdown ends
                    }
                    return null; // Stop the countdown
                }
                return prev! - 1;
            });
        }, 1000);

        return () => clearInterval(interval); // Cleanup interval on unmount
    }
}, [countdown]);

  // Updated the animation logic to make it loop in real-time while recording and stop when recording stops.
  const startAnimation = () => {
    console.log("Starting animation...");
    animationValue.setValue(0);
    Animated.loop(
        Animated.sequence([
            Animated.timing(animationValue, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(animationValue, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ])
    ).start();
};

const stopAnimation = () => {
    console.log("Stopping animation...");
    animationValue.stopAnimation(() => {
        console.log("Animation has been stopped successfully");
    });
};

useEffect(() => {
    if (recording) {
        console.log("Recording started, triggering animation");
        startAnimation();
    } else {
        console.log("Recording stopped, stopping animation");
        stopAnimation();
    }
}, [recording]);

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
          setVolume(status.volume); // Update volume
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

  const onSeek = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value * 1000);
    }
  };

  const startRecording = async () => {
    if (countdown === null) {
      try {
        console.log("Requesting microphone permissions...");
        await Audio.requestPermissionsAsync();
        console.log("Setting audio mode...");
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        console.log("Creating recording...");
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        console.log("Recording created successfully");
        setRecording(recording);
      } catch (err) {
        console.error("Failed to start recording", err);
      }
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordingUri(uri);
    setRecording(null);

    // Save the recording as a .wav file
    const wavFilePath = `${FileSystem.documentDirectory}recording.wav`;
    await FileSystem.copyAsync({ from: uri, to: wavFilePath });
    console.log(`Recording saved as .wav file at: ${wavFilePath}`);

    // Share the .wav file using expo-sharing
    if (await Sharing.isAvailableAsync()) {
        try {
            await Sharing.shareAsync(wavFilePath);
            console.log('Recording shared successfully');
        } catch (error) {
            console.error('Failed to share recording:', error);
        }
    } else {
        console.log('Sharing is not available on this device');
    }
};

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Animated bar styles
  const animatedBarStyle = {
    transform: [
      {
        scaleY: animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 3],
        }),
      },
    ],
  };

  // Render the MusicPlayer layout immediately with a loading indicator
  if (loading) {
    return (
      <ImageBackground
        source={{ uri: "https://via.placeholder.com/150" }} // Placeholder image
        style={styles.bgImage}
        resizeMode="cover"
        blurRadius={15}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={[styles.container, { justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#fff" />
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={{ uri: song.image }}
      style={styles.bgImage}
      resizeMode="cover"
      blurRadius={15}
    >
      {/* Overlay */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: song.image }} style={styles.albumArt} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.songTitle}>{song.title}</Text>
            <Text style={styles.artist}>{song.artist}</Text>
          </View>
        </View>

        {/* Lyrics */}
        <View style={styles.lyricsWrapper}>
          <ScrollView 
          contentContainerStyle={styles.lyricsContainer}
          showsVerticalScrollIndicator={false}
          >
            {song.lyrics.map((line: string, index: number) => (
              <Text key={index} style={styles.lyrics}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>

        {/* Slider */}
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

        {/* Controls */}
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
          >
            <Ionicons name="mic" size={36} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={stopRecording}>
            <MaterialIcons name="done" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Animated Visualization */}
        <View style={styles.animationContainer}>
          {[...Array(5)].map((_, index) => (
            <Animated.View
              key={index}
              style={[styles.animatedBar, animatedBarStyle]}
            />
          ))}
        </View>
      </SafeAreaView>

      {/* Render the countdown as an overlay on top of the MusicPlayer content */}
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  albumArt: {
    width: 80,
    height: 80,
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
  lyricsWrapper: {
    flex: 1,
    justifyContent: "center", // vertical center
    width: "90%",
    marginTop: 40,
  },
  lyricsContainer: {
    alignItems: "flex-start", // align text to right
    paddingHorizontal: 20,
  },
  lyrics: {
    color: "white",
    fontSize: 20,
    textAlign: "left", 
    lineHeight: 28,
    marginVertical: 4,
  },
  progressContainer: {
    width: "80%",
    marginTop: 30,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  time: {
    color: "white",
    fontSize: 12,
    marginTop: 6,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 30,
    alignItems: "center",
    marginBottom: 80,
  },
  micButton: {
    backgroundColor: "#6c5ce7",
    padding: 20,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  animationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  animatedBar: {
    width: 10,
    height: 20,
    backgroundColor: "#6c5ce7",
    marginHorizontal: 5,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  countdownText: {
    fontSize: 100,
    color: "white",
    fontWeight: "bold",
  },
});
