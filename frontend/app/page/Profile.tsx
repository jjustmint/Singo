import {
  View,
  Text,
  Dimensions,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import TrendingCard from "../components/TrendingCard";
import TopRateTabs from "../components/TopRateTabs";
import Recent from "../components/Recent";
import ProfileInfo from "../components/ProfileInfo";
import History from "../components/History";

const { width } = Dimensions.get("window");

export default function Profile() {

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
              borderRadius: 999,
              backgroundColor: "rgba(255, 102, 204, 1)",
              top: -20,
              left: 200,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(160, 102, 255, 1)",
              top: 10,
              left: 190,
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
              left: 240,
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
              <ProfileInfo
              name="John Doe"
              songCount={15}
              profileImage="https://www.thaiwatsadu.com/_next/image?url=https%3A%2F%2Fpim.thaiwatsadu.com%2FTWDPIM%2Fweb%2FWatermark%2FImage%2F0302%2F60390467_3.jpg&w=3840&q=75"
              />

              </View>
              <View style={{ padding: 20 }}>
                <Recent
                  data={[
                    {
                      id: "1",
                      title: "Sample Song",
                      artist: "Sample Artist",
                      image: "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png",
                    },
                  ]}
                />
              </View>
              <View style={{ padding: 20,}}>
                <History/>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

