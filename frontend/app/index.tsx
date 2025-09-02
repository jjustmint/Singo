import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import MainNavigator from "./_layout";

export type TabKey = "home" | "stats" | "profile";

export default function Index() {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}
