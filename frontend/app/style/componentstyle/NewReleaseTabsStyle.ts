import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_SPACING = 20;

export const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 20,
    justifyContent: 'space-between',
    padding: 16,
  },
  textContainer: {
    marginTop: 8,
  },
  songName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  singer: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  likeIcon: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  previewButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export { CARD_WIDTH, CARD_SPACING };
