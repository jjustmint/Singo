import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
  DeviceEventEmitter,
} from "react-native";
import { BlurView } from "expo-blur";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from "expo-image-picker";

import { getUser } from "@/api/getUser";
import { updateUserProfile } from "@/api/profile/updateUser";
import { updateProfilePhoto } from "@/api/profile/updatePhoto";
import type { RootStackParamList } from "../Types/Navigation";
import { GlobalConstant } from "@/constant";

const resolveRemoteImage = (photo?: string | null) => {
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

const MIN_PASSWORD_LENGTH = 6;

const EditProfile: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remotePhoto, setRemotePhoto] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const response = await getUser();
        if (response.success && response.data) {
          setUsername(response.data.username ?? "");
          setInitialUsername(response.data.username ?? "");
          const stampedPhoto = response.data.photo
            ? `${response.data.photo}?t=${Date.now()}`
            : null;
          setRemotePhoto(stampedPhoto);
          setLocalPhoto(null);
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        Alert.alert("Error", "Unable to load your profile details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const displayPhoto = useMemo(() => {
    if (localPhoto) {
      return localPhoto;
    }
    return resolveRemoteImage(remotePhoto);
  }, [localPhoto, remotePhoto]);

  const usernameChanged = useMemo(
    () => username.trim() !== initialUsername.trim(),
    [username, initialUsername]
  );

  const wantsPasswordChange = useMemo(
    () => Boolean(newPassword || confirmPassword),
    [newPassword, confirmPassword]
  );

  const pickImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "We need access to your photo library to choose a picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setLocalPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error", error);
      Alert.alert("Error", "Something went wrong while picking an image.");
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!username.trim()) {
      Alert.alert("Validation", "Username cannot be empty.");
      return;
    }

    const needsCredentialUpdate = usernameChanged || wantsPasswordChange;

    if (!needsCredentialUpdate && !localPhoto) {
      Alert.alert("Nothing to update", "Please change your profile information or photo before saving.");
      return;
    }

    if (needsCredentialUpdate) {
      if (!currentPassword) {
        Alert.alert("Validation", "Current password is required to update your profile.");
        return;
      }

      if (wantsPasswordChange) {
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
          Alert.alert("Validation", `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
          return;
        }

        if (newPassword !== confirmPassword) {
          Alert.alert("Validation", "New password and confirmation do not match.");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      if (needsCredentialUpdate) {
        const updateResponse = await updateUserProfile({
          username: username.trim(),
          password: currentPassword,
          newPassword: wantsPasswordChange ? newPassword : undefined,
        });

        if (!updateResponse.success) {
          throw new Error(updateResponse.message || "Unable to update your profile information.");
        }

        setInitialUsername(updateResponse.data.username ?? username.trim());
        setRemotePhoto(updateResponse.data.photo ?? remotePhoto);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      if (localPhoto) {
        const photoResponse = await updateProfilePhoto(localPhoto);
        if (!photoResponse.success) {
          throw new Error(photoResponse.message || "Unable to update your profile photo.");
        }
        const updatedPhoto = photoResponse.data.photo
          ? `${photoResponse.data.photo}?t=${Date.now()}`
          : remotePhoto;
        setRemotePhoto(updatedPhoto);
        setLocalPhoto(null);
      }

      Alert.alert("Success", "Your profile has been updated.", [
        {
          text: "OK",
          onPress: () => {
            DeviceEventEmitter.emit("profile:updated");
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("Profile update failed", error);
      Alert.alert("Update failed", error instanceof Error ? error.message : "Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confirmPassword,
    currentPassword,
    initialUsername,
    localPhoto,
    navigation,
    newPassword,
    remotePhoto,
    username,
  ]);

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Profile</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.card}>
      <View style={styles.photoSkeleton} />
      <View style={styles.formSkeleton}>
        <View style={styles.skeletonLineLarge} />
        <View style={styles.skeletonLineSmall} />
        <View style={styles.skeletonLineSmall} />
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.card}>
      <View style={styles.photoSection}>
        {displayPhoto ? (
          <Image source={{ uri: displayPhoto }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={42} color="#bbb" />
          </View>
        )}

        <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
          <Ionicons name="camera" size={16} color="#1b1b1b" />
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <Text style={styles.sectionSubtitle}>Update your display name.</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#777"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          {usernameChanged && (
            <Text style={styles.helperText}>
              Enter your current password below to confirm the username change.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <Text style={styles.sectionSubtitle}>
          Enter your current password to save changes. Use the fields below if you want to set a new password.
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Current Password{usernameChanged || wantsPasswordChange ? " *" : ""}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="••••••"
            placeholderTextColor="#777"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          {(usernameChanged || wantsPasswordChange) && (
            <Text style={styles.helperText}>Required to verify account changes.</Text>
          )}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••"
            placeholderTextColor="#777"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••"
            placeholderTextColor="#777"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={isSubmitting}
      >
        <Text style={styles.saveButtonText}>{isSubmitting ? "Saving..." : "Save Changes"}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundContainer}>
        <View style={styles.circlePink} />
        <View style={styles.circlePurple} />
        <View style={styles.circleBlue} />
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={Platform.OS === "ios" ? 40 : 80}
      >
        {renderHeader()}
        {isLoading ? renderSkeleton() : renderForm()}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#131313",
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  circlePink: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255, 102, 204, 0.9)",
    top: -30,
    left: -40,
  },
  circlePurple: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(160, 102, 255, 0.85)",
    top: 60,
    right: -50,
  },
  circleBlue: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(102, 140, 255, 0.75)",
    bottom: -40,
    left: 80,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "rgba(20, 20, 20, 0.85)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  photoSection: {
    alignItems: "center",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginTop: 18,
    gap: 8,
  },
  changePhotoText: {
    color: "#1b1b1b",
    fontWeight: "600",
    fontSize: 13,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: "#A3A3A3",
    fontSize: 13,
    marginTop: 6,
  },
  helperText: {
    color: "#B0B0B0",
    fontSize: 12,
    marginTop: 8,
  },
  inputGroup: {
    marginTop: 16,
  },
  inputLabel: {
    color: "#d4d4d4",
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  saveButton: {
    marginTop: 32,
    backgroundColor: "#6C63FF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  photoSkeleton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "center",
  },
  formSkeleton: {
    marginTop: 32,
    gap: 14,
  },
  skeletonLineLarge: {
    width: "80%",
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  skeletonLineSmall: {
    width: "60%",
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  inlineSkeleton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  coverFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});

export default EditProfile;
