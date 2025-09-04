import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#131313",
  },
  container: {
    flex: 1,
    position: "relative",
  },
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 0,
  },
  circlePink: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 102, 204, 1)",
    top: -40,
    left: -40,
  },
  circlePurple: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(160, 102, 255, 1)",
    top: 20,
    left: 30,
  },
  circleBlue: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(102, 140, 255, 1)",
    top: 60,
    left: -20,
  },
  blur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  contentWrapper: {
    zIndex: 2,
  },
  profileContainer: {
    padding: 20,
    marginTop: 50,
  },
  profileInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 40,
    marginRight: 10,
  },
  profileText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    left: 30,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  sectionContent: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
});

export default styles;
