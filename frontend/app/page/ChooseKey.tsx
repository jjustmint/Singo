import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

const ChooseKey = () => {
  const [song, setSong] = useState<Song>({
    id: "1",
    title: "BIRDS OF THE FEATHER",
    artist: "Billie Eilish",
    cover: "https://i1.sndcdn.com/artworks-BHI8P4kbIiY67cXS-K2kVZA-t500x500.jpg",
  });
  const [keys, setKeys] = useState<string[]>(["A", "B", "C", "D", "E", "F", "G"]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch keys from backend
  useEffect(() => {
    const fetchKeys = async () => {
      try {
        // Example: replace with your backend API call
        // const res = await fetch("https://your-api.com/keys?songId=" + song.id);
        // const data = await res.json();
        // setKeys(data.keys);
        // setCurrentIndex(data.suggestedIndex);
      } catch (error) {
        console.log("Error fetching keys:", error);
      }
    };
    fetchKeys();
  }, []);

  const handleNext = () => {
    if (currentIndex < keys.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleConfirm = () => {
    alert("Selected Key: " + keys[currentIndex]);
    // navigate to next screen or send selection to backend
  };

  return (
    <ImageBackground source={{ uri: song.cover }} style={styles.bg}>
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
        <Text style={styles.title}>{song.title}</Text>
        <View style={styles.artistRow}>
          <Feather name="user" size={16} color="white" />
          <Text style={styles.artist}> {song.artist}</Text>
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
    marginTop: 50,
  },
  chevronButton: {
    padding: 20,
  },
  keyText: {
    fontSize: 100,
    color: "white",
    fontWeight: "bold",
    marginHorizontal: 20,
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
