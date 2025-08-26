// SongSelectedKey.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

type RootStackParamList = {
  SongSelectedKey: {
    title: string;
    artist: string;
    image: any;
  };
};

type SongSelectedKeyRouteProp = RouteProp<RootStackParamList, "SongSelectedKey">;

const keys = ["A", "B", "C", "D", "E", "F", "G"];

const SongSelectedKey = () => {
  const navigation = useNavigation();
  const route = useRoute<SongSelectedKeyRouteProp>();
  const { title, artist, image } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? keys.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === keys.length - 1 ? 0 : prev + 1));
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Background Image */}
      <ImageBackground
        source={image}
        className="flex-1 justify-between"
        resizeMode="cover"
        blurRadius={4}
      >
        {/* Header */}
        <View className="flex-row items-center p-4">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Song Info */}
        <View className="px-6">
          <Text className="text-white text-2xl font-bold">{title}</Text>
          <Text className="text-gray-300 text-lg mt-1">{artist}</Text>
        </View>

        {/* Key Selector */}
        <View className="items-center pb-12">
          <View className="flex-row items-center space-x-8">
            <TouchableOpacity onPress={handlePrev}>
              <Ionicons name="chevron-back" size={36} color="white" />
            </TouchableOpacity>

            <Text className="text-white text-6xl font-bold">
              {keys[currentIndex]}
            </Text>

            <TouchableOpacity onPress={handleNext}>
              <Ionicons name="chevron-forward" size={36} color="white" />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-400 text-base mt-2">Suggested</Text>

          {/* Confirm Button */}
          <TouchableOpacity
            onPress={() =>
              console.log("Selected Key:", keys[currentIndex])
            }
            className="mt-6 bg-white/10 rounded-full p-6"
          >
            <Ionicons name="checkmark" size={32} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default SongSelectedKey;