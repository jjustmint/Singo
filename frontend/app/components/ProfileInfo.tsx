import React, { useCallback, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getUser } from "@/api/getUser";
import { GlobalConstant } from "@/constant";

interface Props {
  songCount: number;
}

const DEFAULT_IMAGE = "https://bellfund.ca/wp-content/uploads/2018/03/demo-user.jpg";

const resolveProfileImage = (photo?: string | null) => {
  if (!photo) {
    return DEFAULT_IMAGE;
  }

  const normalised = photo.replace(/\\/g, "/");

  if (normalised.startsWith("http://") || normalised.startsWith("https://")) {
    return normalised;
  }

  const trimmed = normalised.replace(/^\/+/, "");
  const withoutDataPrefix = trimmed.startsWith("data/")
    ? trimmed.replace(/^data\//, "")
    : trimmed;

  return `${GlobalConstant.API_URL}/${withoutDataPrefix}`;
};

const ProfileInfo: React.FC<Props> = ({ songCount }) => {
  const [name, setName] = useState("Guest");
  const [profileImage, setProfileImage] = useState(DEFAULT_IMAGE);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchProfile = async () => {
        try {
          const response = await getUser();
          if (!isActive) {
            return;
          }

          if (response.success && response.data) {
            const { username, photo } = response.data;
            setName(username ?? "Guest");
            setProfileImage(resolveProfileImage(photo));
          }
        } catch (error) {
          if (isActive) {
            console.error("Failed to fetch profile info:", error);
          }
        }
      };

      fetchProfile();

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <Image source={{ uri: profileImage }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{name || "Guest"}</Text>
        <Text style={styles.countValue}>{songCount}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 50,
  },
  info: {
    marginLeft: 16,
    alignItems: "flex-start",
  },
  name: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    paddingBottom: 8,
  },
  countValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
});

export default ProfileInfo;
