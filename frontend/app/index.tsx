import React, { useState } from "react";
import { View } from "react-native";
import Home from "./page/Home";
import Leaderboard from "../app/page/Leaderboard";
import BottomNav from "./components/BottomNav";
import Profile from "./page/Profile";
import ChooseKey from "../app/page/ChooseKey";
import MusicPlayer from "./page/MusicPlayer";

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
        return <MusicPlayer />;
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

