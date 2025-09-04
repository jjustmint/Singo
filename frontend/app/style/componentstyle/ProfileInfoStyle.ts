import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  info: {
    marginTop: 15,
    alignItems: "center",
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: "#5B5BF1",
    borderRadius: 12,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
  },
});

export default styles;
