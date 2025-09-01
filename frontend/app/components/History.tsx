import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";

interface HistoryItem {
  id: string;
  title: string;
  artist: string;
  date: string;
  image: string;
}

interface Props {
  data: HistoryItem[];
}

const History: React.FC<Props> = ({ data }) => {
  const [visibleCount, setVisibleCount] = useState(10);

  const loadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.artist}>{item.artist}</Text>
        <Text style={styles.date}>Date: {item.date}</Text>
      </View>
      <TouchableOpacity>
        <AntDesign name="playcircleo" size={28} color="white" />
      </TouchableOpacity>
    </View>
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

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 8,
    fontWeight: "bold",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    marginTop: 5,
    marginBottom: 10,
    padding: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  artist: {
    color: "#bbb",
    fontSize: 12,
  },
  date: {
    color: "#777",
    fontSize: 12,
  },
  loadMore: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#5B5BF1",
    borderRadius: 20,
  },
  loadMoreText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default History;