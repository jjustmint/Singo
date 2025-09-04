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
      <Image
        source={{ uri: profileImage }}
        style={styles.image}
      />
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
