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
import { useEffect, useState } from "react";
import { getUser } from "@/api/getUser";
import { GlobalConstant } from "@/constant";

const { width } = Dimensions.get("window");

export default function Profile() {

  const sections = [{ key: "content" }];
  const [username, setUsername] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      await handleGetUser();
    };
    fetchData();
  }, []);

  const handleGetUser = async () => {
      const fetchedUsername =  await getUser();
      const user = fetchedUsername.data.username;
      const photo = fetchedUsername.data.photo;
      setUsername(user);
      setProfileImage(photo || "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png");
      console.log("Fetched username:", fetchedUsername);
      console.log("photo: "+`${GlobalConstant.API_URL}${profileImage}`);
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
                  songCount={30} 
                  profileImage={`${GlobalConstant.API_URL}${profileImage}` || "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png"}
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

