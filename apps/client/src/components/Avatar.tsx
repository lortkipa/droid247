import { Image, View } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

const DEFAULT_BACKGROUND = '#C9CCD1';
const DEFAULT_SILHOUETTE = '#FFFFFF';

/** Round profile photo, or the default (Facebook-style) silhouette when there is none. */
export function Avatar({ uri, size = 72 }: { uri: string | null; size?: number }) {
  const round = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[round, { backgroundColor: DEFAULT_BACKGROUND }]}
        accessibilityLabel="Profile photo"
      />
    );
  }

  return (
    <View style={[round, { backgroundColor: DEFAULT_BACKGROUND }]} accessibilityLabel="Profile photo">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={39} r={18} fill={DEFAULT_SILHOUETTE} />
        <Ellipse cx={50} cy={98} rx={36} ry={34} fill={DEFAULT_SILHOUETTE} />
      </Svg>
    </View>
  );
}
