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
import { styles, CARD_WIDTH, CARD_SPACING } from '../style/componentstyle/NewReleaseTabsStyle';

const VISIBLE_INDEX = 5; 

const originalSongs = [
  {
    song_id: '1',
    title: 'Snack & Wine',
    singer: 'WIM',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/8e/b9/8c/8eb98c5f-fa72-9a64-bc95-94a4bfd72eb3/cover.jpg/1200x630bb.jpg',
    preview: require('../../assets/music/SnacksandWine.mp3'),
  },
  {
    song_id: '2',
    title: 'Handlebars(feat. Dua Lipa)',
    singer: 'JENNIE',
    image: 'https://i.scdn.co/image/ab67616d0000b2735a43918ea90bf1e44b7bdcfd',
    preview: require('../../assets/music/SnacksandWine.mp3'),
  },
  {
    song_id: '3',
    title: 'Tell me the Name',
    singer: 'Jaff Satur',
    image: 'https://i1.sndcdn.com/artworks-uTbCE2D2UMoS-0-t500x500.jpg',
    preview: require('../../assets/music/SnacksandWine.mp3'),
  },
  {
    song_id: '4',
    title: 'Supernatural',
    singer: 'Ariana Grande',
    image: 'https://i.scdn.co/image/ab67616d00001e020497121c2a34a6a1cb885e97',
    preview: require('../../assets/music/SnacksandWine.mp3'),
  },
  {
    song_id: '5',
    title: 'Soft Spot',
    singer: 'Kashi',
    image: 'https://i.scdn.co/image/ab67616d0000b273617997bc09bb7fa23624eff5',
    preview: require('../../assets/music/SnacksandWine.mp3'),
  },
];

const tripledSongs = [...originalSongs, ...originalSongs, ...originalSongs];

const NewReleaseTabs = () => {
  const flatListRef = useRef<FlatList>(null);
  const positionIndex = useRef(VISIBLE_INDEX);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const playOrPause = async (item: typeof originalSongs[0]) => {
    if (playingId === item.song_id) {
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
        setPlayingId(item.song_id);

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
    const isPlaying = playingId === item.song_id;

    return (
      <View style={{ marginHorizontal: CARD_SPACING / 2 }}>
        <ImageBackground
          source={{ uri: item.image }}
          style={styles.card}
          imageStyle={{ borderRadius: 20 }}
        >
          <View style={styles.textContainer}>
            <Text style={styles.songName}>{item.title}</Text>
            <Text style={styles.singer}>{item.singer}</Text>
          </View>

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

export default NewReleaseTabs;
