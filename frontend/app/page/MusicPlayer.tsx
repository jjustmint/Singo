import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ComponentProps,
} from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  LayoutChangeEvent,
  Animated,
} from "react-native";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  AVPlaybackStatusToSet,
} from "expo-av";
import {
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  copyAsync,
  documentDirectory,
} from "expo-file-system/legacy";
import Slider from "@react-native-community/slider";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { RootStackParamList } from "@/types/Navigation";
import { StackNavigationProp } from "@react-navigation/stack";
import { getSong } from "@/api/song/getSong";
import { createRecord } from "@/api/createRecord";
import { getAudioVerById } from "@/api/song/getAudioById";
import { getLyrics } from "@/api/song/getLyrics";
import { LyricLineType } from "@/api/types/lyrics";
import { getLeaderboard } from "@/api/leaderboard";
import { buildAssetUri } from "@/util/assetUri";
import { ensureLocalAudioFile, consumePrefetchedAudio } from "@/util/audioCache";

type MusicPlayerRouteProp = RouteProp<RootStackParamList, "MusicPlayer">;
type MusicPlayerNavProp = StackNavigationProp<
  RootStackParamList,
  "MusicPlayer"
>;

const FALLBACK_LYRIC_GAP_MS = 4000;
const ESTIMATED_LYRIC_ROW_HEIGHT = 36;
const LYRICS_ROW_MARGIN = 12;
const LYRICS_CONTAINER_TOP_PADDING = 12;
const LYRICS_INITIAL_TOP_OFFSET =
  LYRICS_CONTAINER_TOP_PADDING + LYRICS_ROW_MARGIN / 2;
const HIGHLIGHT_BOTTOM_INSET = 24;
const HIGHLIGHT_ANIMATION_DURATION = 220;
const FALLBACK_COVER = "https://via.placeholder.com/150";
const LYRIC_TIMING_UPPER_BOUND_SECONDS = 600;
const LYRICS_UNAVAILABLE_MESSAGE = "This song does not support lyrics yet.";
const VOCAL_VOLUME = 0.6;
const DEFAULT_RECORDING_EXTENSION = "m4a";
const RECORDING_DIRECTORY_NAME = "recordings";
const MAX_RECORDING_UPLOAD_BYTES = 1 * 1024 * 1024; // Upstream gateway enforces ~1 MB payload limit
const WEEKLY_CHALLENGE_LOOKBACK_DAYS = 7;
const WEEKLY_CHALLENGE_FALLBACK_START = "2025-09-26";
const WEEKLY_CHALLENGE_CACHE_MAX_AGE_MS = 1000 * 60 * 5;

type WeeklyChallengeCache = { versionId: number | null; fetchedAt: number };

let weeklyChallengeCache: WeeklyChallengeCache | null = null;

const normaliseVersionId = (candidate: unknown): number | null => {
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }
  if (typeof candidate === "string") {
    const parsed = Number.parseInt(candidate, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const resolveWeeklyChallengeVersionId = async (): Promise<number | null> => {
  const now = Date.now();

  if (
    weeklyChallengeCache &&
    now - weeklyChallengeCache.fetchedAt < WEEKLY_CHALLENGE_CACHE_MAX_AGE_MS
  ) {
    return weeklyChallengeCache.versionId;
  }

  const today = new Date();

  for (
    let offset = 0;
    offset < WEEKLY_CHALLENGE_LOOKBACK_DAYS;
    offset += 1
  ) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() - offset);
    const isoDate = candidate.toISOString().split("T")[0];

    try {
      const response = await getLeaderboard(isoDate);
      const versionId = normaliseVersionId(
        response?.data?.challengeSong?.version_id
      );
      if (versionId != null) {
        weeklyChallengeCache = {
          versionId,
          fetchedAt: Date.now(),
        };
        return versionId;
      }
    } catch (err) {
      console.warn(
        `[MusicPlayer] Leaderboard fetch failed for ${isoDate}`,
        err
      );
    }
  }

  try {
    const fallbackResponse = await getLeaderboard(
      WEEKLY_CHALLENGE_FALLBACK_START
    );
    const versionId = normaliseVersionId(
      fallbackResponse?.data?.challengeSong?.version_id
    );
    weeklyChallengeCache = {
      versionId,
      fetchedAt: Date.now(),
    };
    return versionId;
  } catch (err) {
    console.warn("[MusicPlayer] Fallback leaderboard fetch failed", err);
    weeklyChallengeCache = {
      versionId: null,
      fetchedAt: Date.now(),
    };
    return null;
  }
};

const baseAndroidRecording = Audio.RecordingOptionsPresets.HIGH_QUALITY.android;
const baseIosRecording = Audio.RecordingOptionsPresets.HIGH_QUALITY.ios;
const baseWebRecording = Audio.RecordingOptionsPresets.HIGH_QUALITY.web;

