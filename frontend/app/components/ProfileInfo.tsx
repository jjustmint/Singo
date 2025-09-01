import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface Props {
  name: string;
  songCount: number;
  profileImage: string;
}

const ProfileInfo: React.FC<Props> = ({ name, songCount, profileImage }) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: "https://www.thaiwatsadu.com/_next/image?url=https%3A%2F%2Fpim.thaiwatsadu.com%2FTWDPIM%2Fweb%2FWatermark%2FImage%2F0302%2F60390467_3.jpg&w=3840&q=75" }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{songCount}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  info: {
    marginTop: 15,
    alignItems: "center",
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: "#5B5BF1",
    borderRadius: 12,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
  },
});

export default ProfileInfo;
