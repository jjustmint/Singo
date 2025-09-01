import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
} from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";

interface Song {
  id: string;
  image: string;
  Username: string;
  Score: number;
}

// --- Mock Data (unique IDs, full URLs) ---
const mockSongs: Song[] = [
  {
    id: "1",
    image:
      "https://instagram.fbkk12-4.fna.fbcdn.net/v/t51.2885-19/534320000_18280875100278255_8182804402947192077_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fbkk12-4.fna.fbcdn.net&_nc_cat=103&_nc_oc=Q6cZ2QGYKeGk5eQCJGSYUEeOmwzqkK71l22NVgIdDDkNAi_L4wCuEVaWMu1z33WgEBwY3BI&_nc_ohc=OgbLmwM91MUQ7kNvwFTSeK9&_nc_gid=FHcWwCfrS4gsKXBhyyneDg&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfUzb6weuJUHeFIz9_Ndb5ipGAZXVg1GjmVJ7hWDlYRplQ&oe=68AE0923&_nc_sid=7a9f4b",
    Username: "Mint",
    Score: 500,
  },
  {
    id: "2",
    image:
      "https://instagram.fbkk12-1.fna.fbcdn.net/v/t51.2885-19/483793639_582646071447421_2225266543520428426_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fbkk12-1.fna.fbcdn.net&_nc_cat=101&_nc_oc=Q6cZ2QE5PTgbQ3Zg7pzaX5N0bYaeaaWb4100uzYQNs23qVfOQ4NR02toJPbKLDpeDEBGoAw&_nc_ohc=zjkGbrK4PKEQ7kNvwGr9-yt&_nc_gid=lUpw89Qr7pZCKD5Whu4nkg&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfXA9Cyt-VURE3m5XOxQUGxy25FGJV4ybUgGLzEHjtH51w&oe=68AE15E8&_nc_sid=7a9f4b",
    Username: "Moji",
    Score: 420,
  },
  {
    id: "3",
    image:
      "https://instagram.fbkk9-2.fna.fbcdn.net/v/t51.2885-19/475186896_635530289165601_6330963074896709836_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fbkk9-2.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2QGEZx32M5rY13OQC9rtOE0GU8E-vpsLmzkuBFzYs1QWAIJVw0oELsuvjWtrTNx3Obw&_nc_ohc=GLFcdUuuVUsQ7kNvwFUHEm7&_nc_gid=TOTyStga0396RMRO4C5Ybw&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfXLGYzAiMbedQ7j1ymkkAXax3iWIApC4jVJqSLqpQbMtg&oe=68AE0A79&_nc_sid=7a9f4b",
    Username: "Tawan",
    Score: 350,
  },
  {
    id: "4",
    image:
      "https://media.craiyon.com/2025-04-14/UhsvmSImSpCmLoU63yYfPA.webp",
    Username: "Sumo",
    Score: 200,
  },
  {
    id: "5",
    image:
      "https://instagram.fbkk13-1.fna.fbcdn.net/v/t51.2885-19/424981991_693916446188501_4459556500580131694_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fbkk13-1.fna.fbcdn.net&_nc_cat=105&_nc_oc=Q6cZ2QEwLSZtLZnHBHDnz8gYYbd3BmBNm7Pnchva3-K5WlBK9-rSQ1lPxdEGSmDd8CgI3YI&_nc_ohc=GVmLC7HOgMsQ7kNvwHo7Ae0&_nc_gid=kZZFfUWrEIte6j09UtV2Dw&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfU-lck0UZfpmJ8qt7TqkfSYmhG-vXMy_b_4t-EMhTHTBw&oe=68ADF288&_nc_sid=7a9f4b",
    Username: "Mark",
    Score: 150,
  },
  {
    id: "6",
    image:
      "https://instagram.fbkk13-3.fna.fbcdn.net/v/t51.2885-19/289084315_407939914609544_2315086558871607880_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43OTMuYzIifQ&_nc_ht=instagram.fbkk13-3.fna.fbcdn.net&_nc_cat=108&_nc_oc=Q6cZ2QFO6r6jhAlJ_b0hSH6oGRJnoTHCv06TDP55yIAcMnh_urmjpfR87liyVKEqh2AqW6A&_nc_ohc=WJD5b-pblOwQ7kNvwGJXXEX&_nc_gid=ezpfs82D-1PoQq0Fr3hhzw&edm=APoiHPcBAAAA&ccb=7-5&oh=00_AfWaJ0lLuH-TY0vTJDniWNySlYU5I_yufETgG9GHXepvKA&oe=68B32625&_nc_sid=22de04",
    Username: "IT",
    Score: 100,
  },
];

// --- Card Component ---
const SongCard: React.FC<{ song: Song; index: number }> = ({ song, index }) => {
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const rankColor = rankColors[index] || "#fff";
  const rankSize = index < 3 ? 50 - index * 4 : 25;

  return (
    <View style={styles.card}>
      <Text style={[styles.rank, { color: rankColor, fontSize: rankSize }]}>
        {index + 1}
      </Text>
      <Image source={{ uri: song.image }} style={styles.image} />
      <View style={styles.textContainer}>
        <Text style={styles.Username} numberOfLines={1}>
          {song.Username}
        </Text>
        <Text style={styles.Score} numberOfLines={1}>
          {song.Score}
        </Text>
      </View>
      <AntDesign name="right" size={30} color="white" style={styles.icon} />
    </View>
  );
};

// --- Screen Component ---
const WeeklyRanking: React.FC = () => {
  return (
    <FlatList
      data={mockSongs}
      keyExtractor={(item, index) => `${item.id}-${index}`} 
      renderItem={({ item, index }) => <SongCard song={item} index={index} />}
      contentContainerStyle={{ paddingBottom: 20 }}
      scrollEnabled={false}
      nestedScrollEnabled
    />
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginVertical: 10,
    elevation: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
  },
  rank: {
    width: 30,
    textAlign: "center",
    fontWeight: "bold",
    marginRight: 8,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  Username: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
  },
  Score: {
    fontSize: 15,
    color: "#bbb",
    marginTop: 2,
  },
  icon: {
    marginLeft: 10,
    alignSelf: "center",
  },
});

export default WeeklyRanking;