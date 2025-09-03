import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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

const LoginScreen: React.FC = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();

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
        Alert.alert("Login successful!");
        setAuthToken(loginResponse.data); // Store token in cookies
        router.push("/page/Home"); // or your main app screen relative path
      } else {
        Alert.alert(loginResponse.message || "Login failed");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Network error" + e);
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
    <SafeAreaView style={styles.root}>
      {/* TOP GRADIENT HEADER */}
      <LinearGradient
        colors={["#5A62FF", "#C56FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.hello}>Hello!</Text>
        <Text style={styles.subtitle}>Welcome to Singo</Text>

        {/* Microphone + ellipse shadow */}

        <View style={styles.ellipse} />
      </LinearGradient>

      {/* CARD */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login</Text>

          {/* Username */}
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color="#B7BAC5" />
            <TextInput
              style={styles.input}
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

          {/* Login button */}
          <TouchableOpacity style={styles.cta} onPress={handleLogin} activeOpacity={0.9}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Sign up */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don’t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("/Signup")}>
              <Text style={[styles.link, { textDecorationLine: "underline" }]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const CARD_RADIUS = 26;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ECECEC" },

  header: {
    height: 320, // controls how tall the gradient area is
    paddingTop: 24,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
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

  // Decorative mic that overlaps the card
  mic: {
    position: "absolute",
    right: -12,
    top: 40,
    width: 170,
    height: 170,
    transform: [{ rotate: "-18deg" }],
    opacity: 0.98,
  },
  ellipse: {
    position: "absolute",
    right: 24,
    bottom: -12, // sits just above the card curve
    width: 170,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 100,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  card: {
    flex: 1,
    marginTop: -26, // overlap the gradient
    backgroundColor: "#F3F3F3",
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingHorizontal: 24,
    paddingTop: 24,
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
    // stronger, soft drop shadow like the mock
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
