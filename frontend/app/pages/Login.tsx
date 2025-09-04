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
import { setAuthToken } from "@/util/cookies";
import { LoginApi } from "@/api/auth/login";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_RADIUS = 26;
const ROOT_BG = "#ECECEC"; // original root color (behind everything)
const CARD_BG = "#F3F3F3"; // original card color
const HEADER_HEIGHT = 320;  // original gradient/header height
const OVERLAP = 26;         // card overlaps gradient by 26px

const { height: SCREEN_H } = Dimensions.get("window");
// Ensure the sheet covers the rest of the screen visually
const SHEET_MIN_HEIGHT = SCREEN_H - (HEADER_HEIGHT - OVERLAP);

const LoginScreen: React.FC = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  const handleLogin = async () => {
    if (!username || !password) {
      return Alert.alert("Please enter username and password");
    }
    setLoading(true);
    try {
      const loginResponse = await LoginApi(username, password);
      if (loginResponse.success) {
        setAuthToken(loginResponse.data);
        navigation.reset({
          index: 0,
          routes: [{ name: "Tabs" as never, params: { screen: "Home" } }],
        });
      } else {
        Alert.alert(loginResponse.message || "Login failed");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Network error " + e);
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
      {/* Layer 1: FULL CARD_BG so bottom always matches the sheet */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: CARD_BG }]} />

      {/* Layer 2: gradient only behind the header (+ extra to sit under the overlap curve) */}
      <LinearGradient
        colors={["#5A62FF", "#C56FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFillObject,
          { height: HEADER_HEIGHT + OVERLAP + 80 } // +20 buffer ensures no tiny gap
        ]}
      />

      {/* Status bar over gradient */}
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAwareScrollView
            style={{ flex: 1, backgroundColor: "transparent" }}
            contentContainerStyle={{ flexGrow: 1 }}
            enableOnAndroid
            extraScrollHeight={30}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            
          >
            {/* Transparent header content (gradient shows through) */}
            <View
              style={{
                height: HEADER_HEIGHT,
                paddingTop: 24,    // keep original spacing
                paddingHorizontal: 28,
                justifyContent: "center",
                backgroundColor: "transparent",
              }}
            >
              <Text style={styles.hello}>Hello!</Text>
              <Text style={styles.subtitle}>Welcome to Singo</Text>

              {/* Decorative ellipse shadow */}
              <View style={styles.ellipse} />
            </View>

            {/* The sheet/card that overlaps gradient and fills to bottom */}
            <View
              style={[
                styles.cardSheet,
                {
                  minHeight: SHEET_MIN_HEIGHT,
                  backgroundColor: CARD_BG,
                  marginTop: -OVERLAP, // overlap exactly like original
                },
              ]}
            >
              <Text style={styles.cardTitle}>Login</Text>

              {/* Username */}
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color="#B7BAC5" />
                <TextInput
                  style={[styles.input, { minHeight: 40 }]} // Added minHeight to ensure proper measurement
                  placeholder="Username"
                  placeholderTextColor="#B7BAC5"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#B7BAC5" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#B7BAC5"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={setPassword}
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

              {/* Forgot password */}
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.link}>Forgot password</Text>
              </TouchableOpacity>

              {/* Login */}
              <TouchableOpacity style={styles.cta} onPress={handleLogin} activeOpacity={0.9}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* Signup */}
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
  ellipse: {
    position: "absolute",
    right: 24,
    bottom: -12,
    width: 170,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 100,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  // The full-width sheet that matches the card background and fills to bottom
  cardSheet: {
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },

  cardTitle: {
    fontSize: 40,
    color: "#5A5DFF",
    fontFamily: "Kanit_700Bold",
    marginBottom: 14,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
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
});
