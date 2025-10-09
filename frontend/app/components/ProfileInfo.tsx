import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { GlobalConstant } from "@/constant";

interface Props {
  songCount: number;
  isLoading?: boolean;
  name?: string;
  photo?: string | null;
}

const resolveProfileImage = (photo?: string | null) => {
  if (!photo) {
    return null;
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

const ProfileInfo: React.FC<Props> = ({ songCount, isLoading, name = "Guest", photo }) => {
  const resolvedImage = resolveProfileImage(photo);
  const initials = name ? name.charAt(0).toUpperCase() : "U";

  const showSkeleton = Boolean(isLoading);

  return (
    <View style={styles.container}>
      {showSkeleton ? (
        <>
          <View style={styles.skeletonImage} />
          <View style={styles.info}>
            <View style={styles.skeletonLineLarge} />
            <View style={styles.skeletonLineSmall} />
          </View>
        </>
      ) : (
        <>
          {resolvedImage ? (
            <Image source={{ uri: resolvedImage }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{initials}</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{name || "Guest"}</Text>
            <Text style={styles.countValue}>{songCount}</Text>
          </View>
        </>
      )}
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
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
    backgroundColor: "#2b2b2b",
  },
  skeletonLineLarge: {
    width: 160,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2b2b2b",
  },
  skeletonLineSmall: {
    width: 100,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#2b2b2b",
    marginTop: 10,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 50,
    backgroundColor: "#2b2b2b",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
});

export default ProfileInfo;
