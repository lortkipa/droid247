import { Image } from 'react-native';

type Props = { uri: string; size: number; onError: () => void };

/** Profile photo. Phones send no referrer, so remote photos load as is. */
export function AvatarPhoto({ uri, size, onError }: Props) {
  return <Image source={{ uri }} style={{ width: size, height: size }} onError={onError} />;
}
