import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  type AudioMode,
} from "expo-av";
import {
  useFonts,
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";
import { updateKey } from "@/api/updateKey";
import { CommonActions } from "@react-navigation/native";

const RECORD_AUDIO_MODE: Partial<AudioMode> = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
};

const PLAYBACK_AUDIO_MODE: Partial<AudioMode> = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
};

const VoiceTestScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [uploading, setUploading] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState<number | null>(
    null
  );

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const isPreparingRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

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
      await Audio.setAudioModeAsync(RECORD_AUDIO_MODE);
    };
    setupAudio();
  }, []);

  const startPulse = () => {
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
    }
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoopRef.current.start();
  };

  const stopPulse = () => {
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
      pulseLoopRef.current = null;
    }
    pulseAnim.setValue(1);
  };

  const clearCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownValue(null);
    setIsCountingDown(false);
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSecondsLeft(null);
  };

  const beginCountdown = () => {
    clearCountdown();
    setCountdownValue(3);
    setIsCountingDown(true);
    let current = 3;
    countdownIntervalRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdownValue(current);
      } else {
        clearCountdown();
        startRecording();
      }
    }, 1000);
  };

  // ---------- Handlers ----------
  const startRecording = async () => {
    if (recordingRef.current || recording || isPreparingRef.current) return;
    const newRecording = new Audio.Recording();
    try {
      isPreparingRef.current = true;
      setRecordedUri(null);
      clearRecordingTimer();
      await Audio.setAudioModeAsync(RECORD_AUDIO_MODE);
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      recordingRef.current = newRecording;
      setRecording(newRecording);
      startPulse();
      setRecordingSecondsLeft(5);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSecondsLeft((prev) => {
          if (prev === null) return prev;
          if (prev <= 1) {
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      recordingRef.current = null;
      try {
        await newRecording.stopAndUnloadAsync();
      } catch {
        /* noop */
      }
      stopPulse();
      clearRecordingTimer();
      console.error("Failed to start recording", err);
      Alert.alert("Recording error", "Could not start recording.");
    } finally {
      isPreparingRef.current = false;
    }
  };

  const stopRecording = async () => {
    try {
      const activeRecording = recordingRef.current || recording;
      if (!activeRecording) return;
      recordingRef.current = null;
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (!uri) throw new Error("Recording URI is null");

      setRecordedUri(uri);
      setRecording(null);
      stopPulse();
      setUploading(true);

      // upload here if needed...

      setUploading(false);
      setStep(3);
    } catch (err) {
      console.error("Stop recording error", err);
      Alert.alert("Recording error", "Could not stop recording.");
    } finally {
      isPreparingRef.current = false;
      clearRecordingTimer();
      clearCountdown();
    }
  };

  const handleUpdateKey = async (uri: string) => {
    try {
      setProcessing(true);
      const activeSound = soundRef.current || sound;
      if (activeSound) {
        try {
          await activeSound.stopAsync();
        } catch {
          /* ignore */
        }
        try {
          await activeSound.unloadAsync();
        } catch {
          /* ignore */
        }
        setSound(null);
        soundRef.current = null;
        setIsPlaying(false);
        await Audio.setAudioModeAsync(RECORD_AUDIO_MODE);
      }
      const response = await updateKey(uri);
      if (response?.success) {
        setKey(response?.data ?? null);
        DeviceEventEmitter.emit("profile:updated");
        setStep(4);
      } else {
        setKey(null);
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
      const activeSound = soundRef.current || sound;
      if (activeSound && isPlaying) {
        await activeSound.stopAsync().catch(() => undefined);
        await activeSound.unloadAsync().catch(() => undefined);
        setSound(null);
        soundRef.current = null;
        setIsPlaying(false);
        await Audio.setAudioModeAsync(RECORD_AUDIO_MODE);
        return;
      }

      if (activeSound) {
        await activeSound.unloadAsync().catch(() => undefined);
        setSound(null);
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordedUri });
      setSound(newSound);
      soundRef.current = newSound;
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate(async (status: any) => {
        if (!status?.isLoaded) return;
        if (status.didJustFinish) {
          setIsPlaying(false);
          setSound(null);
          soundRef.current = null;
          await Audio.setAudioModeAsync(RECORD_AUDIO_MODE);
          await newSound.unloadAsync().catch(() => undefined);
        }
      });
      await newSound.playAsync();
    } catch (e) {
      console.error(e);
      Alert.alert("Playback error", "Could not play the recording.");
      setIsPlaying(false);
      setSound(null);
      soundRef.current = null;
      await Audio.setAudioModeAsync(RECORD_AUDIO_MODE);
    }
  };

  const handleRepeat = async () => {
    const activeSound = soundRef.current || sound;
    if (activeSound) {
      try {
        await activeSound.stopAsync();
        await activeSound.unloadAsync();
      } catch (err) {
        console.error("Failed to reset playback", err);
      } finally {
        setSound(null);
        soundRef.current = null;
      }
    }
    setIsPlaying(false);
    await Audio.setAudioModeAsync(RECORD_AUDIO_MODE);
    setRecordedUri(null);
    clearRecordingTimer();
    recordingRef.current = null;
    setStep(2);
  };

  useEffect(() => {
    if (step === 2) {
      if (
        !recordedUri &&
        !recording &&
        !recordingRef.current &&
        !isCountingDown &&
        !countdownIntervalRef.current &&
        !isPreparingRef.current
      ) {
        beginCountdown();
      }
    } else {
      clearCountdown();
      clearRecordingTimer();
    }
  }, [step, recordedUri, recording, isCountingDown]);

  useEffect(() => {
    return () => {
      clearCountdown();
      clearRecordingTimer();
      stopPulse();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        recordingRef.current = null;
      }
      const activeSound = soundRef.current;
      if (activeSound) {
        activeSound.stopAsync().catch(() => undefined);
        activeSound.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  // ---------- UI model ----------
  const stepStyles = [
    { titleSize: 24, buttonSize: 60 },
    { titleSize: 48, buttonSize: 60 },
    { titleSize: 24, buttonSize: 100 },
    { titleSize: 24, buttonSize: 90 },
    { titleSize: 32, buttonSize: 80 },
  ];
  const currentStyle = stepStyles[step];

  const screens = [
    {
      lines: [
        { text: "Alright...", size: 48 },
        { text: "Take a deep breath and get ready!", size: 22 },
      ],
      icon: "arrow-forward",
    },
    { lines: [{ text: "Let's start testing", size: 40 }], icon: "arrow-forward" },
    { lines: [], icon: "mic" },
    { lines: [], icon: null, replayStep: true },
    {
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

  const shouldShowHeader =
    step !== 4 &&
    !(step === 2 && (isCountingDown || recording || (!recording && !recordedUri)));

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <View style={{ flex: 1 }}>
        {/* Full-bleed gradient background */}
        <LinearGradient
          colors={["#ff7eb3", "#6c5ce7"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.container}>
          {/* Header lines (skip on step 4 for a custom centered layout) */}
          {shouldShowHeader &&
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
                {typeof line.text === "object"
                  ? JSON.stringify(line.text)
                  : String(line.text)}
              </Text>
            ))}

          {/* Arrow button for step 0 & 1 */}
          {step < 2 && (
            <TouchableOpacity
              style={{
                ...styles.mainButton,
                ...styles.forwardButton,
                width: currentStyle.buttonSize,
                height: currentStyle.buttonSize,
                borderRadius: currentStyle.buttonSize / 2,
              }}
              onPress={() => setStep(step + 1)}
            >
              <Ionicons name={screens[step].icon as any} size={30} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Step 2: Recording */}
          {step === 2 && (
            <View style={styles.countdownWrap}>
              {isCountingDown && countdownValue !== null && (
                <Text style={styles.countdownText}>{countdownValue}</Text>
              )}

              {!isCountingDown && recording && (
                <View style={styles.recordingContent}>
                  <Text style={[styles.recordingText, styles.recordingPrompt]}>
                    Say "Ahhhhh" with your relaxed voice
                  </Text>

                  <Animated.View
                    style={[
                      styles.recordingBubble,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <Ionicons name="mic" size={48} color="#fff" />
                  </Animated.View>
                </View>
              )}

              {!isCountingDown && recording && recordingSecondsLeft !== null && (
                <Text style={styles.recordTimerText}>{recordingSecondsLeft}</Text>
              )}

              {uploading && <Text style={styles.statusText}>Uploading...</Text>}
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
                  <Ionicons name={isPlaying ? "pause" : "play"} size={40} color="#fff" />
                </TouchableOpacity>

                {processing && (
                  <Text style={styles.statusText}>Processing your voice...</Text>
                )}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.mainButton, styles.roundSm]}
                  onPress={handleRepeat}
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
              <View style={styles.step4Center}>
                <Text style={styles.step4Label}>Your Key is:</Text>
                <Text style={styles.step4Value}>
                  {key || (processing ? "Processing..." : "—")}
                </Text>
              </View>

              <View style={styles.step4Footer}>
                <TouchableOpacity
                  style={[styles.mainButton, styles.step4NextBtn]}
                  onPress={() => {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [
                          {
                            name: "MainTabs",
                            params: { screen: "Profile" },
                          },
                        ],
                      })
                    );
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
        </View>
      </View>
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
  countdownWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 40,
  },
  countdownText: {
    fontSize: 80,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
  },
  recordingContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  recordingBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordTimerText: {
    marginTop: 16,
    fontSize: 32,
    fontFamily: "Kanit_700Bold",
    color: "#fff",
  },
  recordingPrompt: {
    marginBottom: 24,
    fontSize: 24,
  },
  recordingText: {
    fontFamily: "Kanit_500Medium",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
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
  step4: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  step4Center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
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
  forwardButton: {
    position: "absolute",
    bottom: 40,
    right: 30,
  },
});
