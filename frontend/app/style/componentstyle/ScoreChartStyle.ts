import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: 10,
  },
  playerContainer: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  rankText: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  scoreBox: {
    width: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
});

export default styles;
