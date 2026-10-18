type Props = { uri: string; size: number; onError: () => void };

/**
 * Profile photo on web and desktop. A plain <img> instead of React Native's
 * Image, because that one can't drop the Referer header and Google refuses
 * profile photos (lh3.googleusercontent.com) requested with one.
 */
export function AvatarPhoto({ uri, size, onError }: Props) {
  return (
    <img
      src={uri}
      alt=""
      draggable={false}
      referrerPolicy="no-referrer"
      onError={onError}
      style={{ display: 'block', width: size, height: size, objectFit: 'cover' }}
    />
  );
}
