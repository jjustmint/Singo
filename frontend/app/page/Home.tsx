import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import CategoryTabs from "../components/CategoryTabs";
import NewReleaseTabs from "../components/NewReleaseTabs";
import TrendingList from "../components/TrendingCard";
import TopRateTabs from "../components/TopRateTabs";
import { getUser } from "@/api/getUser";
import { getAllsongs } from "@/api/song/getAll";

const { width } = Dimensions.get("window");

interface Song {
  id: string;
  image: string;
  songName: string;
  artist: string;
}

export default function Home() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState<string>("");
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      await handleGetUsername();
      await handleGetSongs();
    };
    fetchData();
  }, []);

  const handleGetUsername = async () => {
    const fetchedUsername =  await getUser();
    const user = fetchedUsername.data.username;
    setUsername(user);
    console.log("Fetched username:", fetchedUsername);
  };

  const handleGetSongs = async () => {
    const fetchedSongs = await getAllsongs();
    const mappedSongs: Song[] = fetchedSongs.data.map((song: any) => ({
      id: song.song_id.toString(),
      image:
        song.album_cover ||
        "https://i.pinimg.com/564x/11/8e/7f/118e7f4d22f1e5ff4f6e2f1f2d1f3c4b5.jpg",
      songName: song.title,
      artist: song.singer,
    }));
    setSongs(mappedSongs);
    console.log("Fetched songs:", fetchedSongs.data);
  };  

  const scrollToSection = (section: "New Release" | "Trending" | "Top Rated") => { // Add explicit type for 'section'
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y:
          section === "New Release"
            ? 0 // Adjust this value to the Y-offset of the "New Release" section
            : section === "Trending"
            ? 300 // Adjust this value to the Y-offset of the "Trending" section
            : section === "Top Rated"
            ? 900 // Adjust this value to the Y-offset of the "Top Rated" section
            : 0,
        animated: true,
      });
    }
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

        <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: 150 }}>
          <View style={{ zIndex: 2 }}>
            {/* Profile */}
            <View style={{ padding: 20, marginTop: 50 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={{
                    uri: "https://static.vecteezy.com/system/resources/previews/024/966/233/non_2x/businesswoman-portrait-beautiful-woman-in-business-suit-employee-of-business-institution-in-uniform-lady-office-worker-woman-business-avatar-profile-picture-illustration-vector.jpg",
                  }}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 40,
                    marginRight: 10,
                  }}
                />
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

            <CategoryTabs scrollToSection={(category: string) => scrollToSection(category as "New Release" | "Trending" | "Top Rated")} />

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
              <TrendingList song={songs}/>
            </View>

            {/* Top Rate */}
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

