import React, { useState, useEffect, useRef, useCallback } from "react";
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
  LayoutChangeEvent,
  Animated,
} from "react-native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import Slider from "@react-native-community/slider";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
//import * as FileSystem from "expo-file-system";
import { File, Paths } from "expo-file-system";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { RootStackParamList } from "../Types/Navigation";
import { StackNavigationProp } from "@react-navigation/stack";
import { getSong } from "@/api/song/getSong";
import { createRecord } from "@/api/createRecord";
import { getAudioVerById } from "@/api/song/getAudioById";
import { getLyrics } from "@/api/song/getLyrics";
import { GlobalConstant } from "@/constant";
import { LyricLineType } from "@/api/types/lyrics";

type MusicPlayerRouteProp = RouteProp<RootStackParamList, "MusicPlayer">;
type MusicPlayerNavProp = StackNavigationProp<
  RootStackParamList,
  "MusicPlayer"
>;

const FALLBACK_LYRIC_GAP_MS = 4000;
const ESTIMATED_LYRIC_ROW_HEIGHT = 36;
const HIGHLIGHT_ANIMATION_DURATION = 220;

const buildFallbackLyrics = (
  songId: number,
  fallbackRaw?: string | null
): LyricLineType[] => {
  if (fallbackRaw && fallbackRaw.trim().length > 0) {
    return fallbackRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, index) => ({
        lyric_id: -(index + 1),
        song_id: songId,
        lyric: line,
        timestart: index * FALLBACK_LYRIC_GAP_MS,
      }));
  }
  return [];
};

