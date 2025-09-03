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

const LoginScreen: React.FC = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // expo-router

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
      const response = await fetch("http://10.4.153.66:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Login successful!");
        router.push("/"); // or your main app screen relative path
      } else {
        Alert.alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
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
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#6D5DFB", "#C56FFF"]} style={styles.topSection}>
        <Text style={styles.helloText}>Hello!</Text>
        <Text style={styles.welcomeText}>Welcome to Singo</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.loginText}>Login</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#aaa" />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#ccc"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#aaa" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#ccc"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Feather
              name={passwordVisible ? "eye" : "eye-off"}
              size={20}
              color="#aaa"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={[styles.linkText, { textDecorationLine: "underline" }]}>
            Forgot password
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signUp}>
          <Text style={{ color: "#666", fontFamily: "Kanit_500Medium" }}>
            Don’t have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/pages/Signup")}>
            <Text
              style={[
                styles.linkText,
                {
                  fontFamily: "Kanit_500Medium",
                  textDecorationLine: "underline",
                },
              ]}
            >
              Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eee" },
  topSection: {
    flex: 1.2,
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 34,
  },
  helloText: {
    fontSize: 64,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Kanit_700Bold",
    alignSelf: "flex-start",
  },
  welcomeText: {
    fontSize: 24,
    color: "#fff",
    fontFamily: "Kanit_500Medium",
    alignSelf: "flex-start",
  },
  formContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    flex: 2,
    padding: 50,
    backgroundColor: "#F7F7F7",
  },
  loginText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#5A5DFF",
    marginBottom: 20,
    fontFamily: "Kanit_700Bold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 29,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 20,
    color: "#333",
    fontFamily: "Kanit_400Regular",
  },
  forgotPassword: {
    fontSize: 16,
    alignItems: "flex-end",
    marginBottom: 24,
    fontFamily: "Kanit_500Medium",
  },
  linkText: {
    fontSize: 12,
    color: "#5A5DFF",
    fontWeight: "500",
    fontFamily: "Kanit_500Medium",
  },
  loginButton: {
    backgroundColor: "#5A5DFF",
    paddingVertical: 10,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Kanit_700Bold",
  },
  signUp: {
    fontSize: 12,
    flexDirection: "row",
    justifyContent: "center",
    fontWeight: "500",
    fontFamily: "Kanit_500Medium",
  },
});
