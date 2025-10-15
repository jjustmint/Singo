import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { getLatestSongs } from '@/api/song/getLatest';
import { GlobalConstant } from '@/constant';
import { SongType } from '@/api/types/song';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_SPACING = 20;
const STEP = CARD_WIDTH + CARD_SPACING;
const VISIBLE_INDEX = 5;
const AUTO_SCROLL_INTERVAL = 5000;
const RESET_ANIMATION_DELAY = 650;
const FALLBACK_IMAGE = 'https://placehold.co/400x400?text=Singo';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ReleaseSong = {
  id: string;
  name: string;
  singer: string;
  image: string;
  preview: string | null;
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

const mapSongToRelease = (song: SongType): ReleaseSong => ({
  id: song.song_id.toString(),
  name: song.title,
  singer: song.singer ?? 'Unknown Artist',
  image: toMediaUri(song.album_cover) ?? FALLBACK_IMAGE,
  preview: toMediaUri(song.previewsong),
});

const NewReleaseTabs = () => {
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

  const unloadCurrentSound = useCallback(async () => {
    const currentSound = soundRef.current;
    if (!currentSound) {
      return;
    }

    try {
      currentSound.setOnPlaybackStatusUpdate(null);
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await currentSound.stopAsync();
      }
    } catch (err) {
      console.warn('Unable to stop current preview cleanly:', err);
    }

    try {
      await currentSound.unloadAsync();
    } catch (err) {
      console.warn('Unable to unload current preview cleanly:', err);
    }

    soundRef.current = null;
    currentPreviewIdRef.current = null;
  }, []);

  const toggleLike = (id: string) => {
    setLiked((prev) =>
      prev.includes(id) ? prev.filter((songId) => songId !== id) : [...prev, id]
    );
  };

  const ensurePlayback = useCallback(async (sound: Audio.Sound) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        return false;
      }
      if (status.isPlaying) {
        return true;
      }

      const position = typeof status.positionMillis === 'number' ? status.positionMillis : 0;

      try {
        await sound.playFromPositionAsync(position);
      } catch (error) {
        console.error('Unable to trigger preview playback', error);
      }

      await wait(120);
    }

    return false;
  }, []);

  const stopRotation = useCallback(() => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
  }, []);

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
          await currentSound.playAsync();
          setPlayingId(item.id);
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

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: item.preview },
        {
          shouldPlay: true,
          positionMillis: 0,
          volume: 1,
          rate: 1,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 250,
        },
        statusHandler
      );

      soundRef.current = sound;
      currentPreviewIdRef.current = item.id;

      console.log('Preview loaded status:', status);

      if (!status.isLoaded) {
        throw new Error('Preview sound failed to load');
      }

      stopRotation();
      if (!status.isPlaying) {
        await sound.playAsync();
      }
      setPlayingId(item.id);
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
        const response = await getLatestSongs(5);
        if (mounted && response.success && response.data) {
          const mapped = response.data.map(mapSongToRelease);
          setSongs(mapped);
        } else if (mounted) {
          setSongs([]);
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

  const renderItem = ({ item }: { item: ReleaseSong }) => {
    const isLiked = liked.includes(item.id);
    const isPlaying = playingId === item.id;

    return (
      <View style={{ marginHorizontal: CARD_SPACING / 2 }}>
        <ImageBackground
          source={{ uri: item.image }}
          style={styles.card}
          imageStyle={{ borderRadius: 20 }}
        >
          <View style={styles.textContainer}>
            <Text style={styles.songName}>{item.name}</Text>
            <Text style={styles.singer}>{item.singer}</Text>
          </View>

          <TouchableOpacity
            style={styles.likeIcon}
            onPress={() => toggleLike(item.id)}
          >
            <FontAwesome
              name={isLiked ? 'heart' : 'heart-o'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => playOrPause(item)}
            disabled={!item.preview}
          >
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={28}
              color={item.preview ? '#3D35FF' : '#999'}
            />
          </TouchableOpacity>
        </ImageBackground>
      </View>
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
  likeIcon: {
    position: 'absolute',
    bottom: 16,
    left: 16,
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
