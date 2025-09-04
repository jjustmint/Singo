import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import CategoryTabs from "../components/CategoryTabs";
import NewReleaseTabs from "../components/NewReleaseTabs";
import TrendingCard from "../components/TrendingCard";
import TopRateTabs from "../components/TopRateTabs";
import { getUsername } from "@/api/getUser";
import { getAllsongs } from "@/api/song/getAll";
import styles from "../style/pagestyle/HomeStyle"

const { width } = Dimensions.get("window");

export default function Home() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState<string>("");
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    handleGetUsername();
    handleGetSongs();
  }, []);

  const handleGetUsername = async () => {
    const fetchedUsername = await getUsername();
    const user = fetchedUsername.data.username;
    setUsername(user);
    console.log("Fetched username:", fetchedUsername);
  };

  const handleGetSongs = async () => {
    const fetchedSongs = await getAllsongs();
    setSongs(fetchedSongs.data);
  };

  const scrollToSection = (section: "New Release" | "Trending" | "Top Rated") => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y:
          section === "New Release"
            ? 0
            : section === "Trending"
            ? 300
            : section === "Top Rated"
            ? 900
            : 0,
        animated: true,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        {/* Background Blurs */}
        <View style={styles.backgroundContainer}>
          <View style={styles.circlePink} />
          <View style={styles.circlePurple} />
          <View style={styles.circleBlue} />
          <BlurView intensity={100} tint="dark" style={styles.blur} />
        </View>

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentWrapper}>
            {/* Profile */}
            <View style={styles.profileContainer}>
              <View style={styles.profileInner}>
                <Image
                  source={{
                    uri: "https://static.vecteezy.com/system/resources/previews/024/966/233/non_2x/businesswoman-portrait-beautiful-woman-in-business-suit-employee-of-business-institution-in-uniform-lady-office-worker-woman-business-avatar-profile-picture-illustration-vector.jpg",
                  }}
                  style={styles.profileImage}
                />
                <Text style={styles.profileText}>Hi! {username || "Guest"}</Text>
              </View>
            </View>

            <CategoryTabs
              scrollToSection={(category: string) =>
                scrollToSection(category as "New Release" | "Trending" | "Top Rated")
              }
            />

            {/* New Release Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Release</Text>
            </View>
            <NewReleaseTabs />

            {/* Trending Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending</Text>
            </View>
            <View style={styles.sectionContent}>
              <TrendingCard />
            </View>

            {/* Top Rate Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Rate</Text>
            </View>
            <View style={styles.sectionContent}>
              <TopRateTabs />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
