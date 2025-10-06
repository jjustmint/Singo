import { View, Text, FlatList, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Recent from "../components/Recent";
import ProfileInfo from "../components/ProfileInfo";
import History from "../components/History";
import { useEffect, useState, useRef } from "react";
import { getHistory } from "@/api/getHistory";
import { getUserId, removeAuthToken } from "@/util/cookies";
import { HistoryType } from "../../../backend/src/types/getHistory";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../Types/Navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Profile() {
  const router = useRouter();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const sections = [{ key: "content" }];
  const [history, setHistory] = useState<HistoryType[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  const dropdownOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    handleHistory();
  }, []);

  const handleHistory = async () => {
    const userId = await getUserId();
    const history = await getHistory(userId as number);
    setHistory(history.data);
    console.log("Fetched history:", history);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await handleHistory();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleDropdown = () => {
    if (isDropdownOpen) {
      // Close animation
      Animated.parallel([
        Animated.timing(dropdownHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(dropdownOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(() => setIsDropdownOpen(false));
    } else {
      // Open animation
      setIsDropdownOpen(true);
      Animated.parallel([
        Animated.timing(dropdownHeight, {
          toValue: 120,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(dropdownOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const handleEditProfile = () => {
    toggleDropdown();
    router.push("/page/EditProfile"); // Adjust the route as needed
  };

  const handleSignOut = async () => {
    try {
      await removeAuthToken();
      await AsyncStorage.removeItem("user_id");

      setHistory([]);

      if (isDropdownOpen) {
        toggleDropdown();
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "SignIn" as never }],
      });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#131313" }}
      edges={["left", "right"]}
    >
      <View style={{ flex: 1, position: "relative" }}>
        {/* Background blur effect */}
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

        {/* Settings Icon */}
        <TouchableOpacity
          onPress={toggleDropdown}
          style={{
            position: "absolute",
            top: 60,
            right: 20,
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <Animated.View
            style={{
              position: "absolute",
              top: 110,
              right: 20,
              zIndex: 10,
              width: 180,
              height: dropdownHeight,
              opacity: dropdownOpacity,
              backgroundColor: "rgba(30, 30, 30, 0.95)",
              borderRadius: 12,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
              <TouchableOpacity
                onPress={handleEditProfile}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <Ionicons name="person-outline" size={20} color="white" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    marginLeft: 16,
                    fontWeight: "500",
                  }}
                >
                  Edit Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSignOut}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 15,
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                <Text
                  style={{
                    color: "#FF6B6B",
                    fontSize: 16,
                    marginLeft: 16,
                    fontWeight: "500",
                  }}
                >
                  Sign Out
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

        {/* Use FlatList as wrapper instead of ScrollView */}
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 150 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={() => (
            <View style={{ zIndex: 2 }}>
              {/* Profile */}
              <View style={{ padding: 20, marginTop: 50 }}>
                <ProfileInfo songCount={history.length} />
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
              <View style={{ padding: 20 }}>
                <History />
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
