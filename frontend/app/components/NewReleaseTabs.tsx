import React, { useEffect, useRef, useState } from 'react';
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
import { Audio, AVPlaybackStatus } from 'expo-av'; // Import Audio and AVPlaybackStatus from expo-av

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_SPACING = 20;
const VISIBLE_INDEX = 5; 

const originalSongs = [
  {
    id: '1',
    name: 'Snack & Wine',
    singer: 'WIM',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg',
    preview: require('/Users/apom/Documents/Singo/frontend/assets/music/SnacksandWine.mp3'),
  },
  {
    id: '2',
    name: 'Handlebars(feat. Dua Lipa)',
    singer: 'JENNIE',
    image: 'https://i.scdn.co/image/ab67616d0000b2735a43918ea90bf1e44b7bdcfd',
    preview: require('/Users/apom/Documents/Singo/frontend/assets/music/SnacksandWine.mp3'),
  },
  {
    id: '3',
    name: 'Tell me the Name',
    singer: 'Jaff Satur',
    image: 'https://i1.sndcdn.com/artworks-uTbCE2D2UMoS-0-t500x500.jpg',
    preview: require('/Users/apom/Documents/Singo/frontend/assets/music/SnacksandWine.mp3'),
  },
  {
    id: '4',
    name: 'Supernatural',
    singer: 'Ariana Grande',
    image: 'https://i.scdn.co/image/ab67616d00001e020497121c2a34a6a1cb885e97',
    preview: require('/Users/apom/Documents/Singo/frontend/assets/music/SnacksandWine.mp3'),
  },
  {
    id: '5',
    name: 'Soft Spot',
    singer: 'Kashi',
    image: 'https://i.scdn.co/image/ab67616d0000b273617997bc09bb7fa23624eff5',
    preview: require('/Users/apom/Documents/Singo/frontend/assets/music/SnacksandWine.mp3'),
  },
];

const tripledSongs = [...originalSongs, ...originalSongs, ...originalSongs];

const NewReleaseTabs = () => {
  const flatListRef = useRef<FlatList>(null);
  const positionIndex = useRef(VISIBLE_INDEX);
  const [liked, setLiked] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const toggleLike = (id: string) => {
    setLiked((prev) =>
      prev.includes(id) ? prev.filter((songId) => songId !== id) : [...prev, id]
    );
  };

  const playOrPause = async (item: typeof originalSongs[0]) => {
    if (playingId === item.id) {
      await soundRef.current?.pauseAsync();
      setPlayingId(null);
    } else {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current.setOnPlaybackStatusUpdate(null);
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          typeof item.preview === 'string' ? { uri: item.preview } : item.preview,
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setPlayingId(item.id);

        // Explicitly define the type for the 'status' parameter
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null);
          }
        });
      } catch (error) {
        console.error('Failed to play sound', error);
      }
    }
  };

  useEffect(() => {
    // Start in the center list
    flatListRef.current?.scrollToIndex({
      index: VISIBLE_INDEX,
      animated: false,
    });

    const interval = setInterval(() => {
      positionIndex.current += 1;

      flatListRef.current?.scrollToIndex({
        index: positionIndex.current,
        animated: true,
      });

      if (positionIndex.current >= tripledSongs.length - VISIBLE_INDEX) {
        setTimeout(() => {
          positionIndex.current = VISIBLE_INDEX;
          flatListRef.current?.scrollToIndex({
            index: VISIBLE_INDEX,
            animated: false,
          });
        }, 800);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      soundRef.current?.unloadAsync();
    };
  }, []);

  const renderItem = ({ item }: { item: typeof originalSongs[0] }) => {
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
          >
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={28}
              color="#3D35FF"
            />
          </TouchableOpacity>
        </ImageBackground>
      </View>
    );
  };

  return (
    <View style={{ marginVertical: 20 }}>
      <FlatList
        ref={flatListRef}
        data={tripledSongs}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + CARD_SPACING,
          offset: (CARD_WIDTH + CARD_SPACING) * index,
          index,
        })}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        initialScrollIndex={VISIBLE_INDEX}
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
