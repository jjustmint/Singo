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
import { LyricLineType } from "@/api/types/lyrics";
import { buildAssetUri } from "../utils/assetUri";

type MusicPlayerRouteProp = RouteProp<RootStackParamList, "MusicPlayer">;
type MusicPlayerNavProp = StackNavigationProp<
  RootStackParamList,
  "MusicPlayer"
>;

const DEFAULT_LYRICS = [
  "Feel the rhythm meet the night sky glow,",
  "Let every heartbeat echo what you know.",
  "Chasing echoes through the silver air,",
  "Singing stories only we can share.",
  "Hold the chorus, let the verses fly,",
  "This melody is yours and mine to try.",
];

const FALLBACK_LYRIC_GAP_MS = 4000;
const ESTIMATED_LYRIC_ROW_HEIGHT = 36;
const HIGHLIGHT_ANIMATION_DURATION = 220;
const FALLBACK_COVER = "https://via.placeholder.com/150";
const LYRIC_TIMING_UPPER_BOUND_SECONDS = 600;

const buildFallbackLyrics = (
  songId: number,
  fallbackRaw?: string | null
): LyricLineType[] => {
  const source =
    fallbackRaw && fallbackRaw.trim().length > 0
      ? fallbackRaw
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      : DEFAULT_LYRICS;

  return source.map((line, index) => ({
    lyric_id: -(index + 1),
    song_id: songId,
    lyric: line,
    timestart: index * FALLBACK_LYRIC_GAP_MS,
  }));
};

