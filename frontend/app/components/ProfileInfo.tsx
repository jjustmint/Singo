import React from "react";
import { View, Text, Image } from "react-native";
import styles from "../style/componentstyle/ProfileInfoStyle";

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

export default ProfileInfo;
