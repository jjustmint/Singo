import React, { useState } from "react";
import { View } from "react-native";
import Home from "./page/Home";
import Leaderboard from "./page/leaderboard";
import BottomNav from "./components/BottomNav";

export type TabKey = "home" | "stats" | "profile";

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <Home />;
      case "stats":
        return <Leaderboard />;
      case "profile":
        return <Profile />;
      default:
        return <Home />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#131313" }}>
      {/* Render current screen */}
      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {/* Persistent BottomNav */}
      <View style={{ position: "absolute", bottom: 80, left: 0, right: 0, alignItems: "center" }}> 
        <BottomNav active={activeTab} onTabPress={setActiveTab} />
      </View>
    </View>
  );
}