const COMPRESSED_RECORDING_OPTIONS: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
  android: {
    ...(baseAndroidRecording ?? {}),
    extension: `.${DEFAULT_RECORDING_EXTENSION}`,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    ...(baseIosRecording ?? {}),
    extension: `.${DEFAULT_RECORDING_EXTENSION}`,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  web: {
    ...(baseWebRecording ?? {}),
    mimeType: "audio/webm",
    bitsPerSecond: 32000,
  },
};

const bytesToMegabytes = (bytes: number) => bytes / (1024 * 1024);

type FileSizeCandidate = { size?: number | null };

const resolveFileSize = (info: unknown): number | null => {
  if (
    info &&
    typeof info === "object" &&
    "size" in (info as Record<string, unknown>)
  ) {
    const candidate = (info as FileSizeCandidate).size;
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return null;
};

const resolveSafeRecordingExtension = (uri: string) => {
  const match = uri.match(/\.([a-z0-9]+)(?:\?|$)/i);
  const candidate = match?.[1]?.toLowerCase();
  if (!candidate) {
    return DEFAULT_RECORDING_EXTENSION;
  }
  if (candidate === "caf") {
    return DEFAULT_RECORDING_EXTENSION;
  }
  return candidate;
};

const ensureRecordingDirectoryAsync = async (): Promise<string | null> => {
  const documentDirectoryUri = documentDirectory;
  if (!documentDirectoryUri) {
    return null;
  }

  const directory = `${documentDirectoryUri}${RECORDING_DIRECTORY_NAME}`;

  try {
    await makeDirectoryAsync(directory, { intermediates: true });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !/directory.*exists/i.test(error.message ?? "")
    ) {
      console.warn("Failed to prepare local recordings directory", error);
    }
  }

  return directory;
};

type PersistedRecording = {
  uri: string;
  size: number | null;
};

const persistRecordingFileAsync = async (
  sourceUri: string
): Promise<PersistedRecording> => {
  const fallbackInfo = async (): Promise<PersistedRecording> => {
    try {
      const info = await getInfoAsync(sourceUri);
      return {
        uri: sourceUri,
        size: resolveFileSize(info),
      };
    } catch (infoError) {
      console.warn("Failed to inspect recording file", infoError);
      return { uri: sourceUri, size: null };
    }
  };

  try {
    const directory = await ensureRecordingDirectoryAsync();
    if (!directory) {
      return await fallbackInfo();
    }

    const extension = resolveSafeRecordingExtension(sourceUri);
    const targetUri = `${directory}/recording-${Date.now()}.${extension}`;
    await copyAsync({ from: sourceUri, to: targetUri });

    const info = await getInfoAsync(targetUri);
    return {
      uri: targetUri,
      size: resolveFileSize(info),
    };
  } catch (error) {
    console.warn("Failed to persist recording file, using original path", error);
    return await fallbackInfo();
  }
};

const deleteFileIfExists = async (uri: string) => {
  if (!uri) {
    return;
  }

  try {
    await deleteAsync(uri, { idempotent: true });
  } catch (error) {
    console.warn("Failed to delete file", error);
  }
};

