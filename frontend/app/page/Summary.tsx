// app/screens/Summary.tsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getRecordById } from "@/api/getRecordById";
import { RootStackParamList } from "@/types/Navigation";
import { getMistakes, MistakeSummaryPayload } from "@/api/getMistakes";
import { getSong } from "@/api/song/getSong";
import { SongType as ApiSongType } from "@/api/types/song"; // API version
import { MistakeType } from "@/api/types/mistakes";
import { Audio, AVPlaybackStatus, AVPlaybackStatusToSet } from "expo-av";
import { Directory, File, Paths } from "expo-file-system";
import { Axios } from "@/util/AxiosInstance";
import { GlobalConstant } from "@/constant";
import { getAudioVerById } from "@/api/song/getAudioById";
import { buildAssetUri } from "@/util/assetUri";
import { previewBus } from "@/util/previewBus";

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
  color: string;
};

type UserRecord = {
  accuracy_score: number;
  created_at: string;
  key: string;
  record_id: number;
  user_audio_path: string;
  user_id: number;
  version_id: number;
  fullPath?: string; // add this
};

// ------------------- MAPPER -------------------
function buildAlbumCoverUri(cover: string | null): string {
  const resolved = buildAssetUri(cover);
  return resolved ?? "https://placehold.co/300x300";
}

function mapApiSongToAppSong(song: ApiSongType): SongType {
  return {
    id: song.song_id.toString(),
    songName: song.title,
    artist: song.singer,
    image: buildAlbumCoverUri(song.album_cover),
  };
}

const INSTRUMENT_VOLUME = 0.4;

const resolveMediaUri = (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (path.startsWith("file://")) {
    return path;
  }

  const assetUri = buildAssetUri(path);
  if (assetUri) {
    return assetUri;
  }

  const sanitized = path.replace(/^\/?data\//, "").replace(/^\/+/, "");
  return `${GlobalConstant.API_URL}/${sanitized}`;
};

const ensureSafeFileName = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "_");

const MISTAKE_COLOR_MAP: Record<string, string> = {
  "too-high-major": "#ff4d8d",
  "too-high": "#ff7abf",
  "slightly-high": "#ff9bd6",
  "too-low-major": "#4368ff",
  "too-low": "#6c63ff",
  "slightly-low": "#8b87ff",
  missing: "#ffb74d",
};

const FALLBACK_MISTAKE_COLOR = "#ff7abf";

// ------------------- SUMMARY SCREEN -------------------
type SummaryRouteProp = RouteProp<RootStackParamList, "Summary">;

