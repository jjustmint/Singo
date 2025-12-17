import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  type AudioMode,
} from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getAudioVerById } from '@/api/song/getAudioById';
import { getAllsongs } from '@/api/song/getAll';
import { getRecordById, RecordType } from '@/api/getRecordById';
import type { SongType as ApiSongType } from '@/api/types/song';
import { buildAssetUri } from '@/util/assetUri';
import { previewBus } from '@/util/previewBus';
import type { RootStackParamList } from '@/types/Navigation';
import type { SongType as NavigationSongType } from '@/types/Song';

interface Song {
  id: number;
  image: string;
  songName: string;
  artist: string;
  playCount: number;
  preview: string | null;
  versionId: number | null;
  keySignature: string | null;
  key_signature?: string | null;
}

const FALLBACK_COVER = 'https://via.placeholder.com/150';

const CACHE_KEY = 'toprate:global-v1';
const CACHE_TTL_MS = 1000 * 30;
const REALTIME_REFRESH_INTERVAL_MS = 1000 * 15;
const REALTIME_PROBE_RANGE = 12;
const INITIAL_RECORD_SEARCH_LIMIT = 20000;
const MAX_RECORD_SCAN_RANGE = 40000;
const MAX_TOTAL_SCAN_RANGE = MAX_RECORD_SCAN_RANGE * 5;
const RECORD_FETCH_BATCH_SIZE = 25;
const VERSION_FETCH_BATCH_SIZE = 25;
const MAX_TRAILING_GAP = 2000;

type RecordSummary = {
  record_id: number;
  version_id: number;
  user_id: number | null;
};

