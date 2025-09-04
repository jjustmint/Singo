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

const VoiceTestScreen = ({ navigation }: any) => {
  // ---------- Hooks ----------
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Load Kanit font
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  // Setup audio
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
      setStep(3); // ⬅️ jump to confirmation step immediately
    } catch (err) {
      console.error("Stop recording error", err);
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

  // ---------- Step-specific data ----------
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
      replayStep: true, // we’ll use this flag to show buttons
    },
  ];

  const current = screens[step];

  // ---------- Conditional render for font loading ----------
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // ---------- Render ----------
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
          </View>
        )}

        {/* Step 3: After recording finished */}
{step === 3 && recordedUri && (
  <View style={{ flex: 1, width: "100%" }}>
    {/* Center area: text + play button */}
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* "Do you like it?" text */}
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

      {/* Play button */}
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

    {/* Bottom area: refresh (left) & check (right) */}
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        width: "97%",
        marginBottom: 10,
        alignSelf: "center",
      }}
    >
      {/* Refresh button (left) */}
      <TouchableOpacity
        style={{
          ...styles.mainButton,
          width: 60,
          height: 60,
          borderRadius: 40,
        }}
        onPress={() => {
          setRecordedUri(null);
          setStep(2); // back to recording
        }}
      >
        <Ionicons name="refresh" size={25} color="#fff" />
      </TouchableOpacity>

      {/* Check button (right) */}
      <TouchableOpacity
        style={{
          ...styles.mainButton,
          width: 60,
          height: 60,
          borderRadius: 40,
        }}
        onPress={() => navigation.navigate("Home")}
      >
        <Ionicons name="checkmark" size={25} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
)}

        {recording && (
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
