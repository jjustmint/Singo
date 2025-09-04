import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../style/componentstyle/HistoryStyle"

interface HistoryItem {
  id: string;
  title: string;
  artist: string;
  date: string;
  image: string;
}

// Mock Data
const mockData: HistoryItem[] = [
  {
    id: "1",
    title: "Let It Go",
    artist: "Idina Menzel",
    date: "2025-09-01",
    image: "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png",
  },
  {
    id: "2",
    title: "If I Ain't Got You",
    artist: "Alicia Keys",
    date: "2025-09-02",
    image: "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png",
  },
  {
    id: "3",
    title: "Snacks and Wine",
    artist: "Unknown Artist",
    date: "2025-09-03",
    image: "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png",
  },
  {
    id: "4",
    title: "Test Song",
    artist: "Test Artist",
    date: "2025-09-03",
    image: "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png",
  },
  {
    id: "5",
    title: "Another Test Song",
    artist: "Another Artist",
    date: "2025-09-03",
    image: "https://images.genius.com/282a0165862d48f70b0f9c5ce8531eb5.1000x1000x1.png",
  },
];

const History: React.FC<{ data?: HistoryItem[] }> = ({ data = mockData }) => {
  const navigation = useNavigation();
  const [visibleCount, setVisibleCount] = useState(10);

  const loadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  const handleCardPress = () => {
    navigation.navigate("Summary"); // Navigate to Summary without passing parameters
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      key={item.id}
      onPress={handleCardPress}
      style={styles.card}
    >
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.artist}>{item.artist}</Text>
        <Text style={styles.date}>Date: {item.date}</Text>
      </View>
      <TouchableOpacity>
        <AntDesign name="playcircleo" size={28} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>History</Text>
      <FlatList
        data={data.slice(0, visibleCount)}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
      {visibleCount < data.length && (
        <TouchableOpacity style={styles.loadMore} onPress={loadMore}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default History;
