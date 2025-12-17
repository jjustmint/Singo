import React, { useRef, useEffect } from "react";
import { TouchableOpacity, Animated, StyleSheet, LayoutChangeEvent, View } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TabKey } from "../index";

const TABS: TabKey[] = ["home", "stats", "profile"];

export default function BottomNav({ active, onTabPress }: { active: TabKey; onTabPress: (k: TabKey) => void; }) {
  const insets = useSafeAreaInsets();
  const indicatorX = useRef(new Animated.Value(0)).current;
  const buttonLayouts = useRef<{ [key in TabKey]?: number }>({}).current;

  const handleLayout = (key: TabKey) => (e: LayoutChangeEvent) => {
    const { x } = e.nativeEvent.layout;
    buttonLayouts[key] = x;
    if (key === active) indicatorX.setValue(x);
  };

  useEffect(() => {
    const targetX = buttonLayouts[active];
    if (typeof targetX === "number") {
      Animated.spring(indicatorX, { toValue: targetX, useNativeDriver: false, damping: 50, stiffness: 100 }).start();
    }
  }, [active]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: 16 + insets.bottom }]}>
      <BlurView intensity={50} tint="dark" style={styles.container}>
        <Animated.View style={[styles.indicator, { left: indicatorX }]} />
        {TABS.map((key) => (
          <TouchableOpacity key={key} onLayout={handleLayout(key)} onPress={() => onTabPress(key)} style={styles.iconButton}>
            <Feather name={key === "home" ? "home" : key === "stats" ? "bar-chart-2" : "user"} size={20} color={active === key ? "white" : "lightgray"} />
          </TouchableOpacity>
        ))}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  container: {
    width: 344,
    height: 72,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  iconButton: {
    width: 100,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  indicator: {
    position: "absolute",
    width: 100,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#6366f1",
    zIndex: 0,
  },
});