export default function SummaryScreen() {
  const route = useRoute<SummaryRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const { score, recordId, song_id } = route.params;

  const [track, setTrack] = useState<SongType | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [qualityTier, setQualityTier] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playbackCompleted, setPlaybackCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const soundRef = useRef<Audio.Sound | null>(null);
  const instrumentalRef = useRef<Audio.Sound | null>(null);
  const [instrumentEnabled, setInstrumentEnabled] = useState(false);
  const [instrumentAvailable, setInstrumentAvailable] = useState(false);
  const instrumentEnabledRef = useRef(false);
  const userAdjustedInstrumentRef = useRef(false);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const durationRef = useRef(duration);
  const isSeekingRef = useRef(isSeeking);


  const theTrack = track ?? {
    id: "0",
    songName: "Unknown Song",
    artist: "Unknown Artist",
    image: "https://placehold.co/300x300",
  };
  const hasMistakes = issues.length > 0;
  const theScore = typeof score === "number" ? score : 0;
  const shouldShowQualityTier = Boolean(qualityTier) && !hasMistakes;
  const showEmptyMistakesState = !hasMistakes && !shouldShowQualityTier;

  const posLabel = useMemo(() => formatTime(position), [position]);
  const sliderMax = useMemo(
    () => (duration > 0 ? duration : Math.max(position, 1)),
    [duration, position]
  );
  const durationLabel = useMemo(
    () => formatTime(duration > 0 ? duration : 0),
    [duration]
  );

useEffect(() => {
  previewBus.emit({ source: "navigation" });
}, []);

useEffect(() => {
  durationRef.current = duration;
}, [duration]);

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    instrumentEnabledRef.current = instrumentEnabled;
  }, [instrumentEnabled]);

  const ensureLocalAudioFile = useCallback(async (remoteUri: string) => {
    try {
      if (remoteUri.startsWith("file://")) {
        return remoteUri;
      }

      const cacheRoot = Paths.cache;
      if (!cacheRoot?.uri) {
        throw new Error("Cache directory unavailable");
      }

      const audioCacheDir = new Directory(cacheRoot, "summary-audio-cache");
      try {
        await audioCacheDir.create({ intermediates: true, idempotent: true });
      } catch (dirError) {
        console.warn("Summary audio cache directory warning:", dirError);
      }

      const lastSegment =
        remoteUri.split("/").pop()?.split("?")[0].split("#")[0] ??
        `audio-${Date.now()}.mp3`;
      const safeFileName = ensureSafeFileName(lastSegment);
      const targetFile = new File(audioCacheDir, `${Date.now()}-${safeFileName}`);

      const downloadedFile = await File.downloadFileAsync(remoteUri, targetFile, {
        idempotent: true,
      });

      return downloadedFile.uri;
    } catch (error) {
      console.warn("Falling back to direct streaming due to caching failure", error);
      return remoteUri;
    }
  }, []);

  const REMOTE_AUDIO_PATTERN = /^https?:\/\//i;

  const loadSoundWithFallback = useCallback(
    async (
      uri: string,
      initialStatus: AVPlaybackStatusToSet | undefined,
      onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
    ) => {
      let candidateUri = uri;
      let usedCachedCopy = false;

      if (REMOTE_AUDIO_PATTERN.test(uri)) {
        const localUri = await ensureLocalAudioFile(uri);
        if (localUri && localUri !== uri) {
          candidateUri = localUri;
          usedCachedCopy = true;
        }
      }

      try {
        return await Audio.Sound.createAsync(
          { uri: candidateUri },
          initialStatus,
          onPlaybackStatusUpdate
        );
      } catch (streamError) {
        console.warn(
          "Primary audio load failed, retrying with cached copy",
          streamError
        );

        if (!usedCachedCopy) {
          const localUri = await ensureLocalAudioFile(uri);
          if (localUri && localUri !== candidateUri) {
            return await Audio.Sound.createAsync(
              { uri: localUri },
              initialStatus,
              onPlaybackStatusUpdate
            );
          }
        }

        throw streamError;
      }
    },
    [ensureLocalAudioFile]
  );

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

  useEffect(() => {
    let isMounted = true;

    const fetchRecord = async () => {
      try {
        setIsLoading(true);
        const res = await Axios.post("/private/getrecord", {
          record_id: recordId,
        });

        if (!isMounted) {
          return;
        }

        if (res.data.success && res.data.data) {
          setUserRecord(res.data.data);
          console.log("Fetched record:", res.data.data);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching record:", err);
          setIsLoading(false);
        }
      }
    };

    fetchRecord();

    return () => {
      isMounted = false;
    };
  }, [recordId]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if ("error" in status && status.error) {
        console.error("Playback status error:", status.error);
      }
      return;
    }

    if (status.durationMillis != null) {
      setDuration(status.durationMillis / 1000);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setIsSeeking(false);
      const finishedSeconds =
        status.durationMillis != null
          ? status.durationMillis / 1000
          : durationRef.current > 0
          ? durationRef.current
          : 0;
      setPosition(finishedSeconds);
      setPlaybackCompleted(true);
      if (instrumentalRef.current) {
        const inst = instrumentalRef.current;
        inst
          .stopAsync()
          .then(async () => {
            try {
              const targetVolume = instrumentEnabledRef.current
                ? INSTRUMENT_VOLUME
                : 0;
              await inst.setVolumeAsync(targetVolume);
            } catch (volErr) {
              console.warn("Failed to reset instrumental volume", volErr);
            }
          })
          .catch((err) => console.warn("Failed to stop instrumental", err));
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    if (status.isPlaying) {
      setPlaybackCompleted(false);
    }

    if (!status.isPlaying && !status.didJustFinish) {
      const inst = instrumentalRef.current;
      if (inst) {
        inst
          .getStatusAsync()
          .then((instStatus) => {
            if (
              instStatus.isLoaded &&
              instStatus.isPlaying &&
              instrumentEnabledRef.current
            ) {
              return inst.pauseAsync();
            }
            return undefined;
          })
          .catch((err) =>
            console.warn("Failed to sync instrumental state", err)
          );
      }
    }

    if (!isSeekingRef.current && status.positionMillis != null) {
      setPosition(status.positionMillis / 1000);
    }
  }, []);

  const loadAudioSources = useCallback(
    async (record: UserRecord) => {
      try {
        setIsLoading(true);
        const recordingUri = resolveMediaUri(record.user_audio_path);
        if (!recordingUri) {
          console.warn("Unable to resolve recording URI");
          setIsLoading(false);
          return;
        }

        const versionResponse = await getAudioVerById(record.version_id);
        const versionData = versionResponse?.data;

        if (soundRef.current) {
          try {
            await soundRef.current.unloadAsync();
          } catch (error) {
            console.warn("Failed to unload previous recording", error);
          }
          soundRef.current = null;
        }

        if (instrumentalRef.current) {
          try {
            await instrumentalRef.current.unloadAsync();
          } catch (error) {
            console.warn("Failed to unload previous instrumental", error);
          }
          instrumentalRef.current = null;
        }

        const { sound: recordingSound } = await loadSoundWithFallback(
          recordingUri,
          { shouldPlay: false },
          handlePlaybackStatusUpdate
        );

        recordingSound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
        soundRef.current = recordingSound;

        const recordingStatus = await recordingSound.getStatusAsync();
        if (recordingStatus.isLoaded && recordingStatus.durationMillis != null) {
          setDuration(recordingStatus.durationMillis / 1000);
        }
        setPosition(0);
        setIsPlaying(false);

        setInstrumentEnabled(false);
        setInstrumentAvailable(false);
        instrumentEnabledRef.current = false;
        userAdjustedInstrumentRef.current = false;

        const instrumentalUri =
          versionResponse?.success && versionData
            ? resolveMediaUri(versionData.instru_path ?? versionData.ori_path)
            : null;

        if (instrumentalUri) {
          try {
            const { sound: instrumentalSound } = await loadSoundWithFallback(
              instrumentalUri,
              { shouldPlay: false, volume: INSTRUMENT_VOLUME }
            );
            instrumentalRef.current = instrumentalSound;
            setInstrumentAvailable(true);
            setInstrumentEnabled(true);
            instrumentEnabledRef.current = true;
            userAdjustedInstrumentRef.current = false;
            try {
              const instStatus = await instrumentalSound.getStatusAsync();
              if (instStatus.isLoaded && instStatus.volume !== INSTRUMENT_VOLUME) {
                await instrumentalSound.setVolumeAsync(INSTRUMENT_VOLUME);
              }
            } catch (volumeError) {
              console.warn("Failed to set initial instrumental volume", volumeError);
            }
          } catch (instrumentError) {
            console.warn(
              "Failed to load instrumental track, continuing without it",
              instrumentError
            );
            instrumentalRef.current = null;
            setInstrumentEnabled(false);
            setInstrumentAvailable(false);
            instrumentEnabledRef.current = false;
            userAdjustedInstrumentRef.current = false;
          }
        } else {
          instrumentalRef.current = null;
          setInstrumentEnabled(false);
          setInstrumentAvailable(false);
          instrumentEnabledRef.current = false;
          userAdjustedInstrumentRef.current = false;
        }
      } catch (error) {
        console.error("Failed to load audio sources", error);
      } finally {
        setIsLoading(false);
      }
    },
    [handlePlaybackStatusUpdate, loadSoundWithFallback]
  );

  useEffect(() => {
    if (userRecord) {
      setIsLoading(true);
      loadAudioSources(userRecord).catch((error) =>
        console.error("Failed to prepare audio sources", error)
      );
    }
  }, [userRecord, loadAudioSources]);

  useEffect(() => {
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
    setIsSeeking(false);
    setInstrumentEnabled(false);
    setInstrumentAvailable(false);
    instrumentEnabledRef.current = false;
    userAdjustedInstrumentRef.current = false;

    if (soundRef.current) {
      soundRef.current
        .unloadAsync()
        .catch((err) =>
          console.error("Error unloading previous recording:", err)
        );
      soundRef.current = null;
    }
    if (instrumentalRef.current) {
      instrumentalRef.current
        .unloadAsync()
        .catch((err) =>
          console.error("Error unloading previous instrumental:", err)
        );
      instrumentalRef.current = null;
    }
  }, [recordId]);

  const clampPosition = useCallback(
    (value: number) => {
      if (duration <= 0) {
        return Math.max(value, 0);
      }
      const safeDuration = Math.max(duration - 0.25, 0);
      return Math.min(Math.max(value, 0), safeDuration);
    },
    [duration]
  );

  const resumePlaybackAt = useCallback(
    async (positionMillis: number) => {
      const recordingSound = soundRef.current;
      if (!recordingSound) {
        return;
      }

      const targetMillis = Math.max(0, positionMillis);

      const instrumentSound = instrumentalRef.current;
      const shouldPlayInstrument =
        Boolean(instrumentSound) && instrumentEnabledRef.current;

      try {
        await recordingSound.setPositionAsync(targetMillis);
      } catch (err) {
        console.warn("Failed to set recording position", err);
      }

      if (instrumentSound) {
        try {
          await instrumentSound.setPositionAsync(targetMillis);
        } catch (err) {
          console.warn("Failed to set instrumental position", err);
        }

        try {
          await instrumentSound.setVolumeAsync(
            shouldPlayInstrument ? INSTRUMENT_VOLUME : 0
          );
        } catch (err) {
          console.warn("Failed to adjust instrumental volume", err);
        }
      }

      try {
        if (shouldPlayInstrument && instrumentSound) {
          await Promise.all([
            recordingSound.playAsync(),
            instrumentSound.playAsync(),
          ]);
        } else {
          await recordingSound.playAsync();
        }
        setIsPlaying(true);
      } catch (resumeError) {
        console.error("Error resuming playback", resumeError);
        setIsPlaying(false);
      }
    },
    []
  );

  const seekToPosition = useCallback(
    async (value: number, resumePlayback?: boolean) => {
      const targetSeconds = clampPosition(value);
      const targetMillis = Math.max(0, Math.round(targetSeconds * 1000));

      const currentSound = soundRef.current;
      if (!currentSound) {
        setPosition(targetSeconds);
        setPlaybackCompleted(false);
        return;
      }

      try {
        const currentStatus = await currentSound.getStatusAsync();
        if (!currentStatus.isLoaded) {
          console.warn("Recording sound not loaded during seek.");
          return;
        }

        const shouldResume =
          typeof resumePlayback === "boolean"
            ? resumePlayback
            : currentStatus.isPlaying === true;

        await currentSound.setPositionAsync(targetMillis);

        const instrumentSound = instrumentalRef.current;
        const instrumentReady =
          Boolean(instrumentSound && instrumentEnabledRef.current);
        if (instrumentSound) {
          try {
            const instrumentStatus = await instrumentSound.getStatusAsync();
            if (instrumentStatus.isLoaded) {
              await instrumentSound.setPositionAsync(targetMillis);
              if (instrumentEnabledRef.current) {
                if (instrumentStatus.volume !== INSTRUMENT_VOLUME) {
                  await instrumentSound.setVolumeAsync(INSTRUMENT_VOLUME);
                }
              } else if (instrumentStatus.volume !== 0) {
                await instrumentSound.setVolumeAsync(0);
              }
            }
          } catch (instrumentError) {
            console.warn("Failed to align instrumental during seek", instrumentError);
          }
        }

        setPosition(targetSeconds);
        setPlaybackCompleted(false);

        if (shouldResume) {
          await resumePlaybackAt(targetMillis);
        } else {
          setIsPlaying(false);
        }
      } catch (err) {
        console.error("Error seeking user recording:", err);
      }
    },
    [clampPosition, resumePlaybackAt]
  );

  const togglePlayback = useCallback(async () => {
    try {
      if (!userRecord) {
        console.warn("No user record loaded.");
        return;
      }

      if (!soundRef.current) {
        await loadAudioSources(userRecord);
      }

      const recordingSound = soundRef.current;
      if (!recordingSound) {
        console.warn("Recording sound not available.");
        return;
      }

      const status = await recordingSound.getStatusAsync();
      if (!status.isLoaded) {
        await loadAudioSources(userRecord);
        return;
      }

      if (playbackCompleted) {
        try {
          await recordingSound.setPositionAsync(0);
          if (instrumentalRef.current) {
            try {
              const instStatus = await instrumentalRef.current.getStatusAsync();
              if (instStatus.isLoaded) {
                await instrumentalRef.current.setPositionAsync(0);
                if (instrumentEnabledRef.current) {
                  if (instStatus.volume !== INSTRUMENT_VOLUME) {
                    await instrumentalRef.current.setVolumeAsync(INSTRUMENT_VOLUME);
                  }
                }
              }
            } catch (error) {
              console.warn("Failed to reset instrumental position", error);
            }
          }
          setPosition(0);
          setPlaybackCompleted(false);
        } catch (resetError) {
          console.warn("Failed to reset playback to start", resetError);
        }
      }

      if (status.isPlaying) {
        await recordingSound.pauseAsync();
        if (instrumentalRef.current) {
          try {
            const instStatus = await instrumentalRef.current.getStatusAsync();
            if (
              instStatus.isLoaded &&
              instStatus.isPlaying &&
              instrumentEnabledRef.current
            ) {
              await instrumentalRef.current.pauseAsync();
            }
          } catch (error) {
            console.warn("Failed to pause instrumental", error);
          }
        }
        setIsPlaying(false);
        return;
      }

      const instrumentSound = instrumentalRef.current;

      if (instrumentSound && !userAdjustedInstrumentRef.current) {
        if (!instrumentEnabledRef.current) {
          setInstrumentEnabled(true);
          instrumentEnabledRef.current = true;
        }
        try {
          const instStatus = await instrumentSound.getStatusAsync();
          if (instStatus.isLoaded && instStatus.volume !== INSTRUMENT_VOLUME) {
            await instrumentSound.setVolumeAsync(INSTRUMENT_VOLUME);
          }
          userAdjustedInstrumentRef.current = true;
        } catch (error) {
          console.warn("Failed to prepare instrumental", error);
        }
      }

      if (instrumentSound && instrumentEnabledRef.current) {
        try {
          const [recStatus, instStatus] = await Promise.all([
            recordingSound.getStatusAsync(),
            instrumentSound.getStatusAsync(),
          ]);

          if (recStatus.isLoaded && instStatus.isLoaded) {
            const targetPosition = recStatus.positionMillis ?? 0;
            await instrumentSound.setPositionAsync(targetPosition);
            if (instStatus.volume !== INSTRUMENT_VOLUME) {
              await instrumentSound.setVolumeAsync(INSTRUMENT_VOLUME);
            }
          }
        } catch (error) {
          console.warn("Failed to align instrumental before playback", error);
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      let startPosition = status.positionMillis ?? 0;
      const totalDuration =
        status.durationMillis ?? (duration > 0 ? duration * 1000 : undefined);
      if (typeof totalDuration === "number" && startPosition >= totalDuration - 250) {
        await recordingSound.setPositionAsync(0);
        startPosition = 0;
      }
      await resumePlaybackAt(startPosition);
    } catch (err) {
      console.error("Error playing user recording:", err);
    }
  }, [userRecord, loadAudioSources, duration, resumePlaybackAt]);

  const sliderWasPlayingRef = useRef(false);

  const handleSliderComplete = useCallback(
    async (value: number) => {
      setIsSeeking(true);
      try {
        await seekToPosition(value, sliderWasPlayingRef.current);
      } finally {
        setIsSeeking(false);
      }
    },
    [seekToPosition]
  );

  const handleToggleInstrument = useCallback(async () => {
    const instrumentSound = instrumentalRef.current;
    if (!instrumentSound) {
      return;
    }

    userAdjustedInstrumentRef.current = true;

    const nextEnabled = !instrumentEnabledRef.current;
    setInstrumentEnabled(nextEnabled);
    instrumentEnabledRef.current = nextEnabled;

    try {
      if (!nextEnabled) {
        const instStatus = await instrumentSound.getStatusAsync();
        if (instStatus.isLoaded) {
          if (instStatus.volume !== 0) {
            await instrumentSound.setVolumeAsync(0);
          }
          if (instStatus.isPlaying) {
            await instrumentSound.pauseAsync();
          }
        }
        return;
      }

      const recordingSound = soundRef.current;
      if (!recordingSound) {
        return;
      }

      const recStatus = await recordingSound.getStatusAsync();
      if (!recStatus.isLoaded) {
        return;
      }

      const target = recStatus.positionMillis ?? 0;
      const instStatus = await instrumentSound.getStatusAsync();
      if (instStatus.isLoaded) {
        await instrumentSound.setPositionAsync(target);
        if (instStatus.volume !== INSTRUMENT_VOLUME) {
          await instrumentSound.setVolumeAsync(INSTRUMENT_VOLUME);
        }
        if (recStatus.isPlaying) {
          await instrumentSound.playAsync();
        }
      }
    } catch (error) {
      console.warn("Failed to toggle instrumental", error);
    }
  }, []);

  // ------------------- CLEANUP -------------------
  // ------------------- FETCH MISTAKES -------------------
  useEffect(() => {
    const fetchMistakes = async () => {
      if (!recordId) {
        setIssues([]);
        setQualityTier(null);
        return;
      }
      try {
        const res = await getMistakes(recordId);
        console.log("Fetched mistakes:", res.data);

        if (!res.success) {
          setIssues([]);
          setQualityTier(null);
          return;
        }

        const payload = res.data as MistakeType[] | MistakeSummaryPayload | undefined;

        if (Array.isArray(payload)) {
          if (payload.length > 0) {
            const mappedIssues = payload.map(mistakeToIssue);
            setIssues(mappedIssues);
            setQualityTier(null);
          } else {
            setIssues([]);
            setQualityTier(theScore <= 0 ? "No Singing Detected" : null);
          }
          return;
        }

        if (payload && typeof payload === "object") {
          const { mistakes = [], qualityTier: nextQualityTier, score: payloadScore } =
            payload as MistakeSummaryPayload;

          if (Array.isArray(mistakes) && mistakes.length > 0) {
            const mappedIssues = mistakes.map(mistakeToIssue);
            setIssues(mappedIssues);
            setQualityTier(null);
            return;
          }

          const derivedTier =
            nextQualityTier ??
            (typeof payloadScore === "number" && payloadScore <= 0
              ? "No Singing Detected"
              : theScore <= 0
              ? "No Singing Detected"
              : null);

          setIssues([]);
          setQualityTier(derivedTier);
          return;
        }

        setIssues([]);
        setQualityTier(theScore <= 0 ? "No Singing Detected" : null);
      } catch (err) {
        console.error("Error fetching mistakes:", err);
        setIssues([]);
        setQualityTier(theScore <= 0 ? "No Singing Detected" : null);
      }
    };
    fetchMistakes();
  }, [recordId, theScore]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current
          .unloadAsync()
          .catch((err) =>
            console.error("Error unloading user recording:", err)
          );
        soundRef.current = null;
      }
      if (instrumentalRef.current) {
        instrumentalRef.current
          .unloadAsync()
          .catch((err) =>
            console.error("Error unloading instrumental:", err)
          );
        instrumentalRef.current = null;
      }
      setInstrumentEnabled(false);
      setInstrumentAvailable(false);
      instrumentEnabledRef.current = false;
    };
  }, []);

  // ------------------- RENDER -------------------
  if (isLoading) {
    return (
      <LinearGradient colors={["#8C5BFF", "#120a1a"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 12 }}>
            Preparing your recording...
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#8C5BFF", "#120a1a"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "MainTabs",
                      params: { screen: "Profile" },
                    },
                  ],
                })
              )
            }
            style={styles.nextBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#fff" />
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
              maximumValue={sliderMax}
              value={Math.min(position, sliderMax)}
              onSlidingStart={() => {
                sliderWasPlayingRef.current = isPlaying;
                setIsSeeking(true);
              }}
              onValueChange={(value) => {
                setIsSeeking(true);
                setPosition(clampPosition(value));
              }}
              onSlidingComplete={handleSliderComplete}
              minimumTrackTintColor="#ff82c6"
              maximumTrackTintColor="#ffffff66"
              thumbTintColor="#ff7abf"
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{posLabel}</Text>
              <Text style={styles.timeLabel}>{durationLabel}</Text>
            </View>
          </View>

          {/* Play User Recording */}
          {userRecord?.user_audio_path && (
            <View style={styles.playbackControlsRow}>
              <TouchableOpacity
                onPress={togglePlayback}
                style={styles.playRecordingButton}
                activeOpacity={0.88}
              >
                <Text style={styles.playRecordingLabel}>
                  {isPlaying
                    ? "Pause Recording"
                    : playbackCompleted
                    ? "Replay Recording"
                    : "Play Recording"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleInstrument}
                style={[
                  styles.instrumentToggle,
                  instrumentEnabled && styles.instrumentToggleActive,
                  !instrumentAvailable && styles.instrumentToggleDisabled,
              { marginLeft: 18 },
            ]}
            activeOpacity={0.9}
          >
            <Ionicons
              name={instrumentEnabled ? "musical-notes" : "musical-notes-outline"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
          )}

          {/* Missing Part */}
          <Text style={styles.sectionTitle}>
            {shouldShowQualityTier ? "Something wrong!" : "Performance Insight"}
          </Text>
          <View style={styles.issueFrame}>
            {hasMistakes ? (
              issues.map((it, idx) => (
                <TouchableOpacity
                  key={`${it.at}-${idx}`}
                  activeOpacity={0.8}
                  style={[styles.issueItem, { borderLeftColor: it.color }]}
                  onPress={() => {
                    void seekToPosition(it.at, isPlaying);
                  }}
                >
                  <Text style={styles.issueTime}>{formatTime(it.at)}</Text>
                  <Text style={[styles.issueText, { color: it.color }]}>
                    {it.label}
                  </Text>
                </TouchableOpacity>
              ))
            ) : shouldShowQualityTier ? (
              <View style={styles.qualityTierCard}>
                <Text style={styles.qualityTierTitle}>{qualityTier}</Text>
              </View>
            ) : showEmptyMistakesState ? (
              <View style={styles.emptyMistakeCard}>
                <Text style={styles.emptyMistakeTitle}>No mistakes recorded</Text>
                <Text style={styles.emptyMistakeSubtitle}>
                  Nice work! Keep practicing to boost your score even further.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ------------------- HELPERS -------------------
function mistakeToIssue(m: MistakeType): Issue {
  const rawStart = m.timestamp_start ?? 0;
  const atSeconds =
    rawStart > 1000 ? rawStart / 1000 : rawStart;
  const at = Math.max(0, atSeconds);
  const reasonKey = (m.reason ?? "").toLowerCase();
  const color = MISTAKE_COLOR_MAP[reasonKey] ?? FALLBACK_MISTAKE_COLOR;
  const pitchDetail = buildPitchDetail(m.pitch_diff, reasonKey);

  let label: string;

  switch (reasonKey) {
    case "missing": {
      const rawDuration = (m.timestamp_end ?? 0) - (m.timestamp_start ?? 0);
      const duration =
        rawDuration > 1000 ? rawDuration / 1000 : rawDuration;
      label = `Missing phrase (${formatSeconds(duration)})`;
      break;
    }
    case "too-high-major":
      label = `Way too high${pitchDetail}`;
      break;
    case "too-high":
      label = `Too high${pitchDetail}`;
      break;
    case "slightly-high":
      label = `Slightly high${pitchDetail}`;
      break;
    case "too-low-major":
      label = `Way too low${pitchDetail}`;
      break;
    case "too-low":
      label = `Too low${pitchDetail}`;
      break;
    case "slightly-low":
      label = `Slightly low${pitchDetail}`;
      break;
    case "off-key":
      label = `Off key${pitchDetail}`;
      break;
    default: {
      const formatted =
        reasonKey.length > 0
          ? reasonKey
              .split(/[-_]/)
              .map((part) =>
                part.length ? part[0].toUpperCase() + part.slice(1) : part
              )
              .join(" ")
          : "Pitch variation detected";
      label = `${formatted}${pitchDetail}`;
      break;
    }
  }

  return { at, label, color };
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

function buildPitchDetail(diff?: number, reasonKey?: string) {
  if (typeof diff !== "number" || Number.isNaN(diff) || diff <= 0) {
    return "";
  }

  const precision = diff >= 10 ? 0 : diff >= 1 ? 1 : 2;
  const formatted = diff.toFixed(precision);

  if (!reasonKey) {
    return ` (+${formatted} Hz)`;
  }

  if (reasonKey.includes("low")) {
    return ` (-${formatted} Hz)`;
  }

  return ` (+${formatted} Hz)`;
}

// ------------------- STYLES -------------------
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  nextBtn: {
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
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
  },
  issueTime: { width: 60, color: "#111", fontWeight: "800", fontSize: 14 },
  issueText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  playbackControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  playRecordingButton: {
    backgroundColor: "#ff7abf",
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  playRecordingLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  instrumentToggle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  instrumentToggleActive: {
    backgroundColor: "#6C63FF",
    borderColor: "rgba(255,255,255,0.45)",
  },
  instrumentToggleDisabled: {
    opacity: 0.35,
  },
  qualityTierCard: {
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
  },
  qualityTierTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  qualityTierSubtitle: {
    color: "#ffffffcc",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyMistakeCard: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
  },
  emptyMistakeTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyMistakeSubtitle: {
    color: "#ffffffcc",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 18,
  },
});
