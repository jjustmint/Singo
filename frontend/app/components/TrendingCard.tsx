import React, { useState } from "react";


import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SongType } from "../Types/Song";
import { GlobalConstant } from "@/constant";

type RootStackParamList = {
  MainTabs: undefined;
  ChooseKey: { song: { id: string; songName: string; artist: string; image: string } };
};

type NavigationProp = StackNavigationProp<RootStackParamList, "MainTabs">;


const TrendingCard: React.FC<{ song: SongType }> = ({ song }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const togglePlay = (e: any) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleCardPress = () => {
    navigation.navigate("ChooseKey", { song });
    console.log("Navigating to ChooseKey with song:", song);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress}>
      <Image source={{ uri: `${GlobalConstant.API_URL}/${song.image}` }} style={styles.image} />
      <View style={styles.rightContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.songName} numberOfLines={1}>
            {song.songName}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={togglePlay}>
          <FontAwesome
            name={isPlaying ? "pause" : "play"}
            size={16}
            color="#5E72FC"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const TrendingList: React.FC<{ song: SongType[] }> = ({ song }) => {
  return (
      <FlatList
        data={song}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TrendingCard song={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
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