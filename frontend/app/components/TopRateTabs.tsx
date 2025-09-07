import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface Song {
  id: string;
  image: string;
  songName: string;
  artist: string;
}

// --- Mock Data ---
const mockSongs: Song[] = [
  {
    id: '1',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg',
    songName: 'Shape of You',
    artist: 'Ed Sheeran',
  },
  {
    id: '2',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg',
    songName: 'Blinding Lights',
    artist: 'The Weeknd',
  },
  {
    id: '3',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg',
    songName: 'Levitating',
    artist: 'Dua Lipa',
  },
  {
    id: '4',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg',
    songName: 'Bad Guy',
    artist: 'Billie Eilish',
  },
];

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
  return (
    <FlatList
      data={mockSongs}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <TopRateTabs song={item} index={index} />
      )}
      contentContainerStyle={{ paddingBottom: 20 }}
      nestedScrollEnabled={true} // Enable nested scrolling
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
});

export default TopRateScreen;