const normaliseLyricTimings = (entries: LyricLineType[]): LyricLineType[] => {
  if (!entries.length) {
    return entries;
  }

  const validTimes = entries
    .map((item) => item.timestart)
    .filter(
      (time): time is number =>
        typeof time === "number" && !Number.isNaN(time) && time >= 0
    );

  if (!validTimes.length) {
    return entries;
  }

  const maxTime = Math.max(...validTimes);
  const shouldScaleToMillis =
    maxTime > 0 && maxTime <= LYRIC_TIMING_UPPER_BOUND_SECONDS;

  if (!shouldScaleToMillis) {
    return entries;
  }

  return entries.map((item) => ({
    ...item,
    timestart:
      typeof item.timestart === "number" && !Number.isNaN(item.timestart)
        ? item.timestart * 1000
        : item.timestart,
  }));
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
  const [lyricsContentHeight, setLyricsContentHeight] = useState(0);
  const lyricsScrollRef = useRef<ScrollView | null>(null);
  const lyricHeightsRef = useRef<Record<number, number>>({});
  const lyricAnimationsRef = useRef<Record<number, Animated.Value>>({});
  const previousHighlightRef = useRef(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const vocalSoundRef = useRef<Audio.Sound | null>(null);
  const vocalResumePositionRef = useRef(0);
  const vocalSyncingRef = useRef(false);
  const autoSubmitInProgressRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [singer, setSinger] = useState<string | undefined>(undefined);

  const [loadingResult, setLoadingResult] = useState(false);
  const [vocalEnabled, setVocalEnabled] = useState(true);
  const vocalEnabledRef = useRef(vocalEnabled);
  const [hasVocalTrack, setHasVocalTrack] = useState(false);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    vocalEnabledRef.current = vocalEnabled;
  }, [vocalEnabled]);

  const stopVocalPlayback = useCallback(async (resetPosition = false) => {
    const vocalSound = vocalSoundRef.current;
    if (!vocalSound) {
      return;
    }

    try {
      const status = await vocalSound.getStatusAsync();
      if (!status.isLoaded) {
        return;
      }

      if (status.isPlaying) {
        if (resetPosition) {
          await vocalSound.stopAsync();
        } else {
          await vocalSound.pauseAsync();
        }
      } else if (resetPosition) {
        await vocalSound.stopAsync();
      }

      if (resetPosition) {
        await vocalSound.setPositionAsync(0);
        vocalResumePositionRef.current = 0;
      }
    } catch (error) {
      console.warn("Failed to stop vocal playback", error);
    }
  }, []);

  const alignVocalWithInstrument = useCallback(
    async (shouldPlay: boolean, forceEnable?: boolean) => {
      const vocalSound = vocalSoundRef.current;
      const instrumentSound = soundRef.current;
      if (!vocalSound || !instrumentSound) {
        return;
      }

      try {
        const [instrumentStatus, vocalStatus] = await Promise.all([
          instrumentSound.getStatusAsync(),
          vocalSound.getStatusAsync(),
        ]);

        if (!instrumentStatus.isLoaded || !vocalStatus.isLoaded) {
          return;
        }

        const allowPlayback = forceEnable ?? vocalEnabled;

        if (!allowPlayback) {
          vocalResumePositionRef.current = instrumentStatus.positionMillis ?? vocalResumePositionRef.current;
          if (vocalStatus.isPlaying) {
            await vocalSound.pauseAsync();
          }
          return;
        }

        const targetPosition = instrumentStatus.positionMillis ?? 0;

        const difference = Math.abs((vocalStatus.positionMillis ?? 0) - targetPosition);
        if (difference > 220) {
          if (vocalSyncingRef.current) {
            return;
          }
          vocalSyncingRef.current = true;
          try {
            await vocalSound.setPositionAsync(targetPosition);
          } finally {
            vocalSyncingRef.current = false;
          }
        }

        vocalResumePositionRef.current = targetPosition;

        if (shouldPlay) {
          if (!vocalStatus.isPlaying) {
            await vocalSound.playAsync();
          }
        } else if (vocalStatus.isPlaying) {
          await vocalSound.pauseAsync();
        }
      } catch (error) {
        console.warn("Failed to align vocal track", error);
      }
    },
    [vocalEnabled]
  );

  const stopAndUnloadCurrentSound = useCallback(async () => {
    const currentInstrument = soundRef.current;
    const currentVocal = vocalSoundRef.current;

    if (currentInstrument) {
      try {
        const status = await currentInstrument.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await currentInstrument.stopAsync();
          }
          await currentInstrument.unloadAsync();
        }
      } catch (err) {
        console.error("Error managing sound instance:", err);
      } finally {
        soundRef.current = null;
      }
    }

    if (currentVocal) {
      try {
        const vocalStatus = await currentVocal.getStatusAsync();
        if (vocalStatus.isLoaded) {
          if (vocalStatus.isPlaying) {
            await currentVocal.stopAsync();
          }
          await currentVocal.unloadAsync();
        }
      } catch (err) {
        console.error("Error unloading vocal sound:", err);
      } finally {
        vocalSoundRef.current = null;
        vocalSyncingRef.current = false;
      }
    }

    setSound(null);
    setIsPlaying(false);
    setPosition(0);
    setHasVocalTrack(false);
    setVocalEnabled(false);
    vocalResumePositionRef.current = 0;
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
      console.warn(
        "Skipping recording cleanup because recorder is not available:",
        err
      );
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
      const instrumentUri = buildAssetUri(response.data?.instru_path);
      const vocalUri = buildAssetUri(response.data?.ori_path);
      const playbackUri = instrumentUri ?? vocalUri;

      if (!playbackUri) {
        console.error("Unable to resolve audio URI from response:", response.data);
        return;
      }

      console.log("Instrumental URI:", instrumentUri);
      console.log("Original URI:", vocalUri);

      const { sound: newInstrumentSound } = await Audio.Sound.createAsync(
        { uri: playbackUri },
        { shouldPlay: false }
      );
      soundRef.current = newInstrumentSound;
      setSound(newInstrumentSound);

      const st = await newInstrumentSound.getStatusAsync();
      if (st.isLoaded && typeof st.durationMillis === "number") {
        setDuration(st.durationMillis / 1000); // keep seconds in state
      }

      const hasSeparateVocal = Boolean(instrumentUri && vocalUri && instrumentUri !== vocalUri);
      setHasVocalTrack(hasSeparateVocal);
      setVocalEnabled(hasSeparateVocal);

      if (hasSeparateVocal && vocalUri) {
        try {
          const { sound: vocalSound } = await Audio.Sound.createAsync(
            { uri: vocalUri },
            { shouldPlay: false, volume: 0.6 }
          );
          vocalSoundRef.current = vocalSound;
        } catch (error) {
          console.error("Failed to load vocal track:", error);
          vocalSoundRef.current = null;
          setHasVocalTrack(false);
          setVocalEnabled(false);
        }
      } else {
        if (vocalSoundRef.current) {
          try {
            await vocalSoundRef.current.unloadAsync();
          } catch (error) {
            console.warn("Failed to unload existing vocal sound:", error);
          }
        }
        vocalSoundRef.current = null;
      }

      newInstrumentSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;

        if (typeof status.positionMillis === "number") {
          setPosition(status.positionMillis / 1000);
        }
        if (typeof status.durationMillis === "number") {
          setDuration(status.durationMillis / 1000);
        }
        setIsPlaying(status.isPlaying === true);

        const vocalSound = vocalSoundRef.current;
        if (vocalSound) {
          const isVocalEnabled = vocalEnabledRef.current;
          if (status.didJustFinish) {
            void stopVocalPlayback(true);
          } else if (isVocalEnabled) {
            void alignVocalWithInstrument(status.isPlaying === true);
          } else {
            vocalResumePositionRef.current = status.positionMillis ?? vocalResumePositionRef.current;
          }
        }

        if (status.didJustFinish) {
          setIsPlaying(false);
          setPosition(0);
          if (!autoSubmitInProgressRef.current) {
            const activeRecording = recordingRef.current ?? recording;
            if (activeRecording) {
              void stopRecording(true);
            }
          }
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
        const sortedLyrics = normaliseLyricTimings([...response.data]).sort(
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

  useEffect(() => {
    if (!hasVocalTrack || !vocalSoundRef.current || !vocalEnabled) {
      return;
    }
    void alignVocalWithInstrument(isPlaying, true);
  }, [alignVocalWithInstrument, hasVocalTrack, isPlaying, vocalEnabled]);

  const playInstrumental = async () => {
    try {
      const currentSound = soundRef.current;
      if (!currentSound) {
        console.error("Sound is not loaded");
        return;
      }
      const status = await currentSound.getStatusAsync();
      if (!status.isLoaded) {
        console.error("Instrumental sound is not fully loaded");
        return;
      }

      if (!status.isPlaying) {
        if (typeof status.positionMillis === "number" && status.positionMillis > 0) {
          await currentSound.playFromPositionAsync(status.positionMillis);
        } else {
          await currentSound.playAsync();
        }
      }

      if (vocalSoundRef.current && vocalEnabledRef.current) {
        await alignVocalWithInstrument(true);
      }
    } catch (error) {
      console.error("Error playing instrumental:", error);
    }
  };

  const toggleVocalLayer = useCallback(async () => {
    if (!hasVocalTrack) {
      return;
    }

    const nextEnabled = !vocalEnabled;
    setVocalEnabled(nextEnabled);

    const instrumentSound = soundRef.current;
    const vocalSound = vocalSoundRef.current;

    if (!vocalSound) {
      return;
    }

    try {
      if (!nextEnabled) {
        if (instrumentSound) {
          const status = await instrumentSound.getStatusAsync();
          if (status.isLoaded) {
            vocalResumePositionRef.current = status.positionMillis ?? vocalResumePositionRef.current;
          }
        }
        await stopVocalPlayback(false);
      } else {
        const instrumentStatus = instrumentSound ? await instrumentSound.getStatusAsync() : null;
        const targetPosition =
          instrumentStatus && instrumentStatus.isLoaded
            ? instrumentStatus.positionMillis ?? vocalResumePositionRef.current
            : vocalResumePositionRef.current;

        vocalSyncingRef.current = true;
        try {
          await vocalSound.setPositionAsync(targetPosition);
        } finally {
          vocalSyncingRef.current = false;
        }

        vocalResumePositionRef.current = targetPosition;

        if (instrumentStatus?.isLoaded && instrumentStatus.isPlaying) {
          await vocalSound.playAsync();
        }
      }
    } catch (error) {
      console.warn("Failed to toggle vocal layer", error);
    }
  }, [hasVocalTrack, stopVocalPlayback, vocalEnabled]);

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
    setLyricsContentHeight(0);
    setTimeout(() => {
      lyricsScrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    }, 0);
  }, [lyrics]);

  useEffect(() => {
    if (!lyrics.length) return;
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

  const handleContentSizeChange = useCallback((_: number, height: number) => {
    setLyricsContentHeight(height);
  }, []);

  const getLineMetrics = useCallback(
    (index: number) => {
      let top = 0;
      for (let i = 0; i < index; i++) {
        top += lyricHeightsRef.current[i] ?? ESTIMATED_LYRIC_ROW_HEIGHT;
      }
      const height =
        lyricHeightsRef.current[index] ?? ESTIMATED_LYRIC_ROW_HEIGHT;
      return { top, height };
    },
    []
  );

  const computeCenteredOffset = useCallback(
    (index: number) => {
      if (lyricsContainerHeight <= 0) {
        return 0;
      }

      const { top, height } = getLineMetrics(index);
      const lineMidpoint = top + height / 2;
      const desiredOffset = lineMidpoint - lyricsContainerHeight / 2;
      const maxOffset = Math.max(
        lyricsContentHeight - lyricsContainerHeight,
        0
      );

      return Math.min(Math.max(desiredOffset, 0), maxOffset);
    },
    [getLineMetrics, lyricsContainerHeight, lyricsContentHeight]
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

      const targetOffset = computeCenteredOffset(index);

      requestAnimationFrame(() => {
        lyricsScrollRef.current?.scrollTo({
          y: targetOffset,
          animated,
        });
      });
    },
    [computeCenteredOffset, lyricsContainerHeight]
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
  }, [lyricsContainerHeight, lyricsContentHeight, highlightIndex, scrollToHighlight]);

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
      // setLyrics(response.data.lyrics?.split("\n") || ["No lyrics available"]);
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
      autoSubmitInProgressRef.current = false;
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