const isIgnorableAudioError = (err: unknown) =>
  err instanceof Error && /seeking interrupted/i.test(err.message);

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;
export const TopRateTabs: React.FC<{
  song: Song;
  index: number;
  onToggle: (song: Song) => void;
  isPlaying: boolean;
  isLoading: boolean;
  userKey?: string | null;
}> = ({ song, index, onToggle, isPlaying, isLoading, userKey }) => {
  const navigation = useNavigation<NavigationProp>();
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankColor = rankColors[index] || '#fff';
  const rankSize = index < 3 ? 50 - index * 4 : 25;
  const imageUri = useMemo(() => song.image || FALLBACK_COVER, [song.image]);

  const handleCardPress = useCallback(() => {
    previewBus.emit({ source: 'toprate-card' });

    const navigationSong: NavigationSongType = {
      id: song.id.toString(),
      songName: song.songName,
      artist: song.artist,
      image: imageUri,
      previewUrl: song.preview ?? undefined,
      key_signature: song.key_signature ?? song.keySignature ?? undefined,
      keySignature: song.keySignature ?? song.key_signature ?? undefined,
    };

    navigation.navigate('ChooseKey', {
      song: navigationSong,
      userKey,
      versionId: song.versionId ?? undefined,
    });
  }, [
    imageUri,
    navigation,
    song.artist,
    song.id,
    song.keySignature,
    song.key_signature,
    song.preview,
    song.songName,
    song.versionId,
    userKey,
  ]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.rank, { color: rankColor, fontSize: rankSize }]}>
        {index + 1}
      </Text>

      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.rightContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.songName} numberOfLines={1}>
            {song.songName}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
          <Text style={styles.playCount} numberOfLines={1}>
            Played {song.playCount} {song.playCount === 1 ? 'time' : 'times'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.iconButton,
            isLoading && styles.iconButtonDisabled,
            !song.preview && styles.iconButtonUnavailable,
          ]}
          onPress={(event) => {
            event.stopPropagation();
            onToggle(song);
          }}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#5E72FC" />
          ) : (
            <FontAwesome
              name={isPlaying ? 'pause' : 'play'}
              size={16}
              color="#5E72FC"
            />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const TopRateScreen: React.FC<{ userKey?: string | null; refreshToken?: number }> = ({
  userKey,
  refreshToken,
}) => {
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewCacheRef = useRef<Map<number, string>>(new Map());
  const lastMaxRecordIdRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    let loadInFlight = false;
    const forceRefresh = typeof refreshToken === 'number' && refreshToken > 0;

    type CachePayload = {
      timestamp: number;
      data: Song[];
      maxRecordId?: number;
    };

    const loadCache = async (): Promise<CachePayload | null> => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CachePayload;
      } catch (err) {
        console.warn('Failed to read top rate cache', err);
        return null;
      }
    };

    const saveCache = async (payload: CachePayload) => {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn('Failed to persist top rate cache', err);
      }
    };

    const normalizeNumber = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const computeGlobalTopSongs = async (): Promise<{ songs: Song[]; maxRecordId: number }> => {
      previewCacheRef.current.clear();

      const recordCache = new Map<number, RecordSummary | null>();
      let networkErrorLogged = 0;

      const fetchRecord = async (recordId: number): Promise<RecordSummary | null> => {
        if (recordCache.has(recordId)) {
          return recordCache.get(recordId) ?? null;
        }

        try {
          const response = await getRecordById(recordId, { suppressLog: true });
          if (!response.success || !response.data) {
            recordCache.set(recordId, null);
            return null;
          }

          const payload = response.data as RecordType & Record<string, unknown>;
          const normalizedRecordId = normalizeNumber(payload.record_id ?? payload.recordId);
          const normalizedVersionId = normalizeNumber(payload.version_id ?? payload.versionId);
          const normalizedUserId = normalizeNumber(payload.user_id ?? payload.userId);

          if (normalizedRecordId == null || normalizedVersionId == null) {
            recordCache.set(recordId, null);
            return null;
          }

          const summary: RecordSummary = {
            record_id: normalizedRecordId,
            version_id: normalizedVersionId,
            user_id: normalizedUserId,
          };

          recordCache.set(recordId, summary);
          return summary;
        } catch (err) {
          if (networkErrorLogged < 3) {
            console.warn(`Failed to fetch record ${recordId}`, err);
            networkErrorLogged += 1;
          }
          recordCache.set(recordId, null);
          return null;
        }
      };

      const fetchRecordBatch = async (ids: number[]) => {
        const results = await Promise.all(ids.map((id) => fetchRecord(id)));
        return results;
      };

      const findFirstExistingRecordId = async (): Promise<number | null> => {
        let searchLimit = INITIAL_RECORD_SEARCH_LIMIT;

        while (searchLimit <= INITIAL_RECORD_SEARCH_LIMIT * 8) {
          for (let start = 1; start <= searchLimit; start += RECORD_FETCH_BATCH_SIZE) {
            const ids = Array.from({ length: RECORD_FETCH_BATCH_SIZE }, (_, idx) => start + idx);
            const results = await fetchRecordBatch(ids);
            const firstIndex = results.findIndex((item) => item != null);
            if (firstIndex !== -1) {
              return ids[firstIndex];
            }
          }

          searchLimit *= 2;
        }

        return null;
      };

      const firstRecordId = await findFirstExistingRecordId();
      if (firstRecordId == null) {
        return { songs: [], maxRecordId: 0 };
      }

      const startId = firstRecordId;
      const records: RecordSummary[] = [];
      let lastSuccessId = startId - 1;

      let upperBound = startId + MAX_RECORD_SCAN_RANGE;
      let currentStart = startId;

      while (currentStart <= upperBound) {
        const ids = Array.from({ length: RECORD_FETCH_BATCH_SIZE }, (_, idx) => currentStart + idx);
        const results = await fetchRecordBatch(ids);
        results.forEach((record) => {
          if (record) {
            records.push(record);
            lastSuccessId = Math.max(lastSuccessId, record.record_id);
          }
        });
        const highestCheckedId = ids[ids.length - 1];
        if (highestCheckedId - lastSuccessId >= MAX_TRAILING_GAP) {
          break;
        }
        currentStart += RECORD_FETCH_BATCH_SIZE;
        const scannedRange = highestCheckedId - startId;
        const closeToUpperBound = currentStart > upperBound && upperBound - lastSuccessId <= MAX_TRAILING_GAP;
        if (closeToUpperBound && scannedRange <= MAX_TOTAL_SCAN_RANGE) {
          upperBound += MAX_RECORD_SCAN_RANGE;
        }
        if (scannedRange >= MAX_TOTAL_SCAN_RANGE) {
          break;
        }
      }

      if (!records.length) {
        return { songs: [], maxRecordId: 0 };
      }

      const allSongsRes = await getAllsongs();
      const allSongs: ApiSongType[] =
        (allSongsRes.success && Array.isArray(allSongsRes.data) ? allSongsRes.data : []) ?? [];

      const songLookup = new Map<number, ApiSongType>();
      allSongs.forEach((song) => {
        songLookup.set(song.song_id, song);
      });

      const versionCounts = new Map<number, number>();
      records.forEach((record) => {
        if (typeof record.version_id === 'number') {
          versionCounts.set(
            record.version_id,
            (versionCounts.get(record.version_id) ?? 0) + 1,
          );
        }
      });

      if (!versionCounts.size) {
        const highestRecordId = records.reduce<number>((max, item) => Math.max(max, item.record_id), 0);
        return { songs: [], maxRecordId: highestRecordId };
      }

      const uniqueVersionIds = Array.from(versionCounts.keys());
      const versionToSongId = new Map<number, number>();
      const versionPreviewMap = new Map<number, string>();

      for (let i = 0; i < uniqueVersionIds.length; i += VERSION_FETCH_BATCH_SIZE) {
        const batch = uniqueVersionIds.slice(i, i + VERSION_FETCH_BATCH_SIZE);
        const responses = await Promise.all(
          batch.map(async (versionId) => {
            try {
              const res = await getAudioVerById(versionId);
              return { versionId, res };
            } catch (err) {
              console.warn(`Failed to fetch audio version ${versionId}`, err);
              return { versionId, res: null };
            }
          })
        );

        responses.forEach(({ versionId, res }) => {
          const songId = normalizeNumber(res?.data?.song_id);
          if (res?.success && songId != null) {
            versionToSongId.set(versionId, songId);
            const payload = res?.data as Record<string, unknown> | undefined;
            const previewCandidate =
              buildAssetUri(
                (payload?.preview_path as string | null) ??
                  (payload?.preview as string | null) ??
                  res.data?.ori_path ??
                  res.data?.instru_path
              ) ?? null;
            if (previewCandidate) {
              versionPreviewMap.set(versionId, previewCandidate);
            }
          }
        });
      }

      type Aggregate = {
        playCount: number;
        topVersionId: number | null;
        topVersionCount: number;
        preview: string | null;
      };

      const songAggregates = new Map<number, Aggregate>();

      versionCounts.forEach((count, versionId) => {
        const songId = versionToSongId.get(versionId);
        if (songId == null) {
          return;
        }

        const existing = songAggregates.get(songId) ?? {
          playCount: 0,
          topVersionId: null,
          topVersionCount: 0,
          preview: null,
        };

        existing.playCount += count;

        const previewCandidate = versionPreviewMap.get(versionId) ?? existing.preview;
        if (!existing.preview && previewCandidate) {
          existing.preview = previewCandidate;
        }

        if (existing.topVersionId == null || count > existing.topVersionCount) {
          existing.topVersionId = versionId;
          existing.topVersionCount = count;
          if (previewCandidate) {
            existing.preview = previewCandidate;
          }
        }

        songAggregates.set(songId, existing);
      });

      if (!songAggregates.size) {
        const highestRecordId = records.reduce<number>((max, item) => Math.max(max, item.record_id), 0);
        return { songs: [], maxRecordId: highestRecordId };
      }

      const mappedSongs: Song[] = Array.from(songAggregates.entries())
        .map(([songId, aggregate]) => {
          const song = songLookup.get(songId);
          if (!song) {
            return null;
          }
          const image = buildAssetUri(song.album_cover) ?? FALLBACK_COVER;
          const directPreview = buildAssetUri(song.previewsong);
          if (directPreview) {
            previewCacheRef.current.set(song.song_id, directPreview);
          }
          const preview =
            directPreview ??
            aggregate.preview ??
            previewCacheRef.current.get(song.song_id) ??
            null;
          if (preview) {
            previewCacheRef.current.set(song.song_id, preview);
          }
          return {
            id: song.song_id,
            image,
            songName: song.title,
            artist: song.singer ?? 'Unknown Artist',
            playCount: aggregate.playCount,
            preview,
            versionId: aggregate.topVersionId ?? null,
            keySignature: typeof song.key_signature === 'string' ? song.key_signature : null,
            key_signature: typeof song.key_signature === 'string' ? song.key_signature : null,
          };
        })
        .filter(Boolean) as Song[];

      mappedSongs.sort((a, b) => b.playCount - a.playCount);

      const highestRecordId = records.reduce<number>((max, item) => Math.max(max, item.record_id), 0);

      return { songs: mappedSongs.slice(0, 10), maxRecordId: highestRecordId };
    };

    const probeForNewRecords = async (baseline: number): Promise<boolean> => {
      if (baseline <= 0) {
        return true;
      }

      const startId = baseline + 1;
      const ids = Array.from({ length: REALTIME_PROBE_RANGE }, (_, idx) => startId + idx);
      const probes = await Promise.all(
        ids.map(async (recordId) => {
          try {
            const res = await getRecordById(recordId, { suppressLog: true });
            return Boolean(res?.success && res?.data);
          } catch {
            return false;
          }
        })
      );

      return probes.some(Boolean);
    };

    type LoadOptions = {
      forceNetwork?: boolean;
      probeForChanges?: boolean;
      showSpinner?: boolean;
    };

    const load = async (options: LoadOptions = {}) => {
      if (loadInFlight) {
        return;
      }

      const { forceNetwork = false, probeForChanges = false, showSpinner = false } = options;
      const shouldForceNetwork = forceRefresh || forceNetwork;
      loadInFlight = true;

      try {
        if (showSpinner) {
          setLoading(true);
        }

        if (probeForChanges && lastMaxRecordIdRef.current > 0) {
          const hasNewRecords = await probeForNewRecords(lastMaxRecordIdRef.current);
          if (!hasNewRecords) {
            return;
          }
        }
        setError(null);

        const cached = await loadCache();
        const cacheIsFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;

        if (cached?.data && Array.isArray(cached.data) && !cancelled) {
          const sanitized = cached.data.map((item) => {
            const normalizedPreview = typeof item.preview === 'string' ? item.preview : null;
            const normalizedVersionId =
              typeof item.versionId === 'number' && Number.isFinite(item.versionId)
                ? item.versionId
                : null;
            const normalizedKey =
              typeof item.keySignature === 'string' && item.keySignature.trim().length > 0
                ? item.keySignature
                : typeof item.key_signature === 'string' && item.key_signature.trim().length > 0
                  ? item.key_signature
                  : null;
            return {
              ...item,
              preview: normalizedPreview,
              versionId: normalizedVersionId,
              keySignature: normalizedKey,
              key_signature: normalizedKey,
            };
          });
          previewCacheRef.current.clear();
          sanitized.forEach((item) => {
            if (item.preview) {
              previewCacheRef.current.set(item.id, item.preview);
            }
          });
          const cachedMaxRecordId =
            typeof cached.maxRecordId === 'number' && Number.isFinite(cached.maxRecordId)
              ? cached.maxRecordId
              : 0;
          lastMaxRecordIdRef.current = cachedMaxRecordId;
          setTopSongs(sanitized);
          const cacheHasPreviews = sanitized.some((item) => item.preview || item.versionId != null);
          const cacheHasKeys = sanitized.some(
            (item) =>
              typeof item.keySignature === 'string' ||
              typeof item.key_signature === 'string'
          );
          if (cacheIsFresh && cacheHasPreviews && cacheHasKeys && !shouldForceNetwork) {
            return;
          }
        }

        const { songs, maxRecordId } = await computeGlobalTopSongs();

        if (!cancelled) {
          lastMaxRecordIdRef.current = maxRecordId;
          setTopSongs(songs);
          await saveCache({ timestamp: Date.now(), data: songs, maxRecordId });
        }
      } catch (err) {
        console.error('Top rate load error:', err);
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load top songs. Please try again later.';
          setError(message);
        }
      } finally {
        loadInFlight = false;
        if (showSpinner && !cancelled) {
          setLoading(false);
        }
      }
    };

    const initialOptions: LoadOptions = forceRefresh
      ? { showSpinner: true, forceNetwork: true }
      : { showSpinner: true };

    load(initialOptions).catch(() => undefined);

    if (REALTIME_REFRESH_INTERVAL_MS > 0) {
      refreshTimer = setInterval(() => {
        if (!cancelled) {
          load({ forceNetwork: true, probeForChanges: true }).catch(() => undefined);
        }
      }, REALTIME_REFRESH_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [refreshToken]);

  const stopPlayback = useCallback(async () => {
    const currentSound = soundRef.current;
    if (!currentSound) return;

    try {
      currentSound.setOnPlaybackStatusUpdate(null);
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        await currentSound.stopAsync();
      }
    } catch (err) {
      if (!isIgnorableAudioError(err)) {
        console.warn('Unable to stop preview cleanly', err);
      }
    }

    try {
      await currentSound.unloadAsync();
    } catch (err) {
      if (!isIgnorableAudioError(err)) {
        console.warn('Unable to unload preview sound', err);
      }
    }

    soundRef.current = null;
    setPlayingId(null);
  }, []);

  const handleTogglePreview = useCallback(
    async (song: Song) => {
      if (loadingPreviewId !== null && loadingPreviewId !== song.id) {
        return;
      }

      if (playingId === song.id) {
        await stopPlayback();
        return;
      }

      setLoadingPreviewId(song.id);

      try {
        previewBus.emit({ source: 'toprate' });
        await stopPlayback();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        } as Partial<AudioMode>);

        let previewUri =
          song.preview ??
          previewCacheRef.current.get(song.id) ??
          null;

        if (!previewUri && song.versionId != null) {
          try {
            const res = await getAudioVerById(song.versionId);
            if (res.success) {
              const payload = res?.data as Record<string, unknown> | undefined;
              const candidate =
                buildAssetUri(
                  (payload?.preview_path as string | null) ??
                    (payload?.preview as string | null) ??
                    res.data?.ori_path ??
                    res.data?.instru_path
                ) ?? null;
              if (candidate) {
                previewCacheRef.current.set(song.id, candidate);
                previewUri = candidate;
              }
            }
          } catch (err) {
            console.warn('Failed to fetch audio version for preview', err);
          }
        }

        if (!previewUri) {
          try {
            const allSongsRes = await getAllsongs();
            if (allSongsRes.success && Array.isArray(allSongsRes.data)) {
              const match = allSongsRes.data.find(
                (item) => item?.song_id === song.id
              );
              const candidate = buildAssetUri(
                (match as ApiSongType | undefined)?.previewsong ?? null
              );
              if (candidate) {
                previewCacheRef.current.set(song.id, candidate);
                previewUri = candidate;
              }
            }
          } catch (err) {
            console.warn('Failed to fetch songs for preview fallback', err);
          }
        }

        if (!previewUri) {
          Alert.alert(
            'Preview unavailable',
            'This song does not have a preview yet.'
          );
          return;
        }

        if (previewUri && song.preview !== previewUri) {
          previewCacheRef.current.set(song.id, previewUri);
          setTopSongs((prev) =>
            prev.map((item) =>
              item.id === song.id ? { ...item, preview: previewUri } : item
            )
          );
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: previewUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setPlayingId(song.id);

        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (!status.isLoaded) {
            return;
          }

          if (status.didJustFinish) {
            await stopPlayback();
          }
        });
      } catch (err) {
        console.error('Failed to play preview', err);
        await stopPlayback();
      } finally {
        setLoadingPreviewId(null);
      }
    },
    [loadingPreviewId, playingId, stopPlayback]
  );

  useEffect(() => {
    return () => {
      stopPlayback().catch(() => undefined);
    };
  }, [stopPlayback]);

  useEffect(() => {
    const remove = previewBus.addListener((payload) => {
      if (payload?.source === 'toprate') {
        return;
      }
      stopPlayback().catch(() => undefined);
    });

    return () => {
      remove();
    };
  }, [stopPlayback]);

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          {error ?? 'No playback data available yet. Check back soon for popular songs!'}
        </Text>
      </View>
    );
  }, [loading, error]);

  return (
    <FlatList
      data={topSongs}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item, index }) => (
        <TopRateTabs
          song={item}
          index={index}
          onToggle={handleTogglePreview}
          isPlaying={playingId === item.id}
          isLoading={loadingPreviewId === item.id}
          userKey={userKey}
        />
      )}
      contentContainerStyle={{ paddingBottom: 20 }}
      nestedScrollEnabled={true}
      ListEmptyComponent={listEmptyComponent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    marginVertical: 10,
    elevation: 1,
  },
  rank: {
    width: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    marginRight: 8,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 12,
  },
  rightContainer: {
    flex: 1,
    justifyContent: 'space-between',
    flexDirection: 'column',
    height: 96,
    position: 'relative',
  },
  textContainer: {
    marginBottom: 10,
  },
  songName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  artist: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 2,
  },
  playCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  iconButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: 50,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  iconButtonUnavailable: {
    opacity: 0.6,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#bbb',
    textAlign: 'center',
  },
});

export default TopRateScreen;
