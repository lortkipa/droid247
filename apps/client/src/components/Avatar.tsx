import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

import { AvatarPhoto } from './AvatarPhoto';

const DEFAULT_BACKGROUND = '#C9CCD1';
const DEFAULT_SILHOUETTE = '#FFFFFF';

/**
 * Round profile photo, or the default (Facebook-style) silhouette when there
 * is none or it fails to load.
 */
export function Avatar({ uri, size = 72 }: { uri: string | null; size?: number }) {
  // The photo that failed to load, so a new uri gets a fresh try.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = uri !== null && uri !== failedUri;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: DEFAULT_BACKGROUND,
      }}
      accessibilityLabel="Profile photo"
    >
      {showPhoto ? (
        <AvatarPhoto uri={uri} size={size} onError={() => setFailedUri(uri)} />
      ) : (
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={39} r={18} fill={DEFAULT_SILHOUETTE} />
          <Ellipse cx={50} cy={98} rx={36} ry={34} fill={DEFAULT_SILHOUETTE} />
        </Svg>
      )}
    </View>
  );
}
