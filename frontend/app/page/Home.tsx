import React from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import CategoryTabs from "../components/CategoryTabs";
import NewReleaseTabs from "../components/NewReleaseTabs";
import TrendingCard from "../components/TrendingCard";
import TopRateTabs from "../components/TopRateTabs";

const { width } = Dimensions.get("window");

export default function Home() {

  const sections = [{ key: "content" }];

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
            bottom: 0, // ✅ full screen
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

        {/* Use FlatList as wrapper instead of ScrollView */}
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 150 }}
          renderItem={() => (
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
                    Hi! Pathompong
                  </Text>
                </View>
              </View>

              <CategoryTabs />

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
                <TrendingCard />
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
          )}
        />
      </View>
    </SafeAreaView>
  );
}
