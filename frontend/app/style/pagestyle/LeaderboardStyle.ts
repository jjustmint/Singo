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
    zIndex: 0,
  },
  circlePink: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 150,
    backgroundColor: "rgba(255, 102, 204, 1)",
    top: -80,
    left: -60,
  },
  circlePurple: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 130,
    backgroundColor: "rgba(160, 102, 255, 1)",
    top: 10,
    right: -80,
  },
  circleBlue: {
    position: "absolute",
    width: 300,
    height: 200,
    borderRadius: 110,
    backgroundColor: "rgba(102, 140, 255, 1)",
    top: 150,
    left: -40,
  },
  blur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    paddingBottom: 40,
    zIndex: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: 30,
    marginHorizontal: 20,
    marginBottom: 10,
  },
});

export default styles;
