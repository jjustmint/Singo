import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 8,
    fontWeight: "bold",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    marginTop: 5,
    marginBottom: 10,
    padding: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  artist: {
    color: "#bbb",
    fontSize: 12,
  },
  date: {
    color: "#777",
    fontSize: 12,
  },
  loadMore: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#5B5BF1",
    borderRadius: 20,
  },
  loadMoreText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
