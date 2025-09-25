import React, { useEffect, useState } from "react";
import { GlobalConstant } from "@/constant";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";
import { getSongkey } from "@/api/getSongKey";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../Types/Navigation";
import { StackNavigationProp } from "@react-navigation/stack";
import { SongKeyType } from "../Types/SongKey";
import { SongType } from "../Types/Song";

type ChooseKeyRouteProp = RouteProp<RootStackParamList, "ChooseKey">;
type ChooseKeyNavProp = StackNavigationProp<RootStackParamList, "ChooseKey">;

const ChooseKey: React.FC = () => {
  const route = useRoute<ChooseKeyRouteProp>();
  const navigation = useNavigation<ChooseKeyNavProp>();

  const { song } = route.params;
  
  const [songList, setSongList] = useState<SongKeyType[]>([]);
  const [keys, setKeys] = useState<String[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const songName = song.songName;
  const artist = song.artist;
  const song_id = song.id;
  const image = song.image;
   // Use songKey.id for the song ID
 // Adjust type to match your navigation structure

  // Fetch keys from backend
  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const result = await getKey(parseInt(song_id, 10));
        console.log("Song ID:", song_id);
        console.log("songName:", songName);
        console.log("artist:", artist);
        
        if (result) {
          console.log("Fetched keys successfully:", result);
        }
      } catch (error) {
        console.log("Error fetching keys:", error);
      }
    };
    fetchKeys();
  }, []);

  const getKey = async (song_id: number) =>{
    try {
      const data = await getSongkey(song_id);
      setKeys(data.data.map(item => item.key_signature));
      setSongList(data.data);
      console.log("Fetched keys:", keys);
      if (data.success) {
        return data;
      } else {
        console.error("Failed to fetch key:", data.message);
        return null;
      }
    } catch (error) {
      console.error("Error fetching key:", error);
      return null;
    }
  }

  const handleNext = () => {
    if (currentIndex < keys.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleConfirm = () => {
    if (songList.length > 0) {
      navigation.navigate("MusicPlayer", { songKey: songList[currentIndex] });
    } else {
      console.error("No song selected");
    }
  };


  const renderSong = ({ item }: { item: SongType }) => (
    <View>
      <Text>{item.songName}</Text>
    </View>
  );

  return (
    <ImageBackground source={{ uri: `${GlobalConstant.API_URL}/${song.image}` }} style={styles.bg}>
      {/* Gradient overlay - black from bottom fading to transparent at top */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.8)', '#000000']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradientOverlay}
      />
      
      {/* Back Arrow */}
      <TouchableOpacity style={styles.backButton}>
        <Feather name="arrow-left" size={28} color="white" />
      </TouchableOpacity>
      
      {/* Song Info */}
      <View style={styles.songInfo}>
        <Text style={styles.title}>{songName ? songName : 'No Title'}</Text>
        <View style={styles.artistRow}>
          <Feather name="user" size={16} color="white" />
          <Text style={styles.artist}> {artist ? artist : 'Unknown Artist'}</Text>
        </View>
      </View>
      
      {/* Key Selector */}
      <View style={styles.keyContainer}>
        <TouchableOpacity onPress={handlePrev} style={styles.chevronButton}>
          <Feather name="chevron-left" size={40} color="white" right={40} />
        </TouchableOpacity>
        <Text style={styles.keyText}>{keys[currentIndex]}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.chevronButton}>
          <Feather name="chevron-right" size={40} color="white" left={40} />
        </TouchableOpacity>
      </View>
      <Text style={styles.suggested}>Suggested</Text>
      
      {/* Song List */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {/* <FlatList
          data={songList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSong}
        /> */}
      </View>

      {/* Confirm Button */}
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Feather name="check" size={32} color="#3A6DFF" />
      </TouchableOpacity>
    </ImageBackground>
  );
};

export default ChooseKey;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "flex-start",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: "absolute",
    top: 80,
    left: 20,
    zIndex: 2,
  },
  songInfo: {
    marginTop: 350,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textTransform: "uppercase",
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  artist: {
    fontSize: 16,
    color: "white",
  },
  keyContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  chevronButton: {
    padding: 10,
  },
  keyText: {
    fontSize: 50,
    color: "white",
    fontWeight: "bold",
    marginHorizontal: 0,
  },
  suggested: {
    textAlign: "center",
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
  confirmButton: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "white",
    borderRadius: 50,
    padding: 20,
  },
});
