import React, { useCallback, useRef, useState } from "react";
import { View, Text, Image, Dimensions, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import CategoryTabs from "../components/CategoryTabs";
import NewReleaseTabs from "../components/NewReleaseTabs";
import TrendingList from "../components/TrendingCard";
import TopRateTabs from "../components/TopRateTabs";
import { getUser } from "@/api/getUser";
import { GlobalConstant } from "@/constant";
import { getAllsongs } from "@/api/song/getAll";
import { useFocusEffect } from "@react-navigation/native";
import { SongType as BaseSongType } from "../Types/Song";

const { width } = Dimensions.get("window");

type Song = BaseSongType & { previewUrl: string | null };

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

export default function Home() {
  const listRef = useRef<FlatList<any>>(null);
  const [username, setUsername] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [userKey, setUserKey] = useState<string | null>(null);
  const newReleaseRef = useRef<View>(null);
  const trendingRef = useRef<View>(null);
  const topRateRef = useRef<View>(null);

  const sectionPositions = useRef<{ [key: string]: number }>({});

  const onLayoutSection = (name: string, event: any) => {
    sectionPositions.current[name] = event.nativeEvent.layout.y;
  };

  const buildPhotoUrl = useCallback((photo?: string | null) => {
    if (typeof photo !== "string" || photo.length === 0) {
      return null;
    }

    const normalised = photo.replace(/\\/g, "/");

    if (normalised.startsWith("http://") || normalised.startsWith("https://")) {
      return `${normalised}?t=${Date.now()}`;
    }

    const trimmed = normalised.replace(/^\/+/, "");
    const withoutDataPrefix = trimmed.startsWith("data/")
      ? trimmed.replace(/^data\//, "")
      : trimmed;
    return `${GlobalConstant.API_URL}/${withoutDataPrefix}?t=${Date.now()}`;
  }, []);

  const handleGetUsername = useCallback(async () => {
    const fetchedUsername = await getUser();
    const user = fetchedUsername.data.username;
    const photo = fetchedUsername.data.photo ?? null;
    const preferredKey = fetchedUsername.data.user_key ?? null;
    setUsername(user);
    setPhotoUrl(buildPhotoUrl(photo));
    setUserKey(preferredKey);
    console.log("🎵 userKey:", preferredKey);
    console.log("Fetched username:", fetchedUsername);
  }, [buildPhotoUrl]);

  const handleGetSongs = useCallback(async () => {
    const fetchedSongs = await getAllsongs();
    const mappedSongs: Song[] = fetchedSongs.data.map((song: any) => ({
      id: song.song_id.toString(),
      image:
        buildAssetUri(song.album_cover) ??
        "https://i.pinimg.com/564x/11/8e/7f/118e7f4d22f1e5ff4f6e2f1f2d1f3c4b5.jpg",
      songName: song.title,
      artist: song.singer,
      previewUrl: buildAssetUri(song.previewsong),
      key_signature: song.key_signature,
    }));
    setSongs(mappedSongs);
    console.log("Fetched songs:", fetchedSongs.data);
  }, []);

  const loadHomeData = useCallback(async () => {
    await Promise.all([handleGetUsername(), handleGetSongs()]);
  }, [handleGetUsername, handleGetSongs]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const scrollToSection = (
    section: "New Release" | "Trending" | "Top Rated"
  ) => {
    const y = sectionPositions.current[section] || 0;
    listRef.current?.scrollToOffset({ offset: y, animated: true });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#131313" }}
      edges={["left", "right"]}
    >
      <View style={{ flex: 1, position: "relative" }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: "rgba(255, 102, 204, 1)",
              top: -40,
              left: -40,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(160, 102, 255, 1)",
              top: 20,
              left: 30,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "rgba(102, 140, 255, 1)",
              top: 60,
              left: -20,
            }}
          />
          <BlurView
            intensity={100}
            tint="dark"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </View>

        <FlatList
          ref={listRef}
          data={[{ key: "content" }]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 150 }}
          renderItem={() => (
            <View style={{ zIndex: 2 }}>
              {/* Profile */}
              <View style={{ padding: 20, marginTop: 50 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {photoUrl ? (
                    <Image
                      source={{ uri: photoUrl }}
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 40,
                        marginRight: 10,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 40,
                        marginRight: 10,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 26,
                          fontWeight: "bold",
                        }}
                      >
                        {(username || "G").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color: "white",
                      left: 30,
                    }}
                  >
                    Hi! {username || "Guest"}
                  </Text>
                </View>
              </View>

              <CategoryTabs
                scrollToSection={(category: string) =>
                  scrollToSection(
                    category as "New Release" | "Trending" | "Top Rated"
                  )
                }
              />

              {/* New Release Section */}
              <View
                onLayout={(event) => onLayoutSection("New Release", event)}
                ref={newReleaseRef}
              >
                <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 22,
                      fontWeight: "bold",
                    }}
                  >
                    New Release
                  </Text>
                </View>
                <NewReleaseTabs />
              </View>

              {/* Trending Section */}
              <View
                onLayout={(event) => onLayoutSection("Trending", event)}
                ref={trendingRef}
              >
                <View style={{ paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 22,
                      fontWeight: "bold",
                    }}
                  >
                    Trending
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                  {userKey !== null && (
                    <TrendingList song={songs} userKey={userKey} />
                  )}
                </View>
              </View>

              {/* Top Rate Section */}
              <View
                onLayout={(event) => onLayoutSection("Top Rated", event)}
                ref={topRateRef}
              >
                <View style={{ paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 22,
                      fontWeight: "bold",
                    }}
                  >
                    Top Rate
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                  <TopRateTabs />
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