const MusicPlayer: React.FC = () => {
  const route = useRoute<MusicPlayerRouteProp>();
  const navigation = useNavigation<MusicPlayerNavProp>();

  const { songKey } = route.params;

  const [loading, setLoading] = useState(true);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null); // Countdown state

  const [animationValue] = useState(new Animated.Value(0)); // State for animation

  const songName = songKey.song_id;
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [lyrics, setLyrics] = useState<LyricLineType[]>(() =>
    buildFallbackLyrics(songKey.song_id)
  );
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [lyricsContainerHeight, setLyricsContainerHeight] = useState(0);
  const lyricsScrollRef = useRef<ScrollView | null>(null);
  const lyricHeightsRef = useRef<Record<number, number>>({});
  const lyricAnimationsRef = useRef<Record<number, Animated.Value>>({});
  const previousHighlightRef = useRef(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [singer, setSinger] = useState<string | undefined>(undefined);

  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const stopAndUnloadCurrentSound = useCallback(async () => {
    const currentSound = soundRef.current;
    if (!currentSound) {
      return;
    }

    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await currentSound.stopAsync();
        }
        await currentSound.unloadAsync();
      }
    } catch (err) {
      console.error("Error managing sound instance:", err);
    } finally {
      soundRef.current = null;
      setSound(null);
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  const stopActiveRecording = useCallback(async () => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) {
      return;
    }

    try {
      const status = await currentRecording.getStatusAsync();
      if (status.canRecord || status.isRecording) {
        await currentRecording.stopAndUnloadAsync();
      } else if (!status.isDoneRecording) {
        await currentRecording.stopAndUnloadAsync();
      }
    } catch (err) {
      console.error("Error managing recording instance:", err);
    } finally {
      recordingRef.current = null;
      setRecording(null);
      setRecordingUri(null);
    }
  }, []);

  const cleanupAudioResources = useCallback(async () => {
    await stopAndUnloadCurrentSound();
    await stopActiveRecording();
  }, [stopAndUnloadCurrentSound, stopActiveRecording]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        cleanupAudioResources().catch(() => {
          /* noop */
        });
      };
    }, [cleanupAudioResources])
  );

  useEffect(() => {
    return () => {
      cleanupAudioResources().catch(() => {
        /* noop */
      });
    };
  }, [cleanupAudioResources]);

  const getAudioById = async () => {
    try {
      await stopAndUnloadCurrentSound();
      const response = await getAudioVerById(songKey.version_id);
      console.log("GETAUDIOVERBYID", response.data);
      const audioUri = `${GlobalConstant.API_URL}/${response.data.instru_path}`;
      console.log("Audio URI:", audioUri);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }
      );
      soundRef.current = newSound;
      setSound(newSound);

      const st = await newSound.getStatusAsync();
      if (st.isLoaded && typeof st.durationMillis === "number") {
        setDuration(st.durationMillis / 1000); // keep seconds in state
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;

        if (typeof status.positionMillis === "number") {
          setPosition(status.positionMillis / 1000);
        }
        if (typeof status.durationMillis === "number") {
          setDuration(status.durationMillis / 1000);
        }
        setIsPlaying(status.isPlaying === true);

        if (status.didJustFinish) {
          setIsPlaying(false);
          setPosition(0);
        }
      });
    } catch (e) {
      console.error("Error fetching audio by ID:", e);
    }
  };

  const handleFetchLyrics = async (
    song_id: number,
    fallbackRaw?: string | null
  ) => {
    try {
      const response = await getLyrics(song_id);
      if (
        response.success &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        const sortedLyrics = [...response.data].sort(
          (a, b) => a.timestart - b.timestart
        );
        setLyrics(sortedLyrics);
        return sortedLyrics;
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
    }

    const fallbackLyrics = buildFallbackLyrics(song_id, fallbackRaw);
    setLyrics(fallbackLyrics);
    return fallbackLyrics;
  };

  useEffect(() => {
    getAudioById();
  }, []);

  const playInstrumental = async () => {
    try {
      const currentSound = soundRef.current;
      if (!currentSound) {
        console.error("Sound is not loaded");
        return;
      }
      // await Audio.setAudioModeAsync({
      //   allowsRecordingIOS: false,
      //   playsInSilentModeIOS: true,
      //   staysActiveInBackground: true,
      //   interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      //   interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      //   shouldDuckAndroid: false,
      //   playThroughEarpieceAndroid: false,
      // });
      await currentSound.playAsync();
    } catch (error) {
      console.error("Error playing instrumental:", error);
    }
  };

  useEffect(() => {
    (async () => {
      await handleGetSongById(songKey.song_id);
      // setSong(data);
      // setDuration(data.duration);
      setLoading(false);
    })();

    return () => {
      cleanupAudioResources();
    };
  }, [cleanupAudioResources]);

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

  useEffect(() => {
    lyricHeightsRef.current = {};
    lyricAnimationsRef.current = {};
    previousHighlightRef.current = -1;
    setHighlightIndex(-1);
    setTimeout(() => {
      lyricsScrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    }, 0);
  }, [lyrics]);

  useEffect(() => {
    if (!lyrics.length) {
      setHighlightIndex(-1);
      return;
    }
    const currentMillis = position * 1000;
    let currentIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentMillis >= lyrics[i].timestart) {
        currentIndex = i;
      } else {
        break;
      }
    }

    if (currentIndex !== highlightIndex) {
      setHighlightIndex(currentIndex);
    }
  }, [position, lyrics, highlightIndex]);

  const handleLyricsLayout = useCallback((event: LayoutChangeEvent) => {
    setLyricsContainerHeight(event.nativeEvent.layout.height);
  }, []);

  const getScrollOffsetForIndex = useCallback(
    (index: number) => {
      if (index < 0) {
        return 0;
      }

      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += lyricHeightsRef.current[i] ?? ESTIMATED_LYRIC_ROW_HEIGHT;
      }

      const lineHeight =
        lyricHeightsRef.current[index] ?? ESTIMATED_LYRIC_ROW_HEIGHT;
      const centerOffset = Math.max(
        lyricsContainerHeight / 2 - lineHeight / 2,
        0
      );

      return Math.max(offset - centerOffset, 0);
    },
    [lyricsContainerHeight]
  );

  const scrollToHighlight = useCallback(
    (index: number, animated = true) => {
      if (
        index < 0 ||
        !lyricsScrollRef.current ||
        lyricsContainerHeight <= 0
      ) {
        return;
      }

      const scrollOffset = getScrollOffsetForIndex(index);

      requestAnimationFrame(() => {
        lyricsScrollRef.current?.scrollTo({
          y: scrollOffset,
          animated,
        });
      });
    },
    [getScrollOffsetForIndex, lyricsContainerHeight]
  );

  const ensureLineAnimation = useCallback(
    (index: number) => {
      if (!lyricAnimationsRef.current[index]) {
        lyricAnimationsRef.current[index] = new Animated.Value(
          index === highlightIndex ? 1 : 0
        );
      }
      return lyricAnimationsRef.current[index];
    },
    [highlightIndex]
  );

  const animateLyric = useCallback((index: number, toValue: number) => {
    const animation = lyricAnimationsRef.current[index];
    if (!animation) return;
    Animated.timing(animation, {
      toValue,
      duration: HIGHLIGHT_ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    scrollToHighlight(highlightIndex);
  }, [highlightIndex, scrollToHighlight]);

  useEffect(() => {
    if (highlightIndex >= 0) {
      scrollToHighlight(highlightIndex, false);
    }
  }, [lyricsContainerHeight, highlightIndex, scrollToHighlight]);

  useEffect(() => {
    const previousIndex = previousHighlightRef.current;
    if (previousIndex !== highlightIndex) {
      if (previousIndex >= 0) {
        animateLyric(previousIndex, 0);
      }
      if (highlightIndex >= 0) {
        ensureLineAnimation(highlightIndex);
        animateLyric(highlightIndex, 1);
      }
      previousHighlightRef.current = highlightIndex;
    }
  }, [highlightIndex, animateLyric, ensureLineAnimation]);

  const handleGetSongById = async (song_id: number) => {
    try {
      const response = await getSong(song_id);
      setTitle(response.data.title);
      setImage(response.data.album_cover || "");
      setSinger(response.data.singer);
      await handleFetchLyrics(song_id, response.data.lyrics);

      if (response.success) {
        console.log("Fetched song data:", response);
        return response.data;
      } else {
        console.error("Failed to fetch song:", response.message);
        return null;
      }
    } catch (error) {
      console.error("Error fetching song:", error);
      return null;
    }
  };
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

  const startRecording = async () => {
    try {
      console.log("Requesting microphone permissions...");
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.error("Microphone permissions not granted");
        return;
      }

      console.log("Setting audio mode...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      console.log("Playing instrumental...");
      await playInstrumental();

      console.log("Creating recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      console.log("Recording created successfully");
      recordingRef.current = recording;
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) {
      return;
    }

    try {
      const status = await currentRecording.getStatusAsync();
      if (status.canRecord || status.isRecording || !status.isDoneRecording) {
        await currentRecording.stopAndUnloadAsync();
      }
    } catch (err) {
      console.error("Failed to stop active recording", err);
    }

    const uri = currentRecording.getURI();
    setRecordingUri(uri);
    recordingRef.current = null;
    setRecording(null);

    await stopAndUnloadCurrentSound();

    console.log("Recording stopped and instrumental audio unloaded");

    try {
      if (!uri) {
        console.error("Recording URI is null, cannot save file.");
        return;
      }

      // ✅ SDK 54 File API
      const source = new File(uri);
      const target = new File(Paths.document, "recording.m4a");

      // optional: if you want to force-overwrite, delete old file first
      if (target.exists) {
        try {
          target.delete();
        } catch {}
      }

      source.copy(target); // <-- synchronous, no await
      console.log(`Recording saved as .m4a file at: ${target.uri}`);

      if (!songKey.ori_path) throw new Error("Original path is missing");

      setLoadingResult(true);
      const response = await createRecord(
        target.uri, // use the new file’s URI
        `${songKey.version_id}`,
        songKey.key_signature,
        songKey.ori_path
      );

      console.log("Record created successfully:", response);

      const responseData = typeof response.data === "number" ? response.data : JSON.parse(response.data);
      if (response.success && responseData?.score !== undefined) {
        navigation.navigate("Result", { score: responseData.score, song_id: responseData.song_id, recordId: responseData.record_id });
      } else {
        console.error("No score returned from backend:", response);
      }
    } catch (e) {
      console.error("Error creating record:", e);
    } finally {
      console.log("Stop recording process completed.");
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
      source={{
        uri: image
          ? `${GlobalConstant.API_URL}/${image}`
          : "https://via.placeholder.com/150",
      }}
      style={styles.bgImage}
      resizeMode="cover"
      blurRadius={15}
    >
      {/* Overlay */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: `${GlobalConstant.API_URL}/${image}` }}
            style={styles.albumArt}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.songTitle}>{title}</Text>
            <Text style={styles.artist}>{singer}</Text>
          </View>
        </View>

        {/* Lyrics */}
        <View style={styles.lyricsWrapper} onLayout={handleLyricsLayout}>
          {lyrics.length > 0 ? (
            <ScrollView
              ref={lyricsScrollRef}
              contentContainerStyle={styles.lyricsContainer}
              showsVerticalScrollIndicator={false}
            >
              {lyrics.map((line, index) => {
                const isActive = index === highlightIndex;
                const animation = ensureLineAnimation(index);
                const rowAnimatedStyle = {
                  backgroundColor: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,0.08)"],
                  }),
                  transform: [
                    {
                      scale: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                };

                const textAnimatedStyle = {
                  color: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["rgba(255,255,255,0.55)", "#ffffff"],
                  }),
                  fontSize: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 20],
                  }),
                  opacity: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.75, 1],
                  }),
                };

                return (
                  <Animated.View
                    key={`${line.lyric_id}-${index}`}
                    style={[styles.lyricRow, rowAnimatedStyle]}
                    onLayout={(event) => {
                      const { height } = event.nativeEvent.layout;
                      if (height > 0) {
                        const storedHeight = lyricHeightsRef.current[index];
                        if (!storedHeight || Math.abs(storedHeight - height) > 1) {
                          lyricHeightsRef.current[index] = height;
                          if (isActive) {
                            scrollToHighlight(index, false);
                          }
                        }
                      }
                    }}
                  >
                    <Animated.Text
                      style={[styles.lyrics, textAnimatedStyle]}
                      numberOfLines={2}
                    >
                      {line.lyric}
                    </Animated.Text>
                  </Animated.View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.noLyricsContainer}>
              <Text style={styles.noLyricsText}>
                Song is not supporting lyrics now
              </Text>
            </View>
          )}
        </View>

        {/* Slider */}
        <View style={styles.progressContainer}>
          <Slider
            style={{ flex: 1 }}
            minimumValue={0}
            maximumValue={duration}
            value={position}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#fff"
            disabled
          />
          <View style={styles.timeContainer}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <Text style={styles.time}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={36}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.micButton}>
            <Ionicons name="mic" size={50} color="white" />
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

      {/* Loading overlay for Result */}
      {loadingResult && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </ImageBackground>
  );
};
export default MusicPlayer;

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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  lyricRow: {
    width: "100%",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  lyrics: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 18,
    textAlign: "left",
    lineHeight: 28,
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
    backgroundColor: "rgba(107, 107, 107, 0.5)",
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
  noLyricsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  noLyricsText: {
    color: "#ffffff",
    fontSize: 18,
    textAlign: "center",
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