const buildFallbackLyrics = (
  songId: number,
  fallbackRaw?: string | null
): LyricLineType[] => {
  if (!fallbackRaw) {
    return [];
  }

  const source = fallbackRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

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

const isIgnorableAudioWarning = (err: unknown) =>
  err instanceof Error && /seeking interrupted/i.test(err.message);

const MusicPlayer: React.FC = () => {
  const route = useRoute<MusicPlayerRouteProp>();
  const navigation = useNavigation<MusicPlayerNavProp>();

  const {
    songKey,
    vocalEnabled: initialVocalEnabled,
    isWeeklyChallenge: routeWeeklyFlag,
  } = route.params;

  const [loading, setLoading] = useState(true);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);

  const countdownPurposeRef = useRef<"start" | "resume" | null>(null);
  const hasStartedRecordingRef = useRef(false);
  const initialCountdownTriggeredRef = useRef(false);

  const [animationValue] = useState(new Animated.Value(0));

  const songName = songKey.song_id;
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [lyrics, setLyrics] = useState<LyricLineType[]>([]);
  const [lyricsMessage, setLyricsMessage] = useState<string | null>(
    "Loading lyrics..."
  );
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [lyricsContainerHeight, setLyricsContainerHeight] = useState(0);
  const [lyricsContentHeight, setLyricsContentHeight] = useState(0);
  const lyricsScrollRef = useRef<ScrollView | null>(null);
  const lyricMeasurementsRef = useRef<
    Record<number, { height: number; top: number }>
  >({});
  const lyricAnimationsRef = useRef<Record<number, Animated.Value>>({});
  const previousHighlightRef = useRef(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const vocalSoundRef = useRef<Audio.Sound | null>(null);
  const vocalResumePositionRef = useRef(0);
  const vocalSyncingRef = useRef(false);
  const autoSubmitInProgressRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startRecordingInProgressRef = useRef(false);
  const [metadataReady, setMetadataReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [singer, setSinger] = useState<string | undefined>(undefined);

  const [loadingResult, setLoadingResult] = useState(false);
  const [vocalEnabled, setVocalEnabled] = useState(initialVocalEnabled ?? true);
  const [isWeeklyChallenge, setIsWeeklyChallenge] = useState(
    Boolean(routeWeeklyFlag)
  );
  const [weeklySongCompleted, setWeeklySongCompleted] = useState(false);
  const [minimumOverlayElapsed, setMinimumOverlayElapsed] = useState(false);
  const [shouldDelayOverlay, setShouldDelayOverlay] = useState(false);
  const vocalEnabledRef = useRef(vocalEnabled);
  const isWeeklyChallengeRef = useRef(isWeeklyChallenge);
  const weeklySongCompletedRef = useRef(weeklySongCompleted);
  const [hasVocalTrack, setHasVocalTrack] = useState(false);
  const originalPathRef = useRef<string | null>(songKey.ori_path ?? null);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    vocalEnabledRef.current = vocalEnabled;
  }, [vocalEnabled]);

  useEffect(() => {
    isWeeklyChallengeRef.current = isWeeklyChallenge;
    if (!isWeeklyChallenge) {
      setWeeklySongCompleted(false);
    }
  }, [isWeeklyChallenge]);

  useEffect(() => {
    weeklySongCompletedRef.current = weeklySongCompleted;
  }, [weeklySongCompleted]);

  useEffect(() => {
    setWeeklySongCompleted(false);
  }, [songKey.version_id]);

  useEffect(() => {
    let cancelled = false;

    if (routeWeeklyFlag) {
      if (!isWeeklyChallenge) {
        setIsWeeklyChallenge(true);
      }
      return () => {
        cancelled = true;
      };
    }

    const versionId = songKey?.version_id;
    if (typeof versionId !== "number" || Number.isNaN(versionId)) {
      if (isWeeklyChallenge) {
        setIsWeeklyChallenge(false);
      }
      return () => {
        cancelled = true;
      };
    }

    const checkWeeklyStatus = async () => {
      try {
        const weeklyVersionId = await resolveWeeklyChallengeVersionId();
        if (!cancelled) {
          setIsWeeklyChallenge(
            weeklyVersionId != null && weeklyVersionId === versionId
          );
        }
      } catch (err) {
        if (!cancelled) {
          setIsWeeklyChallenge(false);
        }
      }
    };

    checkWeeklyStatus();

    return () => {
      cancelled = true;
    };
  }, [routeWeeklyFlag, songKey.version_id, isWeeklyChallenge]);

  const triggerCountdown = useCallback(
    (purpose: "start" | "resume") => {
      if (countdown !== null) {
        return;
      }
      countdownPurposeRef.current = purpose;
      setCountdown(3);
    },
    [countdown]
  );

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
          vocalResumePositionRef.current =
            instrumentStatus.positionMillis ?? vocalResumePositionRef.current;
          if ("isPlaying" in vocalStatus && vocalStatus.isPlaying) {
            await vocalSound.pauseAsync();
          }
          return;
        }

        const targetPosition = instrumentStatus.positionMillis ?? 0;

        const difference = Math.abs(
          (vocalStatus.positionMillis ?? 0) - targetPosition
        );
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
          if ("isPlaying" in vocalStatus && !vocalStatus.isPlaying) {
            await vocalSound.playAsync();
          }
        } else if (vocalStatus.isPlaying) {
          await vocalSound.pauseAsync();
        }
      } catch (error) {
        if (!isIgnorableAudioWarning(error)) {
          console.warn("Failed to align vocal track", error);
        }
      }
    },
    [vocalEnabled]
  );

  const syncVocalToInstrument = useCallback(
    async (forcePlay?: boolean, targetVolume?: number) => {
      const instrumentSound = soundRef.current;
      const vocalSound = vocalSoundRef.current;
      if (!instrumentSound || !vocalSound) {
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

        const targetPosition = instrumentStatus.positionMillis ?? 0;
        const desiredPlay =
          typeof forcePlay === "boolean"
            ? forcePlay
            : instrumentStatus.isPlaying === true;
        const desiredVolume =
          typeof targetVolume === "number"
            ? targetVolume
            : desiredPlay
            ? VOCAL_VOLUME
            : 0;

        vocalSyncingRef.current = true;
        try {
          await vocalSound.setStatusAsync({
            positionMillis: targetPosition,
            shouldPlay: desiredPlay,
            volume: desiredVolume,
          });
        } finally {
          vocalSyncingRef.current = false;
        }

        vocalResumePositionRef.current = targetPosition;

        if (desiredPlay) {
          await alignVocalWithInstrument(true, true);
        }
      } catch (error) {
        if (!isIgnorableAudioWarning(error)) {
          console.warn("Failed to sync vocal track", error);
        }
      }
    },
    [alignVocalWithInstrument]
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
          if ("isPlaying" in vocalStatus && vocalStatus.isPlaying) {
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
    setCountdown(null);
    countdownPurposeRef.current = null;
    setIsRecordingPaused(false);
    hasStartedRecordingRef.current = false;
    initialCountdownTriggeredRef.current = false;
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

  const REMOTE_AUDIO_PATTERN = /^https?:\/\//i;

  const loadSoundWithFallback = useCallback(
    async (
      uri: string,
      initialStatus: AVPlaybackStatusToSet = { shouldPlay: false }
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
          initialStatus
        );
      } catch (primaryError) {
        console.warn(
          "Primary audio load failed, retrying with cached copy",
          primaryError
        );

        if (!usedCachedCopy) {
          const localUri = await ensureLocalAudioFile(uri);
          if (localUri && localUri !== candidateUri) {
            return await Audio.Sound.createAsync(
              { uri: localUri },
              initialStatus
            );
          }
        }

        throw primaryError;
      }
    },
    [ensureLocalAudioFile]
  );

  const getAudioById = async () => {
    try {
      setAudioReady(false);
      setCountdown(null);
      countdownPurposeRef.current = null;
      setIsRecordingPaused(false);
      hasStartedRecordingRef.current = false;
      initialCountdownTriggeredRef.current = false;
      await stopAndUnloadCurrentSound();
      const prefetchPromise = consumePrefetchedAudio(songKey.version_id);
      setShouldDelayOverlay(Boolean(prefetchPromise));
      const response = await getAudioVerById(songKey.version_id);
      console.log("GETAUDIOVERBYID", response.data);
      const instrumentUri = buildAssetUri(response.data?.instru_path);
      const vocalUri = buildAssetUri(response.data?.ori_path);
      originalPathRef.current = response.data?.ori_path ?? songKey.ori_path ?? null;
      const playbackUri = instrumentUri ?? vocalUri;

      if (!playbackUri) {
        console.error(
          "Unable to resolve audio URI from response:",
          response.data
        );
        return;
      }

      console.log("Instrumental URI:", instrumentUri);
      console.log("Original URI:", vocalUri);

      let prefetchedAudio: any = null;
      if (prefetchPromise) {
        try {
          prefetchedAudio = await prefetchPromise;
        } catch (err) {
          console.warn("Prefetched audio failed to resolve", err);
          setShouldDelayOverlay(false);
        }
      }

      const resolvedInstrumentUri =
        prefetchedAudio?.localInstrumentUri ??
        prefetchedAudio?.instrumentUri ??
        playbackUri;
      const resolvedVocalUri =
        prefetchedAudio?.localVocalUri ??
        prefetchedAudio?.vocalUri ??
        vocalUri;

      const { sound: newInstrumentSound } = await loadSoundWithFallback(
        resolvedInstrumentUri ?? resolvedVocalUri
      );
      soundRef.current = newInstrumentSound;
      setSound(newInstrumentSound);

      const st = await newInstrumentSound.getStatusAsync();
      if (st.isLoaded && typeof st.durationMillis === "number") {
        setDuration(st.durationMillis / 1000);
      }

      const hasSeparateVocal = Boolean(
        instrumentUri && vocalUri && instrumentUri !== vocalUri
      );
      setHasVocalTrack(hasSeparateVocal);
      setVocalEnabled(hasSeparateVocal);

      if (hasSeparateVocal && vocalUri) {
        try {
          const { sound: vocalSound } = await loadSoundWithFallback(
            resolvedVocalUri ?? vocalUri,
            {
            shouldPlay: false,
            volume: 0.6,
            }
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
            vocalResumePositionRef.current =
              status.positionMillis ?? vocalResumePositionRef.current;
          }
        }

        if (status.didJustFinish) {
          if (isWeeklyChallengeRef.current) {
            setWeeklySongCompleted(true);
          }
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
      setAudioReady(true);
    } catch (e) {
      console.error("Error fetching audio by ID:", e);
      setAudioReady(false);
    }
  };

  const handleFetchLyrics = async (
    song_id: number,
    fallbackRaw?: string | null
  ) => {
    setLyrics([]);
    setLyricsMessage("Loading lyrics...");
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
        setLyricsMessage(null);
        return sortedLyrics;
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
    }

    const fallbackLyrics = buildFallbackLyrics(song_id, fallbackRaw);
    if (fallbackLyrics.length > 0) {
      setLyrics(fallbackLyrics);
      setLyricsMessage(null);
      return fallbackLyrics;
    }

    setLyrics([]);
    setLyricsMessage(LYRICS_UNAVAILABLE_MESSAGE);
    return [];
  };

  useEffect(() => {
    getAudioById();
  }, [songKey.version_id]);

  useEffect(() => {
    if (!hasVocalTrack || !vocalSoundRef.current || !vocalEnabled) {
      return;
    }
    void alignVocalWithInstrument(isPlaying, true);
  }, [alignVocalWithInstrument, hasVocalTrack, isPlaying, vocalEnabled]);

  type InstrumentPlayOptions = {
    forcePlay?: boolean;
    positionMillis?: number;
  };

  const playInstrumental = useCallback(async (options?: InstrumentPlayOptions) => {
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

      const vocalSound = vocalSoundRef.current;
      const shouldPlayVocal = Boolean(vocalSound && vocalEnabledRef.current);
      const forcePlay = options?.forcePlay === true;
      const requestedPosition =
        typeof options?.positionMillis === "number" && Number.isFinite(options.positionMillis)
          ? Math.max(0, options.positionMillis)
          : null;

      if (status.isPlaying && !forcePlay) {
        await currentSound.pauseAsync();
        if (shouldPlayVocal && vocalSound) {
          await vocalSound.pauseAsync();
        }
        return;
      }

      const durationMillis =
        typeof status.durationMillis === "number" ? status.durationMillis : null;
      let startPosition =
        requestedPosition ??
        (typeof status.positionMillis === "number" && status.positionMillis > 0
          ? status.positionMillis
          : 0);

      if (
        durationMillis != null &&
        startPosition >= durationMillis - 250
      ) {
        startPosition = 0;
      }

      const instrumentStatusToSet: AVPlaybackStatusToSet = {
        shouldPlay: true,
        positionMillis: Math.max(0, Math.floor(startPosition)),
      };

      await currentSound.setStatusAsync(instrumentStatusToSet);

      if (shouldPlayVocal && vocalSound) {
        try {
          const vocalStatusToSet: AVPlaybackStatusToSet = {
            shouldPlay: true,
            positionMillis: instrumentStatusToSet.positionMillis,
            volume: VOCAL_VOLUME,
          };
          await vocalSound.setStatusAsync(vocalStatusToSet);
        } catch (vocalError) {
          if (!isIgnorableAudioWarning(vocalError)) {
            console.warn("Failed to align vocal track", vocalError);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
    }
  }, []);

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
      const instrumentStatus = instrumentSound
        ? await instrumentSound.getStatusAsync()
        : null;

      if (!nextEnabled) {
        if (instrumentStatus?.isLoaded) {
          vocalResumePositionRef.current =
            instrumentStatus.positionMillis ?? vocalResumePositionRef.current;
        }
        await syncVocalToInstrument(false, 0);
        return;
      }

      await syncVocalToInstrument(
        instrumentStatus?.isLoaded ? instrumentStatus.isPlaying : undefined,
        VOCAL_VOLUME
      );
    } catch (error) {
      console.warn("Failed to toggle vocal layer", error);
    }
  }, [hasVocalTrack, syncVocalToInstrument, vocalEnabled]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setMetadataReady(false);
    (async () => {
      await handleGetSongById(songKey.song_id);
      if (isActive) {
        setMetadataReady(true);
      }
    })();

    return () => {
      isActive = false;
      cleanupAudioResources();
    };
  }, [cleanupAudioResources, songKey.song_id]);

  useEffect(() => {
    lyricMeasurementsRef.current = {};
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
    if (loading) {
      return;
    }

    if (!shouldDelayOverlay) {
      setMinimumOverlayElapsed(true);
      return;
    }

    if (minimumOverlayElapsed) {
      return;
    }

    const timer = setTimeout(() => {
      setMinimumOverlayElapsed(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading, shouldDelayOverlay, minimumOverlayElapsed]);

  useEffect(() => {
    if (
      !loading &&
      audioReady &&
      sound &&
      countdown === null &&
      !initialCountdownTriggeredRef.current &&
      !recordingRef.current &&
      !recording
    ) {
      initialCountdownTriggeredRef.current = true;
      triggerCountdown("start");
    }
  }, [audioReady, countdown, loading, recording, sound, triggerCountdown]);

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

  const getLineMetrics = useCallback((index: number) => {
    const measurement = lyricMeasurementsRef.current[index];
    if (measurement) {
      return measurement;
    }

    let runningTop = LYRICS_INITIAL_TOP_OFFSET;

    for (let i = 0; i < index; i++) {
      const cached = lyricMeasurementsRef.current[i];
      if (cached) {
        runningTop = cached.top + cached.height + LYRICS_ROW_MARGIN;
      } else {
        runningTop += ESTIMATED_LYRIC_ROW_HEIGHT + LYRICS_ROW_MARGIN;
      }
    }

    return {
      top: runningTop,
      height: ESTIMATED_LYRIC_ROW_HEIGHT,
    };
  }, []);

  const lyricBottomPadding = useMemo(() => {
    if (lyricsContainerHeight <= 0) {
      return 0;
    }
    // Allow enough trailing space for centre alignment without keeping the highlight stuck when nearing the end
    return Math.max(lyricsContainerHeight * 0.45, 140);
  }, [lyricsContainerHeight]);

  const getScrollOffset = useCallback(
    (index: number) => {
      if (lyricsContainerHeight <= 0) {
        return 0;
      }

      const { top, height } = getLineMetrics(index);
      const lineMidpoint = top + height / 2;
      const rawMaxOffset = Math.max(
        lyricsContentHeight - lyricsContainerHeight,
        0
      );
      const middleAnchor = lyricsContainerHeight * 0.5;
      const desiredOffset = lineMidpoint - middleAnchor;

      if (desiredOffset <= 0) {
        return 0;
      }

      const maxCenterAlignedOffset = Math.max(
        rawMaxOffset - lyricBottomPadding,
        0
      );

      if (desiredOffset <= maxCenterAlignedOffset) {
        return desiredOffset;
      }

      const bottomAnchor = lyricsContainerHeight - HIGHLIGHT_BOTTOM_INSET;
      const lineBottom = top + height;
      const bottomLockedOffset = lineBottom - bottomAnchor;

      const clampedOffset = Math.max(
        maxCenterAlignedOffset,
        Math.min(bottomLockedOffset, rawMaxOffset)
      );

      return clampedOffset < 0 ? 0 : clampedOffset;
    },
    [
      getLineMetrics,
      lyricBottomPadding,
      lyricsContainerHeight,
      lyricsContentHeight,
    ]
  );

  const scrollToHighlight = useCallback(
    (index: number, animated = true) => {
      if (index < 0 || !lyricsScrollRef.current || lyricsContainerHeight <= 0) {
        return;
      }

      const targetOffset = getScrollOffset(index);

      requestAnimationFrame(() => {
        lyricsScrollRef.current?.scrollTo({
          y: targetOffset,
          animated,
        });
      });
    },
    [getScrollOffset, lyricsContainerHeight]
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
  }, [
    lyricsContainerHeight,
    lyricsContentHeight,
    highlightIndex,
    scrollToHighlight,
  ]);

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

  useEffect(() => {
    const nextLoading = !(metadataReady && audioReady);
    setLoading((prev) => (prev === nextLoading ? prev : nextLoading));
  }, [metadataReady, audioReady]);


  const micIconName: ComponentProps<typeof Ionicons>["name"] = !recording
    ? "mic"
    : isRecordingPaused
    ? "play"
    : "pause";
  const isMicDisabled =
    countdown !== null ||
    startRecordingInProgressRef.current ||
    loading ||
    !audioReady;

  const startRecording = useCallback(async () => {
    if (startRecordingInProgressRef.current) {
      console.log("Start recording already in progress, skipping");
      return;
    }

    if (recordingRef.current || recording) {
      console.log("Recording already in progress, skipping start request");
      return;
    }

    startRecordingInProgressRef.current = true;

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

      console.log("Preparing recording...");
      const recordingInstance = new Audio.Recording();
      await recordingInstance.prepareToRecordAsync(
        COMPRESSED_RECORDING_OPTIONS
      );
      recordingRef.current = recordingInstance;
      setRecording(recordingInstance);
      setIsRecordingPaused(false);
      if (isWeeklyChallengeRef.current) {
        setWeeklySongCompleted(false);
      }
      hasStartedRecordingRef.current = true;

      console.log("Starting recording and instrumental in sync...");
      await Promise.all([
        recordingInstance.startAsync(),
        playInstrumental({ forcePlay: true, positionMillis: 0 }),
      ]);
      console.log("Recording and instrumental started");
    } catch (err) {
      console.error("Failed to start recording", err);
    } finally {
      startRecordingInProgressRef.current = false;
    }
  }, [playInstrumental, recording]);

  const pauseRecordingSession = useCallback(async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      return;
    }

    try {
      const status = await activeRecording.getStatusAsync();
      if (status.canRecord && status.isRecording) {
        await activeRecording.pauseAsync();
      }
    } catch (err) {
      console.error("Failed to pause recording", err);
    }

    const instrumentSound = soundRef.current;
    if (instrumentSound) {
      try {
        const instrumentStatus = await instrumentSound.getStatusAsync();
        if (instrumentStatus.isLoaded && instrumentStatus.isPlaying) {
          await instrumentSound.pauseAsync();
        }
      } catch (err) {
        console.warn("Failed to pause instrumental playback", err);
      }
    }

    try {
      await stopVocalPlayback(false);
    } catch (err) {
      console.warn("Failed to pause vocal playback", err);
    }

    setIsRecordingPaused(true);
  }, [stopVocalPlayback]);

  const resumeRecording = useCallback(async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      console.warn("No recording available to resume");
      return;
    }

    try {
      const status = await activeRecording.getStatusAsync();
      if (!status.canRecord) {
        console.warn("Recording cannot be resumed: recorder not ready");
        return;
      }

      let targetPositionMillis: number | null = null;
      const instrumentSound = soundRef.current;
      if (instrumentSound) {
        try {
          const instrumentStatus = await instrumentSound.getStatusAsync();
          if (
            instrumentStatus.isLoaded &&
            typeof instrumentStatus.positionMillis === "number"
          ) {
            targetPositionMillis = instrumentStatus.positionMillis;
          }
        } catch (instrumentError) {
          if (!isIgnorableAudioWarning(instrumentError)) {
            console.warn(
              "Failed to read instrumental position before resuming",
              instrumentError
            );
          }
        }
      }

      if (
        targetPositionMillis === null &&
        typeof status.durationMillis === "number"
      ) {
        targetPositionMillis = status.durationMillis;
      }

      const safePosition =
        typeof targetPositionMillis === "number" && Number.isFinite(targetPositionMillis)
          ? Math.max(0, targetPositionMillis)
          : 0;

      if (!status.isRecording) {
        await Promise.all([
          activeRecording.startAsync(),
          playInstrumental({ forcePlay: true, positionMillis: safePosition }),
        ]);
      } else {
        await playInstrumental({ forcePlay: true, positionMillis: safePosition });
      }
      setIsRecordingPaused(false);
    } catch (err) {
      console.error("Failed to resume recording", err);
    }
  }, [playInstrumental]);

  const handleMicPress = useCallback(() => {
    if (countdown !== null) {
      return;
    }

    if (startRecordingInProgressRef.current) {
      return;
    }

    if (!recordingRef.current) {
      if (!hasStartedRecordingRef.current) {
        initialCountdownTriggeredRef.current = true;
        triggerCountdown("start");
      }
      return;
    }

    if (isRecordingPaused) {
      triggerCountdown("resume");
    } else {
      void pauseRecordingSession();
    }
  }, [countdown, isRecordingPaused, pauseRecordingSession, triggerCountdown]);

  useEffect(() => {
    if (countdown === null) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          return prev;
        }

        if (prev <= 1) {
          clearInterval(interval);
          const purpose = countdownPurposeRef.current;
          countdownPurposeRef.current = null;

          if (purpose === "start") {
            void startRecording();
          } else if (purpose === "resume") {
            void resumeRecording();
          }

          return null;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, resumeRecording, startRecording]);

  const stopRecording = async (triggeredByAuto = false) => {
    const activeRecording = recordingRef.current ?? recording;
    if (!activeRecording) {
      return;
    }

    if (
      !triggeredByAuto &&
      isWeeklyChallengeRef.current &&
      !weeklySongCompletedRef.current
    ) {
      console.log(
        "[MusicPlayer] Ignoring manual stop before weekly challenge completes"
      );
      return;
    }

    setIsRecordingPaused(false);
    hasStartedRecordingRef.current = false;
    countdownPurposeRef.current = null;

    if (autoSubmitInProgressRef.current && triggeredByAuto) {
      return;
    }

    if (!autoSubmitInProgressRef.current) {
      autoSubmitInProgressRef.current = true;
    }

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      recordingRef.current = null;
      setRecording(null);

      await stopAndUnloadCurrentSound();

      console.log("Recording stopped and instrumental audio unloaded");

      if (!uri) {
        console.error("Recording URI is null, cannot save file.");
        return;
      }

      const { uri: persistedUri, size } = await persistRecordingFileAsync(uri);
      setRecordingUri(persistedUri);

      if (typeof size === "number") {
        console.log(
          `Recording size: ${bytesToMegabytes(size).toFixed(2)} MB (${size} bytes)`
        );

        if (size > MAX_RECORDING_UPLOAD_BYTES) {
          Alert.alert(
            "Recording Too Large",
            `Your recording exceeds the ${bytesToMegabytes(
              MAX_RECORDING_UPLOAD_BYTES
            ).toFixed(0)} MB upload limit. Please record a shorter take and try again.`
          );
          if (persistedUri !== uri) {
            await deleteFileIfExists(persistedUri);
          }
          setRecordingUri(null);
          return;
        }
      }

      const originalPathForSubmission =
        originalPathRef.current ?? songKey.ori_path ?? null;
      if (!originalPathForSubmission) {
        console.error("No original path available for createRecord submission");
        return;
      }

      setLoadingResult(true);

      const response = await createRecord(
        persistedUri,
        `${songKey.version_id}`,
        songKey.key_signature,
        originalPathForSubmission,
        size ?? undefined
      );

      const responseData = response.data;

      if (!response.success) {
        Alert.alert(
          "Upload Failed",
          response.message ??
            response.msg ??
            "Could not upload your recording. Please record a shorter take and try again."
        );
        return;
      }

      if (
        !responseData ||
        typeof responseData.score !== "number" ||
        Number.isNaN(responseData.score)
      ) {
        console.error("No valid score returned from backend:", response);
        Alert.alert(
          "Scoring Error",
          "We could not retrieve a score for your recording. Please try again."
        );
        return;
      }

      navigation.navigate("Result", {
        score: responseData.score,
        song_id: songKey.song_id,
        recordId: responseData.recordId,
        version_id: songKey.version_id,
        localUri: persistedUri,
      });
      console.log("Navigated to Result screen successfully");
    } catch (err) {
      console.error("Error in stopRecording:", err);
    } finally {
      setLoadingResult(false);
      autoSubmitInProgressRef.current = false;
      console.log("stopRecording process completed.");
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const confirmShouldBeHidden =
    isWeeklyChallenge && Boolean(recording) && !weeklySongCompleted;
  const confirmButtonDisabled = !recording;

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
        source={{ uri: buildAssetUri(image) ?? FALLBACK_COVER }}
        style={styles.bgImage}
        resizeMode="cover"
        blurRadius={18}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.loadingContainer}>
          <Ionicons name="headset" size={72} color="#FFFFFF" />
          <Text style={styles.loadingTitle}>Use Headphones</Text>
          <Text style={styles.loadingMessage}>
            Plug in for clearer vocals, better pitch tracking, and the smoothest
            Singo session.
          </Text>
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
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Image source={{ uri: resolvedCover }} style={styles.albumArt} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.songTitle}>{title}</Text>
            <Text style={styles.artist}>{singer}</Text>
          </View>
        </View>

        <View style={styles.lyricsWrapper} onLayout={handleLyricsLayout}>
          {lyrics.length > 0 ? (
            <ScrollView
              ref={lyricsScrollRef}
              contentContainerStyle={[
                styles.lyricsContainer,
                lyricBottomPadding > 0 && {
                  paddingBottom: lyricBottomPadding,
                },
              ]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={handleContentSizeChange}
            >
              {lyrics.map((line, index) => {
                const isActive = index === highlightIndex;
                const animation = ensureLineAnimation(index);
                const rowAnimatedStyle = {
                  backgroundColor: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      "rgba(255,255,255,0)",
                      "rgba(255,255,255,0.28)",
                    ],
                  }),
                  borderRadius: 18,
                  transform: [
                    {
                      scale: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.01],
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
                      const { height, y } = event.nativeEvent.layout;
                      if (height > 0) {
                        const previous = lyricMeasurementsRef.current[index];
                        const hasMeaningfulChange =
                          !previous ||
                          Math.abs(previous.height - height) > 1 ||
                          Math.abs(previous.top - y) > 1;

                        if (hasMeaningfulChange) {
                          lyricMeasurementsRef.current[index] = {
                            height,
                            top: y,
                          };
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
            <View style={styles.lyricsPlaceholder}>
              <Text style={styles.lyricsPlaceholderText}>
                {lyricsMessage ?? "Loading lyrics..."}
              </Text>
            </View>
          )}
        </View>

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

        <View style={styles.controls}>
          {/* Placeholder button (left) */}
          <View style={styles.vocalToggle}>
            <MaterialIcons
              name="record-voice-over"
              size={28}
              color="transparent"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.micButton,
              isMicDisabled && styles.micButtonDisabled,
            ]}
            onPress={handleMicPress}
            disabled={isMicDisabled}
            activeOpacity={0.8}
          >
            <Ionicons
              name={micIconName}
              size={50}
              color={isMicDisabled ? "rgba(255,255,255,0.6)" : "white"}
            />
          </TouchableOpacity>

          {confirmShouldBeHidden ? (
            <View
              style={[styles.confirmButton, styles.confirmHiddenPlaceholder]}
              pointerEvents="none"
            >
              <MaterialIcons name="done" size={28} color="transparent" />
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => stopRecording()}
              disabled={confirmButtonDisabled}
              style={[
                styles.confirmButton,
                confirmButtonDisabled && styles.confirmDisabled,
              ]}
            >
              <MaterialIcons name="done" size={28} color="white" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.animationContainer}>
          {[...Array(5)].map((_, index) => (
            <Animated.View
              key={index}
              style={[styles.animatedBar, animatedBarStyle]}
            />
          ))}
        </View>
      </SafeAreaView>

      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

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
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  loadingContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 24,
  },
  loadingTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  loadingMessage: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.85,
    lineHeight: 20,
    maxWidth: 260,
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
    height: "50%",
    justifyContent: "flex-start",
    width: "90%",
    marginTop: 32,
    overflow: "hidden",
  },
  lyricsContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  lyricsPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  lyricsPlaceholderText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    textAlign: "center",
  },
  lyricRow: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginVertical: 6,
    backgroundColor: "transparent",
  },
  lyrics: {
    color: "rgba(255, 255, 255, 0.65)",
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
    // backgroundColor: "rgba(107, 107, 107, 0.5)",
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
  micButtonDisabled: {
    opacity: 0.6,
  },
  confirmButton: {
    backgroundColor: "rgba(107, 107, 107, 0.5)",
    padding: 12,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmHiddenPlaceholder: {
    backgroundColor: "transparent",
    opacity: 0,
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