type CreateRecordResponseData = {
  filePath: string;
  mistakes: any[];
  recordId: number;
  score: number;
};

type CreateRecordResponse = {
  success: boolean;
  msg?: string;
  data: CreateRecordResponseData;
};

const stopRecording = async (triggeredByAuto = false) => {
  const activeRecording = recordingRef.current ?? recording;
  if (!activeRecording) {
    return;
  }

  if (autoSubmitInProgressRef.current && triggeredByAuto) {
    return;
  }

  if (!autoSubmitInProgressRef.current) {
    autoSubmitInProgressRef.current = true;
  }

  try {
    // Stop and unload the recording
    await activeRecording.stopAndUnloadAsync();
    const uri = activeRecording.getURI();
    setRecordingUri(uri);
    recordingRef.current = null;
    setRecording(null);

    // Stop and unload instrumental
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }

    if (vocalSoundRef.current) {
      try {
        await stopVocalPlayback(true);
        await vocalSoundRef.current.unloadAsync();
      } catch (error) {
        console.warn("Failed to reset vocal track after recording", error);
      } finally {
        vocalSoundRef.current = null;
        vocalSyncingRef.current = false;
        setHasVocalTrack(false);
        setVocalEnabled(false);
      }
    }

    console.log("Recording stopped and instrumental audio unloaded");

    if (!uri) {
      console.error("Recording URI is null, cannot save file.");
      return;
    }

    // Save recording with Expo SDK 54 File API
    const source = new File(uri);
    const target = new File(Paths.document, "recording.m4a");

    if (target.exists) target.delete();
    source.copy(target);
    console.log(`Recording saved as .m4a file at: ${target.uri}`);

    if (!songKey.ori_path) throw new Error("Original path is missing");

    setLoadingResult(true);

    // ✅ Safe cast: BaseResponse<string> -> unknown -> CreateRecordResponse
    const response = (await createRecord(
      target.uri,
      `${songKey.version_id}`,
      songKey.key_signature,
      songKey.ori_path
    )) as unknown as CreateRecordResponse;

    const responseData = response.data;

    if (response.success && responseData?.score !== undefined) {
      navigation.navigate("Result", {
        score: responseData.score,
        song_id: songKey.song_id,
        recordId: responseData.recordId,
        version_id: songKey.version_id,
        localUri: target.uri,
      });
      console.log("Navigated to Result screen successfully");
    } else {
      console.error("No valid score returned from backend:", response);
    }
  } catch (err) {
    console.error("Error in stopRecording:", err);
  } finally {
    setLoadingResult(false);
    console.log("stopRecording process completed.");
  }
};



  // ✅ Navigate to Result if score is returned
  //     if (response.success && response.data?.score !== undefined) {
  //       navigation.navigate("Result", { score: response.data.score, });
  //     } else {
  //       console.error("No score returned from backend:", response);
  //     }
  //   } catch (e) {
  //     console.error("Error creating record:", e);
  //   } finally {
  //     console.log("Stop recording process completed.");
  //   }
  // };

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
        source={{ uri: FALLBACK_COVER }}
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

  const resolvedCover = buildAssetUri(image) ?? FALLBACK_COVER;

  return (
    <ImageBackground
      source={{
        uri: resolvedCover,
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
            source={{ uri: resolvedCover }}
            style={styles.albumArt}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.songTitle}>{title}</Text>
            <Text style={styles.artist}>{singer}</Text>
          </View>
        </View>

        {/* Lyrics */}
        {lyrics.length > 0 && (
          <View style={styles.lyricsWrapper} onLayout={handleLyricsLayout}>
            <ScrollView
              ref={lyricsScrollRef}
              contentContainerStyle={styles.lyricsContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={handleContentSizeChange}
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
          </View>
        )}

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
          <TouchableOpacity
            onPress={toggleVocalLayer}
            style={[styles.vocalToggle, !hasVocalTrack && styles.vocalToggleDisabled]}
            disabled={!hasVocalTrack}
          >
            <Ionicons
              name={vocalEnabled ? "volume-high" : "volume-mute"}
              size={28}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.micButton}>
            <Ionicons name="mic" size={50} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={stopRecording}
            disabled={!recording}
            style={!recording ? styles.confirmDisabled : undefined}
          >
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
    justifyContent: "flex-start",
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
  vocalToggle: {
    backgroundColor: "rgba(107, 107, 107, 0.5)",
    padding: 12,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  vocalToggleDisabled: {
    opacity: 0.4,
  },
  micButton: {
    backgroundColor: "rgba(107, 107, 107, 0.5)",
    padding: 20,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmDisabled: {
    opacity: 0.4,
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
