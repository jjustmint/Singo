import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import {
  useFonts,
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_700Bold,
} from "@expo-google-fonts/kanit";
import { useRouter } from "expo-router";
import { setAuthToken, setUseId } from "@/util/cookies";
import { LoginApi } from "@/api/auth/login";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getUser } from "@/api/getUser";
import Svg, { Ellipse, SvgUri } from "react-native-svg";

const CARD_RADIUS = 26;
const ROOT_BG = "#ECECEC";
const CARD_BG = "#F3F3F3";
const HEADER_HEIGHT = 320;
const OVERLAP = 26;

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_MIN_HEIGHT = SCREEN_H - (HEADER_HEIGHT - OVERLAP);

const MICROPHONE_ASSET = require("@/assets/images/microphone.svg");
const MICROPHONE_URI = Image.resolveAssetSource(MICROPHONE_ASSET)?.uri ?? "";

const EllipseShape = () => (
  <Svg height="200" width="300" style={{ right: -45 }}>
    <Ellipse cx="100" cy="30" rx="85" ry="18" fill="grey" />
  </Svg>
);

const LoginScreen: React.FC = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  const handleLogin = async () => {
    const nextErrors: typeof fieldErrors = {};
    if (!username) {
      nextErrors.username = "Username is required";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setLoading(true);
    try {
      setFieldErrors({});
      const loginResponse = await LoginApi(username, password);
      if (loginResponse.success) {
        setAuthToken(loginResponse.data);
        const HaveKey = await getUser();
        const user_id = HaveKey.data.user_id;
        await setUseId(user_id);
        if(HaveKey.data.user_key !== null){
          navigation.reset({
  index: 0,
  routes: [
    {
      name: "MainTabs" as never,
      state: {
        index: 0,
        routes: [{ name: "Home" as never }],
      },
    },
  ],
});
        }else{
          navigation.reset({
            index: 0,
            routes: [{ name: "voicetest" as never }],
          });
        }
      } else {
        Alert.alert(
          "Login failed",
          "Incorrect username or password. Please try again."
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Network error", "We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5A5DFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: ROOT_BG }}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: CARD_BG }]} />

      <LinearGradient
        colors={["#5A62FF", "#C56FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFillObject,
          { height: HEADER_HEIGHT + OVERLAP + 80 }
        ]}
      />

      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAwareScrollView
            style={{ flex: 1, backgroundColor: "transparent" }}
            contentContainerStyle={{ flexGrow: 1 }}
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={80}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            
          >
            <View
              style={{
                height: HEADER_HEIGHT,
                paddingTop: 24,
                paddingHorizontal: 28,
                justifyContent: "center",
                backgroundColor: "transparent",
                overflow: "visible",
              }}
            >
              <Text style={styles.hello}>Hello!</Text>
              <Text style={styles.subtitle}>Welcome to Singo</Text>

              <View style={styles.microphoneContainer} pointerEvents="none">
                {MICROPHONE_URI ? (
                  <SvgUri
                    uri={MICROPHONE_URI}
                    width={150}
                    height={340}
                    style={styles.microphoneSvg}
                  />
                ) : null}
                  <EllipseShape />
                </View>
              </View>

            <View
              style={[
                styles.cardSheet,
                {
                  minHeight: SHEET_MIN_HEIGHT,
                  backgroundColor: CARD_BG,
                  marginTop: -OVERLAP,
                },
              ]}
            >
              <Text style={styles.cardTitle}>Login</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color="#B7BAC5" />
                <TextInput
                  style={[styles.input, { minHeight: 40 }]}
                  placeholder="Username"
                  placeholderTextColor="#B7BAC5"
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>
              {fieldErrors.username ? (
                <Text style={styles.errorText}>{fieldErrors.username}</Text>
              ) : null}

              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#B7BAC5" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#B7BAC5"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={passwordVisible ? "eye" : "eye-off"}
                    size={20}
                    color="#9FA3B2"
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <Text style={styles.errorText}>{fieldErrors.password}</Text>
              ) : null}
              <TouchableOpacity style={styles.cta} onPress={handleLogin} activeOpacity={0.9}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Login</Text>
                )}
              </TouchableOpacity>

              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don’t have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Signup" as never)}>
                  <Text style={[styles.link, { textDecorationLine: "underline" }]}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  hello: {
    fontSize: 56,
    lineHeight: 60,
    color: "#fff",
    fontFamily: "Kanit_700Bold",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 22,
    color: "#fff",
    fontFamily: "Kanit_500Medium",
  },
  microphoneContainer: {
    position: "absolute",
    right: -5,
    bottom: -40,
    width: 210,
    height: 360,
    alignItems: "center",
    zIndex: 5,
    elevation: 6,
  }, 
  microphoneSvg: {
    alignSelf: "center",
  },
  cardSheet: {
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 16,
    position: "relative",
    zIndex: 1,
  },

  cardTitle: {
    marginTop: 8,
    fontSize: 40,
    color: "#5A5DFF",
    fontFamily: "Kanit_700Bold",
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#2B2E3A",
    fontFamily: "Kanit_400Regular",
  },

  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  link: {
    fontSize: 14,
    color: "#5A5DFF",
    fontFamily: "Kanit_500Medium",
  },

  cta: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5A5DFF",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    marginTop: 30,
    shadowColor: "#5A5DFF",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 16,
  },
  ctaText: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Kanit_700Bold",
  },

  signupRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    color: "#6C6F7A",
    fontSize: 14,
    fontFamily: "Kanit_500Medium",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontFamily: "Kanit_500Medium",
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 6,
  },
});
