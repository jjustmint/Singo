import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { getHistory } from '@/api/getHistory';
import { getAudioVerById } from '@/api/song/getAudioById';
import { getAllsongs } from '@/api/song/getAll';
import { getUser } from '@/api/getUser';
import { SongType } from '@/api/types/song';
import { buildAssetUri } from '@/app/utils/assetUri';

interface Song {
  id: number;
  image: string;
  songName: string;
  artist: string;
  playCount: number;
}

const FALLBACK_COVER = 'https://via.placeholder.com/150';

// --- Card Component ---
export const TopRateTabs: React.FC<{ song: Song; index: number }> = ({
  song,
  index,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Rank styling
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze
  const rankColor = rankColors[index] || '#fff';
  const rankSize = index < 3 ? 50 - index * 4 : 25; // 1=50, others=25

  return (
    <View style={styles.card}>
      {/* Rank Number */}
      <Text style={[styles.rank, { color: rankColor, fontSize: rankSize }]}>
        {index + 1}
      </Text>

      <Image source={{ uri: song.image }} style={styles.image} />
      <View style={styles.rightContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.songName} numberOfLines={1}>
            {song.songName}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={togglePlay}>
          <FontAwesome
            name={isPlaying ? 'pause' : 'play'}
            size={16}
            color="#5E72FC"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Screen Component ---
const TopRateScreen: React.FC = () => {
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTopSongs = async () => {
      try {
        setLoading(true);
        setError(null);

        const [userRes, allSongsRes] = await Promise.all([getUser(), getAllsongs()]);

        if (!userRes.success || !userRes.data || userRes.data.user_id < 0) {
          throw new Error(userRes.message ?? 'Unable to load user data');
        }

        const historyRes = await getHistory(userRes.data.user_id);
        if (!historyRes.success || !historyRes.data) {
          throw new Error(historyRes.message ?? historyRes.msg ?? 'Failed to load history');
        }

        if (!historyRes.data.length) {
          if (isMounted) {
            setTopSongs([]);
          }
          return;
        }

        const versionPlayCount = historyRes.data.reduce<Map<number, number>>((map, record) => {
          if (typeof record.version_id === 'number') {
            map.set(record.version_id, (map.get(record.version_id) ?? 0) + 1);
          }
          return map;
        }, new Map());

        if (!versionPlayCount.size) {
          if (isMounted) setTopSongs([]);
          return;
        }

        const uniqueVersionIds = Array.from(versionPlayCount.keys());

        const audioResponses = await Promise.all(
          uniqueVersionIds.map(async (versionId) => {
            const res = await getAudioVerById(versionId);
            return { versionId, data: res };
          })
        );

        const songPlayCount = audioResponses.reduce<Map<number, number>>((map, entry) => {
          const { versionId, data } = entry;
          if (data.success && data.data && typeof data.data.song_id === 'number') {
            const count = versionPlayCount.get(versionId) ?? 0;
            map.set(data.data.song_id, (map.get(data.data.song_id) ?? 0) + count);
          }
          return map;
        }, new Map());

        if (!songPlayCount.size) {
          if (isMounted) setTopSongs([]);
          return;
        }

        const allSongs: SongType[] =
          (allSongsRes.success && Array.isArray(allSongsRes.data) ? allSongsRes.data : []) ?? [];

        const mappedSongs: Song[] = Array.from(songPlayCount.entries())
          .map(([songId, playCount]) => {
            const song = allSongs.find((s) => s.song_id === songId);
            if (!song) {
              return null;
            }
            const image = buildAssetUri(song.album_cover) ?? FALLBACK_COVER;
            return {
              id: song.song_id,
              image,
              songName: song.title,
              artist: song.singer,
              playCount,
            };
          })
          .filter(Boolean) as Song[];

        mappedSongs.sort((a, b) => b.playCount - a.playCount);

        if (isMounted) {
          setTopSongs(mappedSongs.slice(0, 10));
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : 'Failed to load top songs. Please try again later.';
          setError(message);
          setTopSongs([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTopSongs();

    return () => {
      isMounted = false;
    };
  }, []);

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
          {error ?? 'No songs recorded yet. Start singing to see your top tracks!'}
        </Text>
      </View>
    );
  }, [loading, error]);

  return (
    <FlatList
      data={topSongs}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item, index }) => (
        <TopRateTabs song={item} index={index} />
      )}
      contentContainerStyle={{ paddingBottom: 20 }}
      nestedScrollEnabled={true} // Enable nested scrolling
      ListEmptyComponent={listEmptyComponent}
      showsVerticalScrollIndicator={false}
    />
  );
};

// --- Styles ---
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
