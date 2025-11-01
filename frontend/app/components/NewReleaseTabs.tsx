import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Alert,
  GestureResponderEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { getLatestSongs } from '@/api/song/getLatest';
import { getAllsongs } from '@/api/song/getAll';
import { GlobalConstant } from '@/constant';
import type { SongType as ApiSongType } from '@/api/types/song';
import { previewBus } from '@/util/previewBus';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../Types/Navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_SPACING = 20;
const STEP = CARD_WIDTH + CARD_SPACING;
const VISIBLE_INDEX = 5;
const AUTO_SCROLL_INTERVAL = 5000;
const RESET_ANIMATION_DELAY = 650;
const FALLBACK_IMAGE = 'https://placehold.co/400x400?text=Singo';

type ReleaseSong = {
  id: string;
  name: string;
  singer: string;
  image: string;
  preview: string | null;
  keySignature: string | null;
  key_signature?: string | null;
};

const toMediaUri = (path?: string | null) => {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const sanitized = path.replace(/^\/?data\//, '').replace(/^\/+/, '');
  return encodeURI(`${GlobalConstant.API_URL}/${sanitized}`);
};

const mapSongToRelease = (song: ApiSongType): ReleaseSong => {
  const resolvedKey =
    typeof song.key_signature === 'string' && song.key_signature.trim().length > 0
      ? song.key_signature
      : null;

  return {
    id: song.song_id.toString(),
    name: song.title,
    singer: song.singer ?? 'Unknown Artist',
    image: toMediaUri(song.album_cover) ?? FALLBACK_IMAGE,
    preview: toMediaUri(song.previewsong),
    keySignature: resolvedKey,
    key_signature: resolvedKey,
  };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

const LATEST_LIMIT = 5;

type NewReleaseTabsProps = {
  userKey?: string | null;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
};

const NewReleaseTabs: React.FC<NewReleaseTabsProps> = ({ userKey }) => {
  const flatListRef = useRef<FlatList>(null);
  const positionIndex = useRef(VISIBLE_INDEX);
  const [liked, setLiked] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentPreviewIdRef = useRef<string | null>(null);
  const rotationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [songs, setSongs] = useState<ReleaseSong[]>([]);
  const [loading, setLoading] = useState(true);
  const offsetRef = useRef(STEP * VISIBLE_INDEX);
  const navigation = useNavigation<NavigationProp>();

  const isIgnorableAudioError = useCallback(
    (err: unknown) =>
      err instanceof Error && /seeking interrupted/i.test(err.message),
    []
  );

  const unloadCurrentSound = useCallback(async () => {
    const currentSound = soundRef.current;
    if (!currentSound) {
      return;
    }

    try {
      currentSound.setOnPlaybackStatusUpdate(null);
      await currentSound.stopAsync();
    } catch (err) {
      if (!isIgnorableAudioError(err)) {
        console.warn('Unable to stop current preview cleanly:', err);
      }
    }

    try {
      await currentSound.unloadAsync();
    } catch (err) {
      if (!isIgnorableAudioError(err)) {
        console.warn('Unable to unload current preview cleanly:', err);
      }
    }

    soundRef.current = null;
    currentPreviewIdRef.current = null;
  }, [isIgnorableAudioError]);

  const toggleLike = (id: string) => {
    setLiked((prev) =>
      prev.includes(id) ? prev.filter((songId) => songId !== id) : [...prev, id]
    );
  };

  const stopRotation = useCallback(() => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
  }, []);

  const handleNavigateToChooseKey = useCallback(
    async (song: ReleaseSong) => {
      previewBus.emit({ source: 'newrelease' });
      await unloadCurrentSound();
      stopRotation();
      navigation.navigate('ChooseKey', {
        song: {
          id: song.id,
          songName: song.name,
          artist: song.singer,
          image: song.image,
          key_signature: song.key_signature ?? song.keySignature ?? undefined,
          keySignature: song.keySignature ?? song.key_signature ?? undefined,
        },
        userKey,
      });
    },
    [navigation, stopRotation, unloadCurrentSound, userKey]
  );

  const loopedSongs = useMemo(() => {
    if (!songs.length) {
      return [];
    }
    return [...songs, ...songs, ...songs];
  }, [songs]);

  useEffect(() => {
    if (!loopedSongs.length) {
      return;
    }
    const initialIndex = Math.min(VISIBLE_INDEX, loopedSongs.length - 1);
    positionIndex.current = initialIndex;
    offsetRef.current = STEP * initialIndex;
    flatListRef.current?.scrollToOffset({
      offset: offsetRef.current,
      animated: false,
    });
  }, [loopedSongs.length]);

  const resetPosition = useCallback(
    (forceCenter = false) => {
      if (!loopedSongs.length) return;

      const maxIndex = Math.max(loopedSongs.length - 1, 0);

      if (forceCenter) {
        positionIndex.current = Math.min(VISIBLE_INDEX, maxIndex);
      } else {
        if (positionIndex.current > maxIndex) {
          positionIndex.current = maxIndex;
        } else if (positionIndex.current < 0) {
          positionIndex.current = 0;
        }
      }

      try {
        offsetRef.current = STEP * positionIndex.current;
        flatListRef.current?.scrollToOffset({
          offset: offsetRef.current,
          animated: false,
        });
      } catch (err) {
        console.warn('Failed to reset new release carousel position', err);
      }
    },
    [loopedSongs.length]
  );

  const startRotation = useCallback(() => {
    if (!loopedSongs.length) {
      stopRotation();
      return;
    }

    if (rotationIntervalRef.current) {
      return;
    }

    rotationIntervalRef.current = setInterval(() => {
      positionIndex.current += 1;
      offsetRef.current = STEP * positionIndex.current;

      flatListRef.current?.scrollToOffset({
        offset: offsetRef.current,
        animated: true,
      });

      const boundaryIndex = loopedSongs.length - VISIBLE_INDEX - 1;
      if (positionIndex.current >= boundaryIndex) {
        const resetIndex = Math.min(VISIBLE_INDEX, loopedSongs.length - 1);
        positionIndex.current = resetIndex;
        offsetRef.current = STEP * resetIndex;

        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: offsetRef.current,
            animated: false,
          });
        }, RESET_ANIMATION_DELAY);
      }
    }, AUTO_SCROLL_INTERVAL);
  }, [loopedSongs, stopRotation]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: STEP,
      offset: STEP * index,
      index,
    }),
    []
  );

  const playOrPause = async (item: ReleaseSong) => {
    if (!item.preview) {
      console.warn('Preview not available for this song');
      return;
    }

    if (previewLoadingId && previewLoadingId !== item.id) {
      console.log('Preview already loading for another song, please wait.');
      return;
    }

    const currentSound = soundRef.current;
    const isCurrent = currentSound && currentPreviewIdRef.current === item.id;

    if (isCurrent && currentSound) {
      try {
        const status = await currentSound.getStatusAsync();
        if (!status.isLoaded) {
          await unloadCurrentSound();
          setPlayingId(null);
          return;
        }

        if (status.isPlaying) {
          await currentSound.pauseAsync();
          setPlayingId(null);
          startRotation();
        } else {
          stopRotation();
          setPreviewLoadingId(item.id);
          previewBus.emit({ source: 'newrelease' });
          await currentSound.playAsync();
          setPlayingId(item.id);
          setPreviewLoadingId(null);
          return;
        }
      } catch (error) {
        console.error('Failed to toggle preview playback:', error);
        await unloadCurrentSound();
        setPlayingId(null);
      } finally {
        setPreviewLoadingId(null);
      }
      return;
    }

    previewBus.emit({ source: 'newrelease' });
    await unloadCurrentSound();

    try {
      setPreviewLoadingId(item.id);
      console.log('Attempting to play preview for song:', item.name, '\nURI:', item.preview);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const statusHandler = (status: AVPlaybackStatus) => {
        if (currentPreviewIdRef.current !== item.id) {
          return;
        }

        if (status.isLoaded) {
          console.log('Preview status update:', {
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
            isPlaying: status.isPlaying,
            didJustFinish: status.didJustFinish,
          });

          if (status.isPlaying) {
            setPreviewLoadingId((loading) => (loading === item.id ? null : loading));
            setPlayingId(item.id);
            stopRotation();
          }
        } else if ('error' in status) {
          console.error('Preview playback error:', status.error);
        }

        if (status.isLoaded && status.didJustFinish) {
          setPreviewLoadingId((loading) => (loading === item.id ? null : loading));
          setPlayingId(null);
          startRotation();
          unloadCurrentSound().catch((err) =>
            console.error('Failed to unload finished preview', err)
          );
        } else if (!status.isLoaded && 'error' in status) {
          console.error('Preview playback error:', status.error);
          setPreviewLoadingId((loading) => (loading === item.id ? null : loading));
          setPlayingId(null);
          startRotation();
          unloadCurrentSound().catch((err) =>
            console.error('Failed to unload errored preview', err)
          );
        }
      };

      const sound = new Audio.Sound();
      soundRef.current = sound;
      currentPreviewIdRef.current = item.id;
      sound.setOnPlaybackStatusUpdate(statusHandler);

      const status = await sound.loadAsync(
        { uri: item.preview },
        {
          shouldPlay: true,
          positionMillis: 0,
          volume: 1,
          rate: 1,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 250,
        },
        false
      );

      console.log('Preview loaded status:', status);

      if (!status.isLoaded) {
        throw new Error('Preview sound failed to load');
      }

      stopRotation();
      if (status.isPlaying) {
        setPlayingId(item.id);
      }
    } catch (error) {
      console.error('Failed to play sound', error);
      setPlayingId(null);
      startRotation();
      await unloadCurrentSound();
    } finally {
      setPreviewLoadingId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchSongs = async () => {
      try {
        setLoading(true);
        const response = await getLatestSongs(LATEST_LIMIT);
        let workingList: ApiSongType[] = Array.isArray(response?.data) ? response.data : [];

        if ((!response?.success || workingList.length === 0)) {
          const fallbackResponse = await getAllsongs();
          if (fallbackResponse.success && Array.isArray(fallbackResponse.data)) {
            workingList = [...fallbackResponse.data]
              .sort((a, b) => b.song_id - a.song_id)
              .slice(0, LATEST_LIMIT);
          }
        }

        if (mounted) {
          setSongs(workingList.map(mapSongToRelease));
        }
      } catch (error) {
        console.error('Failed to fetch latest songs', error);
        if (mounted) {
          setSongs([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSongs();

    return () => {
      mounted = false;
      unloadCurrentSound().catch((err) =>
        console.error('Failed to unload preview sound', err)
      );
    };
  }, [unloadCurrentSound]);

  useEffect(() => {
    const wasRunning = rotationIntervalRef.current !== null;
    stopRotation();

    if (!loopedSongs.length) {
      return;
    }

    if (playingId) {
      return;
    }

    resetPosition(!wasRunning);
    startRotation();

    return () => {
      stopRotation();
      unloadCurrentSound().catch((err) =>
        console.error('Failed to unload preview sound', err)
      );
    };
  }, [loopedSongs.length, playingId, resetPosition, startRotation, stopRotation, unloadCurrentSound]);

  useEffect(() => {
    const remove = previewBus.addListener((payload) => {
      if (payload?.source === 'newrelease') {
        return;
      }
      unloadCurrentSound().catch((err) =>
        console.error('Failed to unload preview sound after external stop', err)
      );
    });

    return () => {
      remove();
    };
  }, [unloadCurrentSound]);

  useFocusEffect(
    useCallback(() => {
      if (!playingId && loopedSongs.length) {
        stopRotation();
        resetPosition(true);
        startRotation();
      }

      return () => {
        stopRotation();
      };
    }, [loopedSongs.length, playingId, resetPosition, startRotation, stopRotation])
  );

  useFocusEffect(
    useCallback(() => {
      if (loopedSongs.length && !playingId) {
        stopRotation();
        resetPosition(true);
        startRotation();
      }

      return () => {
        stopRotation();
      };
    }, [loopedSongs.length, playingId, resetPosition, startRotation, stopRotation])
  );

  const renderItem = ({ item }: { item: ReleaseSong }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ marginHorizontal: CARD_SPACING / 2 }}
        onPress={() => handleNavigateToChooseKey(item)}
      >
        <ImageBackground
          source={{ uri: item.image }}
          style={styles.card}
          imageStyle={{ borderRadius: 20 }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
            pointerEvents="none"
          />
          <View style={styles.textContainer}>
            <Text style={styles.songName}>{item.name}</Text>
            <Text style={styles.singer}>{item.singer}</Text>
          </View>

          <TouchableOpacity
            style={styles.previewButton}
            onPress={(event: GestureResponderEvent) => {
              event.stopPropagation();
              playOrPause(item);
            }}
            disabled={!item.preview}
          >
            <MaterialIcons
              name={playingId === item.id ? 'pause' : 'play-arrow'}
              size={28}
              color={item.preview ? '#3D35FF' : '#999'}
            />
          </TouchableOpacity>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  if (!loopedSongs.length && loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Loading new releases...</Text>
      </View>
    );
  }

  if (!loopedSongs.length && !loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>No new releases available.</Text>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: 20 }}>
      <FlatList
        ref={flatListRef}
        data={loopedSongs}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        getItemLayout={getItemLayout}
        snapToInterval={STEP}
        decelerationRate="fast"
        initialScrollIndex={
          loopedSongs.length ? Math.min(VISIBLE_INDEX, loopedSongs.length - 1) : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 20,
    justifyContent: 'space-between',
    padding: 16,
  },
  textContainer: {
    marginTop: 8,
  },
  songName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  singer: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  previewButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NewReleaseTabs;
