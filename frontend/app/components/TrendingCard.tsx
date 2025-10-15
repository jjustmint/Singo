import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SongType } from "../Types/Song";
import { GlobalConstant } from "@/constant";
import { Audio, AVPlaybackStatus } from "expo-av";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RootStackParamList = {
  MainTabs: undefined;
  ChooseKey: { song: { id: string; songName: string; artist: string; image: string } };
};

type NavigationProp = StackNavigationProp<RootStackParamList, "MainTabs">;


type TrendingSong = SongType & { previewUrl?: string | null };

type TrendingCardProps = {
  song: TrendingSong;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
};

const TrendingCard: React.FC<TrendingCardProps> = ({ song, isPlaying, isLoading, onToggle }) => {
  const navigation = useNavigation<NavigationProp>();

  const imageUri = useMemo(() => buildAssetUri(song.image) ?? "https://i.pinimg.com/564x/11/8e/7f/118e7f4d22f1e5ff4f6e2f1f2d1f3c4b5.jpg", [song.image]);

  const handleCardPress = () => {
    navigation.navigate("ChooseKey", { song });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.rightContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.songName} numberOfLines={1}>
            {song.songName}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#5E72FC" />
          ) : (
            <FontAwesome name={isPlaying ? "pause" : "play"} size={16} color="#5E72FC" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const buildAssetUri = (path?: string | null) => {
  if (!path) {
    return null;
  }

  const normalised = path.replace(/\\/g, "/");

  if (normalised.startsWith("http://") || normalised.startsWith("https://")) {
    return normalised;
  }

  const trimmed = normalised.replace(/^\/+/, "");
  const withoutDataPrefix = trimmed.startsWith("data/")
    ? trimmed.replace(/^data\//, "")
    : trimmed;

  return encodeURI(`${GlobalConstant.API_URL}/${withoutDataPrefix}`);
};

const TrendingList: React.FC<{ song: TrendingSong[] }> = ({ song }) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const unloadCurrent = useCallback(async () => {
    const activeSound = soundRef.current;
    if (!activeSound) {
      return;
    }

    try {
      activeSound.setOnPlaybackStatusUpdate(null);
      const status = await activeSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await activeSound.stopAsync();
      }
    } catch (err) {
      console.warn("Unable to stop preview cleanly:", err);
    }

    try {
      await activeSound.unloadAsync();
    } catch (err) {
      console.warn("Unable to unload preview cleanly:", err);
    }

    soundRef.current = null;
    currentIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      unloadCurrent().catch((err) => console.error("Failed to unload preview on unmount", err));
    };
  }, [unloadCurrent]);

  const togglePreview = useCallback(
    async (item: TrendingSong) => {
      const previewUri = buildAssetUri(item.previewUrl ?? null);

      if (!previewUri) {
        console.warn("Preview not available for song", item.songName);
        return;
      }

      const currentSound = soundRef.current;
      const isCurrent = currentIdRef.current === item.id;

      if (loadingId && loadingId !== item.id) {
        return;
      }

      if (isCurrent && currentSound) {
        try {
          const status = await currentSound.getStatusAsync();
          if (!status.isLoaded) {
            await unloadCurrent();
            setPlayingId(null);
            return;
          }

          if (status.isPlaying) {
            await currentSound.pauseAsync();
            setPlayingId(null);
          } else {
            setLoadingId(item.id);
            await currentSound.playAsync();
            setPlayingId(item.id);
          }
        } catch (err) {
          console.error("Failed to toggle preview playback", err);
          setPlayingId(null);
          await unloadCurrent();
        } finally {
          setLoadingId(null);
        }
        return;
      }

      setLoadingId(item.id);
      await unloadCurrent();

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const sound = new Audio.Sound();
        soundRef.current = sound;
        currentIdRef.current = item.id;

        const statusHandler = (status: AVPlaybackStatus) => {
          if (currentIdRef.current !== item.id) {
            return;
          }

          if (status.isLoaded && status.isPlaying) {
            setLoadingId((loading) => (loading === item.id ? null : loading));
            setPlayingId(item.id);
          }

          if ((status.isLoaded && status.didJustFinish) || (!status.isLoaded && 'error' in status)) {
            setPlayingId(null);
            setLoadingId((loading) => (loading === item.id ? null : loading));
            unloadCurrent().catch((err) => console.error("Failed to unload preview", err));
          }
        };

        sound.setOnPlaybackStatusUpdate(statusHandler);

        soundRef.current = sound;
        currentIdRef.current = item.id;

        const status = await sound.loadAsync(
          { uri: previewUri },
          {
            shouldPlay: false,
            positionMillis: 0,
            volume: 1,
            rate: 1,
            shouldCorrectPitch: true,
            progressUpdateIntervalMillis: 250,
          },
          false
        );

        console.log("Trending preview loaded status:", status);

        if (!status.isLoaded) {
          throw new Error("Preview sound failed to load");
        }

        await sound.playAsync();
        setPlayingId(item.id);
      } catch (err) {
        console.error("Failed to play preview", err);
        setPlayingId(null);
        await unloadCurrent();
      } finally {
        setLoadingId(null);
      }
    },
    [loadingId, unloadCurrent]
  );

  const renderItem = useCallback(
    ({ item }: { item: TrendingSong }) => (
      <TrendingCard
        song={item}
        isPlaying={playingId === item.id}
        isLoading={loadingId === item.id}
        onToggle={() => togglePreview(item)}
      />
    ),
    [loadingId, playingId, togglePreview]
  );

  return (
    <FlatList
      data={song}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: 20 }}
      extraData={{ playingId, loadingId }}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    marginVertical: 10,
    elevation: 1,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 12,
  },
  rightContainer: {
    flex: 1,
    justifyContent: "space-between",
    flexDirection: "column",
    height: 96,
    position: "relative",
  },
  textContainer: {
    marginBottom: 10,
  },
  songName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  artist: {
    fontSize: 14,
    color: "#bbb",
    marginTop: 2,
  },
  iconButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderRadius: 50,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
});

export default TrendingList;
