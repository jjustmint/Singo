import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import {
  useFonts,
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";
import { updateKey } from "@/api/updateKey";

const VoiceTestScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [uploading, setUploading] = useState(false); // track upload
  const [key, setKey] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  useEffect(() => {
    const setupAudio = async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permission required",
          "Microphone access is needed to record."
        );
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    };
    setupAudio();
  }, []);

  // ---------- Handlers ----------
  const startRecording = async () => {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("Recording URI is null");

      setRecordedUri(uri);
      setRecording(null);
      setUploading(true); // start upload

      // ---------- Upload to backend ----------
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "recording.mp3",
        type: "audio/mp3",
      } as any);
      setUploading(false); // finished uploading
      setStep(3);
    } catch (err) {
      console.error("Stop recording error", err);
    }
  };

  const handleUpdateKey = async (uri: string) => {
    try {
      const response = await updateKey(uri);
      setKey(response.data)
      console.log("Update key response:", response.data);
      
      if (response.success) {
        Alert.alert("Success", "Key updated successfully!");
      } else {
        Alert.alert("Error", response.message || "Failed to update key.");
      }
    } catch (error) {
      console.error("Update key error", error);
      Alert.alert("Error", "An error occurred while updating the key.");
    }
  };

  const playRecording = async () => {
    if (!recordedUri) return;
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync({
      uri: recordedUri,
    });
    setSound(newSound);
    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        newSound.unloadAsync();
        setSound(null);
      }
    });
    await newSound.playAsync();
  };

  const stepStyles = [
    { titleSize: 24, buttonSize: 90 },
    { titleSize: 48, buttonSize: 90 },
    { titleSize: 24, buttonSize: 100 },
    { titleSize: 24, buttonSize: 90 },
  ];
  const currentStyle = stepStyles[step];

  const screens = [
    {
      lines: [
        {
          text: "Alright! Take a deep breath,\nshake off the nerves, and let’s\nhave some fun singing!",
          size: 24,
        },
      ],
      icon: "arrow-forward",
    },
    { lines: [{ text: "Start testing!", size: 48 }], icon: "arrow-forward" },
    {
      lines: [
        { text: "Please sing comfortably", size: 26 },
        { text: "Ahhhhh", size: 40 },
      ],
      icon: "mic",
    },
    {
      lines: [],
      icon: null,
      replayStep: true,
    },
  ];

  const current = screens[step];

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={["#ff7eb3", "#6c5ce7"]} style={styles.container}>
        {screens[step].lines.map((line, index) => (
          <Text
            key={index}
            style={{
              fontSize: line.size,
              fontFamily: "Kanit_700Bold",
              color: "#fff",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {line.text}
          </Text>
        ))}

        {/* Arrow button for step 0 & 1 */}
        {step < 2 && (
          <TouchableOpacity
            style={{
              ...styles.mainButton,
              width: currentStyle.buttonSize,
              height: currentStyle.buttonSize,
              borderRadius: currentStyle.buttonSize / 2,
            }}
            onPress={() => setStep(step + 1)}
          >
            <Ionicons name={current.icon as any} size={40} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Step 2: Recording */}
        {step === 2 && (
          <View style={{ alignItems: "center" }}>
            {!recordedUri ? (
              <TouchableOpacity
                style={{
                  ...styles.mainButton,
                  width: currentStyle.buttonSize,
                  height: currentStyle.buttonSize,
                  borderRadius: currentStyle.buttonSize / 2,
                }}
                onPress={recording ? stopRecording : startRecording}
              >
                <Ionicons
                  name={recording ? "stop" : "mic"}
                  size={40}
                  color="#fff"
                />
              </TouchableOpacity>
            ) : null}

            {uploading && (
              <Text
                style={{
                  color: "yellow",
                  marginTop: 20,
                  fontFamily: "Kanit_500Medium",
                }}
              >
                Uploading...
              </Text>
            )}
          </View>
        )}

        {/* Step 3: After recording finished */}
        {step === 3 && recordedUri && (
          <View style={{ flex: 1, width: "100%" }}>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontFamily: "Kanit_700Bold",
                  color: "#fff",
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                Do you like it?
              </Text>

              <TouchableOpacity
                style={{
                  ...styles.mainButton,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                }}
                onPress={playRecording}
              >
                <Ionicons name="play" size={40} color="#fff" />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "97%",
                marginBottom: 10,
                alignSelf: "center",
              }}
            >
              <TouchableOpacity
                style={{
                  ...styles.mainButton,
                  width: 60,
                  height: 60,
                  borderRadius: 40,
                }}
                onPress={() => {
                  setRecordedUri(null);
                  setStep(2);
                }}
              >
                <Ionicons name="refresh" size={25} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  ...styles.mainButton,
                  width: 60,
                  height: 60,
                  borderRadius: 40,
                }}
                onPress={async () => await handleUpdateKey(recordedUri)} // Call updateKey API
              >
                <Ionicons name="checkmark" size={25} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {recording && !uploading && (
          <Text
            style={{
              color: "red",
              marginTop: 20,
              fontFamily: "Kanit_500Medium",
            }}
          >
            Recording...
          </Text>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

export default VoiceTestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  mainButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});
