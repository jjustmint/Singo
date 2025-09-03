import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
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

const SignupScreen: React.FC = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  // Function to handle signup
  const handleSignup = async () => {
    if (!username || !password || !confirmPassword) {
      return alert("Please fill in all fields");
    }
    if (password !== confirmPassword) {
      return alert("Passwords do not match");
    }

    try {
      const response = await fetch("http://10.4.153.66:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log("Signup response:", data);

      if (response.ok) {
        alert("Signup successful! You can now login.");
        router.push("/pages/Login");
      } else {
        alert(data.message || `Signup failed (status ${response.status})`);
      }
    } catch (error) {
      console.error(error);
      alert("Network error");
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
      <LinearGradient
        colors={["#6D5DFB", "#C56FFF"]}
        style={styles.topSection}
      ></LinearGradient>

      <View style={styles.formContainer}>
        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => router.back()} // Back button navigation
        >
          <Ionicons name="arrow-back" size={28} color="#5A5DFF" />
        </TouchableOpacity>

        <Text style={styles.signupText}>Sign up</Text>

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

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#aaa" />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#ccc"
            secureTextEntry={!confirmPasswordVisible}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
          >
            <Feather
              name={confirmPasswordVisible ? "eye" : "eye-off"}
              size={20}
              color="#aaa"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
          <Text style={styles.signupButtonText}>Sign up</Text>
        </TouchableOpacity>

        <View style={styles.Login}>
          <Text style={{ color: "#666", fontFamily: "Kanit_500Medium" }}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/pages/Login")}>
            <Text
              style={[
                styles.linkText,
                {
                  fontFamily: "Kanit_500Medium",
                  textDecorationLine: "underline",
                },
              ]}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eee",
  },
  topSection: {
    flex: 0.6,
  },
  formContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    flex: 2,
    padding: 50,
    backgroundColor: "#F7F7F7",
  },
  backArrow: {
    marginBottom: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
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
  linkText: {
    fontSize: 12,
    color: "#5A5DFF",
    fontWeight: "500",
    fontFamily: "Kanit_500Medium",
  },
  signupButton: {
    backgroundColor: "#5A5DFF",
    paddingVertical: 10,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 45,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Kanit_700Bold",
  },
  Login: {
    fontSize: 12,
    flexDirection: "row",
    justifyContent: "center",
    fontWeight: "500",
    fontFamily: "Kanit_500Medium",
  },
});
