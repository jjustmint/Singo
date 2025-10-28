import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
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
import { SignUpApi } from "@/api/auth/signin";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";

const SignupScreen: React.FC = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const router = useRouter();
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_700Bold,
  });

  const passwordValidation = useMemo(
    () => ({
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasMinLength: password.length >= 6,
    }),
    [password]
  );

  const isPasswordValid =
    passwordValidation.hasUppercase &&
    passwordValidation.hasNumber &&
    passwordValidation.hasMinLength;

  // Function to handle signup
  const handleSignup = async () => {
    const nextErrors: typeof fieldErrors = {};

    if (!username) {
      nextErrors.username = "Username is required";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    if (!isPasswordValid) {
      setFieldErrors({
        password:
          "Password must be at least 6 characters, include one uppercase letter, and contain a number.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({
        confirmPassword: "Passwords do not match",
      });
      return;
    }

    try {
      setFieldErrors({});
      const signupResponse = await SignUpApi(username, password);

      if (signupResponse.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: "SignIn" as never }],
        });
      } else {
        alert(
          signupResponse.message ||
            `Signup failed (status ${signupResponse.message})`
        );
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        {/* Status bar */}
        <StatusBar translucent backgroundColor="transparent" style="light" />

        {/* Top Gradient Background */}
        <LinearGradient
          colors={["#6D5DFB", "#C56FFF"]}
          style={styles.topBackground}
        />

        {/* Bottom White Background */}
        <View style={styles.bottomBackground} />

        {/* Scrollable Form */}
        <KeyboardAwareScrollView
          style={{ flex: 1, position: "absolute", width: "100%", height: "100%" }}
          contentContainerStyle={{ flexGrow: 1 }}
          enableOnAndroid
          extraScrollHeight={30}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            {/* White form container */}
            <View style={styles.formContainer}>
              <TouchableOpacity
                style={styles.backArrow}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={28} color="#5A5DFF" />
              </TouchableOpacity>

              <Text style={styles.signupText}>Sign Up</Text>

              {/* Username input */}
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#aaa" />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#ccc"
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                />
              </View>
              {fieldErrors.username ? (
                <Text style={styles.errorText}>{fieldErrors.username}</Text>
              ) : null}

              {/* Password input */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#aaa" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#ccc"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
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
              {fieldErrors.password ? (
                <Text style={styles.errorText}>{fieldErrors.password}</Text>
              ) : null}

              {/* Confirm Password input */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#aaa" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#ccc"
                  secureTextEntry={!confirmPasswordVisible}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                />
                <TouchableOpacity
                  onPress={() =>
                    setConfirmPasswordVisible(!confirmPasswordVisible)
                  }
                >
                  <Feather
                    name={confirmPasswordVisible ? "eye" : "eye-off"}
                    size={20}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword ? (
                <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>
              ) : null}

              <View style={styles.requirementsCard}>
                <Text style={styles.requirementsTitle}>Password must contain</Text>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasUppercase ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={passwordValidation.hasUppercase ? "#5A5DFF" : "#BBC1CF"}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasUppercase && styles.requirementTextMet,
                    ]}
                  >
                    At least one uppercase letter
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasNumber ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={passwordValidation.hasNumber ? "#5A5DFF" : "#BBC1CF"}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasNumber && styles.requirementTextMet,
                    ]}
                  >
                    At least one number (0-9)
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={passwordValidation.hasMinLength ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={passwordValidation.hasMinLength ? "#5A5DFF" : "#BBC1CF"}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      passwordValidation.hasMinLength && styles.requirementTextMet,
                    ]}
                  >
                    Minimum 6 characters
                  </Text>
                </View>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignup}
              >
                <Text style={styles.signupButtonText}>Sign Up</Text>
              </TouchableOpacity>

              {/* Login link */}
              <View style={styles.Login}>
                <Text style={{ color: "#666", fontFamily: "Kanit_500Medium" }}>
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (navigation.canGoBack && navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.navigate("SignIn" as never);
                    }
                  }}
                >
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
          </View>
        </KeyboardAwareScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  topBackground: {
    flex: 1,
    height: "40%", // top 40% gradient
  },
  bottomBackground: {
    flex: 1,
    height: "60%", // bottom 60% white
    backgroundColor: "#F7F7F7",
  },
  formContainer: {
    flex: 0.3,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: 30,
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
    fontSize: 14,
    color: "#5A5DFF",
    fontWeight: "500",
    fontFamily: "Kanit_500Medium",
  },
  signupButton: {
    backgroundColor: "#5A5DFF",
    paddingVertical: 10,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 10,
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
  requirementsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(90, 93, 255, 0.12)",
    shadowColor: "#5A5DFF",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: "Kanit_500Medium",
    color: "#5A5DFF",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requirementText: {
    marginLeft: 12,
    color: "#788097",
    fontSize: 14,
    fontFamily: "Kanit_400Regular",
  },
  requirementTextMet: {
    color: "#1E1F3A",
    fontFamily: "Kanit_500Medium",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontFamily: "Kanit_500Medium",
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 6,
  },
});
