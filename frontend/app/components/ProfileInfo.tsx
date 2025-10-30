import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { GlobalConstant } from "@/constant";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  songCount: number;
  isLoading?: boolean;
  name?: string;
  photo?: string | null;
  userKey?: string | null;
  onTestKeyPress?: () => void;
}

export const resolveProfileImage = (photo?: string | null) => {
  if (!photo) {
    return null;
  }

  const trimmedInput = photo.trim();
  if (!trimmedInput) {
    return null;
  }

  const normalised = trimmedInput.replace(/\\/g, "/");

  if (normalised.startsWith("http://") || normalised.startsWith("https://")) {
    return normalised;
  }

  const trimmed = normalised.replace(/^\/+/, "");
  const withoutDataPrefix = trimmed.startsWith("data/")
    ? trimmed.replace(/^data\//, "")
    : trimmed;

  return `${GlobalConstant.API_URL}/${withoutDataPrefix}`;
};

const ProfileInfo: React.FC<Props> = ({
  songCount,
  isLoading,
  name = "Guest",
  photo,
  userKey,
  onTestKeyPress,
}) => {
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
            <View style={styles.skeletonKeyRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonLineMedium} />
            </View>
            <View style={styles.skeletonActionsRow}>
              <View style={styles.skeletonTag} />
              <View style={styles.skeletonButton} />
            </View>
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
            <View style={styles.keyRow}>
              <Ionicons name="musical-notes-outline" size={16} color="#fff" />
              <Text style={styles.keyText}>
                {userKey ? `Vocal Key: ${userKey}` : "No vocal key detected yet"}
              </Text>
            </View>
            <View style={styles.actionsRow}>
              <Text style={styles.countValue}>Songs practised: {songCount}</Text>
              {onTestKeyPress && (
                <TouchableOpacity
                  style={styles.testKeyButton}
                  onPress={onTestKeyPress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mic-outline" size={16} color="#131313" />
                  <Text style={styles.testKeyLabel}>Test Key</Text>
                </TouchableOpacity>
              )}
            </View>
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
    marginRight: 12,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  keyText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  testKeyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  testKeyLabel: {
    marginLeft: 6,
    color: "#131313",
    fontSize: 14,
    fontWeight: "600",
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
    backgroundColor: "#1c1c1c",
  },
  skeletonLineLarge: {
    width: 160,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2b2b2b",
    marginBottom: 10,
  },
  skeletonLineMedium: {
    width: 140,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2b2b2b",
  },
  skeletonKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  skeletonIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2b2b2b",
    marginRight: 10,
  },
  skeletonActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  skeletonTag: {
    width: 140,
    height: 18,
    borderRadius: 10,
    backgroundColor: "#2b2b2b",
    marginRight: 12,
  },
  skeletonButton: {
    width: 100,
    height: 32,
    borderRadius: 18,
    backgroundColor: "#2b2b2b",
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
