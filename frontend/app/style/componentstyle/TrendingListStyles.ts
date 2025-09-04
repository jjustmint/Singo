import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    marginVertical: 10,
    elevation: 1,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 12,
  },
  rightContainer: {
    flex: 1,
    justifyContent: "space-between",
    flexDirection: "column",
    height: 96,
    position: "relative",
  },
  textContainer: {
    marginBottom: 10,
  },
  songName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  artist: {
    fontSize: 14,
    color: "#bbb",
    marginTop: 2,
  },
  iconButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderRadius: 50,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
});
