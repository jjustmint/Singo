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
  const [uploading, setUploading] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  useEffect(() => {
    const setupAudio = async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission required", "Microphone access is needed to record.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1, // do not mix
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    };
    setupAudio();
  }, []);

  // ---------- Handlers ----------
  const startRecording = async () => {
    try {
      if (recording) return; // guard against double-tap
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Recording error", "Could not start recording.");
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
      setUploading(true);

      // If you actually upload, do it here with your API / FormData
      // const formData = new FormData();
      // formData.append("file", { uri, name: "recording.mp3", type: "audio/mp3" } as any);
      // await yourUpload(formData);

      setUploading(false);
      setStep(3);
    } catch (err) {
      console.error("Stop recording error", err);
      Alert.alert("Recording error", "Could not stop recording.");
    }
  };

  const handleUpdateKey = async (uri: string) => {
    try {
      setProcessing(true);
      const response = await updateKey(uri);
      setKey(response?.data ?? null);
      if (response?.success) {
        setStep(4);
      } else {
        Alert.alert("Error", response?.message || "Failed to update key.");
      }
    } catch (error) {
      console.error("Update key error", error);
      Alert.alert("Error", "An error occurred while updating the key.");
    } finally {
      setProcessing(false);
    }
  };

  const playRecording = async () => {
    try {
      if (!recordedUri) return;
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordedUri });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync();
          setSound(null);
        }
      });
      await newSound.playAsync();
    } catch (e) {
      console.error(e);
      Alert.alert("Playback error", "Could not play the recording.");
    }
  };

  // ---------- UI model ----------
  const stepStyles = [
    { titleSize: 24, buttonSize: 90 },
    { titleSize: 48, buttonSize: 90 },
    { titleSize: 24, buttonSize: 100 },
    { titleSize: 24, buttonSize: 90 },
    { titleSize: 32, buttonSize: 80 },
  ];
  const currentStyle = stepStyles[step];

  const screens = [
    {
      lines: [
        {
          text: "Alright! Take a deep breath,\nshake off the nerves, and let's\nhave some fun singing!",
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
    {
      // Step 4 uses a custom layout, so these lines won't be rendered
      lines: [
        { text: "Your Key is:", size: 28 },
        { text: "—", size: 48 },
      ],
      icon: "musical-notes",
    },
  ];

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={["#ff7eb3", "#6c5ce7"]} style={styles.container}>
        {/* Header lines (skip on step 4 for a custom centered layout) */}
        {step !== 4 &&
          screens[step].lines.map((line, index) => (
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
              {typeof line.text === "object" ? JSON.stringify(line.text) : String(line.text)}
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
            <Ionicons name={screens[step].icon as any} size={40} color="#fff" />
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
                <Ionicons name={recording ? "stop" : "mic"} size={40} color="#fff" />
              </TouchableOpacity>
            ) : null}

            {uploading && (
              <Text style={styles.statusText}>
                Uploading...
              </Text>
            )}
          </View>
        )}

        {/* Step 3: After recording finished */}
        {step === 3 && recordedUri && (
          <View style={{ flex: 1, width: "100%" }}>
            <View style={styles.centerWrap}>
              <Text style={styles.titleLarge}>Do you like it?</Text>

              <TouchableOpacity
                style={[styles.mainButton, { width: 100, height: 100, borderRadius: 50 }]}
                onPress={playRecording}
              >
                <Ionicons name="play" size={40} color="#fff" />
              </TouchableOpacity>

              {processing && (
                <Text style={styles.statusText}>
                  Processing your voice...
                </Text>
              )}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.mainButton, styles.roundSm]}
                onPress={() => {
                  setRecordedUri(null);
                  setStep(2);
                }}
              >
                <Ionicons name="refresh" size={25} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mainButton,
                  styles.roundSm,
                  { opacity: processing ? 0.5 : 1 },
                ]}
                onPress={async () => {
                  if (recordedUri) await handleUpdateKey(recordedUri);
                }}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size={25} color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={25} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: Show detected key result (center text, bottom button) */}
        {step === 4 && (
          <View style={styles.step4}>
            {/* Centered content */}
            <View style={styles.step4Center}>
              <Text style={styles.step4Label}>Your Key is:</Text>
              <Text style={styles.step4Value}>
                {key || (processing ? "Processing..." : "—")}
              </Text>
            </View>

            {/* Bottom navigation button */}
            <View style={styles.step4Footer}>
              <TouchableOpacity
                style={[styles.mainButton, styles.step4NextBtn]}
                onPress={() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Tabs", params: { screen: "Home" } }],
                  });
                }}
              >
                <Ionicons name="arrow-forward" size={25} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {recording && !uploading && step === 2 && (
          <Text style={[styles.statusText, { color: "red" }]}>Recording...</Text>
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
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6c5ce7",
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
  statusText: {
    color: "yellow",
    marginTop: 20,
    fontFamily: "Kanit_500Medium",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleLarge: {
    fontSize: 28,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "97%",
    marginBottom: 10,
    alignSelf: "center",
  },
  roundSm: {
    width: 60,
    height: 60,
    borderRadius: 40,
  },

  // --- Step 4 layout ---
  step4: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: "space-between", // pushes center and footer apart
  },
  step4Center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center", // vertical center
  },
  step4Label: {
    fontSize: 28,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  step4Value: {
    fontSize: 48,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  step4Footer: {
    width: "100%",
    alignItems: "center",
  },
  step4NextBtn: {
    width: 60,
    height: 60,
    borderRadius: 40,
  },
});
