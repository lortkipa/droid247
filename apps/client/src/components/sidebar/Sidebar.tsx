import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FadingText } from '@/components/FadingText';
import { HEADER_HEIGHT } from '@/components/Header';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Logo } from '@/components/Logo';
import { useAuthStage } from '@/lib/auth';
import { canHover } from '@/lib/hover';
import { fonts, textMetrics, useTheme } from '@/lib/theme';

import { statusLabels, useSidebar } from './context';
import { SIDEBAR_PADDING } from './layout';
import { SidebarItem } from './SidebarItem';
import { Tooltip } from './Tooltip';

const ICON_SIZE = 20;
const AVATAR_SIZE = 32;

type Props = {
  /** Icons only, with tooltips; labels and profile text hidden. */
  collapsed: boolean;
  /** Button in the top row: collapse/expand when docked, close in the drawer. */
  topButton: { icon: IconName; label: string; onPress: () => void };
  /** Called after a tab is pressed (the drawer closes). */
  onNavigate?: () => void;
};

/** Contents of the sidebar: Droid on top; Settings and the signed-in profile at the bottom. */
export function Sidebar({ collapsed, topButton, onNavigate }: Props) {
  const theme = useTheme();
  const pathname = usePathname();
  const { status } = useSidebar();
  const user = useAuthStage('signedIn')?.user;

  const go = (href: '/' | '/settings') => {
    if (pathname !== href) router.navigate(href);
    onNavigate?.();
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.top}>
        <IconButton
          icon={topButton.icon}
          label={topButton.label}
          onPress={topButton.onPress}
          size={36}
          iconSize={ICON_SIZE}
          hoverColor={theme.surfaceHover}
        />
      </View>

      <View style={styles.group} accessibilityRole="tablist">
        <SidebarItem
          // The mark is drawn a bit larger: it has more empty space than a line icon.
          icon={() => (
            <View style={styles.markSlot}>
              <Logo size={36} expression={status} />
            </View>
          )}
          label="Droid"
          detail={statusLabels[status]}
          active={pathname === '/'}
          collapsed={collapsed}
          onPress={() => go('/')}
        />
      </View>

      <View style={styles.spacer} />

      <View style={styles.group}>
        <SidebarItem
          icon={(color) => <Icon name="settings" size={ICON_SIZE} color={color} />}
          label="Settings"
          active={pathname === '/settings'}
          collapsed={collapsed}
          onPress={() => go('/settings')}
        />
        {user && <Profile {...user} collapsed={collapsed} />}
      </View>
    </View>
  );
}

type ProfileProps = { name: string; email: string; avatarUrl: string | null; collapsed: boolean };

/** Who is signed in: avatar, with name and email beside it when there's room. */
function Profile({ name, email, avatarUrl, collapsed }: ProfileProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <View
      style={styles.profile}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      accessible
      accessibilityLabel={`Signed in as ${name}, ${email}`}
    >
      <Avatar uri={avatarUrl} size={AVATAR_SIZE} />
      {!collapsed && (
        <View style={styles.profileText}>
          <FadingText style={[styles.name, { color: theme.text }]} fadeColor={theme.surface}>
            {name}
          </FadingText>
          <FadingText style={[styles.email, { color: theme.muted }]} fadeColor={theme.surface}>
            {email}
          </FadingText>
        </View>
      )}
      {collapsed && canHover && hovered && <Tooltip label={name} detail={email} />}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { flex: 1, paddingHorizontal: SIDEBAR_PADDING, paddingBottom: SIDEBAR_PADDING },
  top: {
    height: HEADER_HEIGHT,
    justifyContent: 'flex-end',
    // Centres the 36px button over the 20px icons below it.
    paddingLeft: 2,
    marginBottom: 12,
  },
  group: { gap: 4 },
  spacer: { flex: 1 },
  markSlot: { width: ICON_SIZE, height: ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
  profile: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Centres the avatar in the collapsed sidebar.
    paddingHorizontal: 4,
  },
  profileText: { flex: 1 },
  name: { ...textMetrics, fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  email: { ...textMetrics, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
});
