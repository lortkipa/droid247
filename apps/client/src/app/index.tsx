import type { HealthStatus } from '@droid247/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { api, apiUrl } from '@/lib/api';
import { useAuth, useAuthStage } from '@/lib/auth';
import { brand, fonts, textMetrics, typography, useTheme } from '@/lib/theme';

const POLL_INTERVAL_MS = 5000;

type ServerState =
  | { kind: 'checking' }
  | { kind: 'online'; health: HealthStatus }
  | { kind: 'offline'; error: string };

function formatUptime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const { logOut, deleteAccount } = useAuth();
  const user = useAuthStage('signedIn')?.user;
  const [state, setState] = useState<ServerState>({ kind: 'checking' });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    try {
      const health = await api.health();
      setState({ kind: 'online', health });
    } catch (error) {
      setState({ kind: 'offline', error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [check]);

  // Rendered for a moment while the router leaves this screen.
  if (!user) return <Screen>{null}</Screen>;

  const online = state.kind === 'online';

  return (
    <Screen maxWidth={420}>
      <View style={styles.user}>
        <Avatar uri={user.avatarUrl} size={72} />
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={[typography.body, { color: theme.muted }]} numberOfLines={1}>
          {user.email}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[typography.small, { color: theme.muted }]}>Backend status</Text>
        <View style={styles.statusRow}>
          {state.kind === 'checking' ? (
            <ActivityIndicator color={brand.signalOrange} />
          ) : (
            <View
              style={[styles.dot, { backgroundColor: online ? theme.online : brand.signalOrange }]}
            />
          )}
          <Text style={[styles.statusText, { color: theme.text }]} testID="server-status">
            {state.kind === 'checking' ? 'Checking…' : online ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View style={styles.details}>
          <Detail label="API" value={apiUrl} />
          <Detail label="Platform" value={Platform.OS} />
          {state.kind === 'online' && (
            <>
              <Detail label="Version" value={state.health.version} />
              <Detail label="Uptime" value={formatUptime(state.health.uptimeSeconds)} />
              <Detail label="Server time" value={new Date(state.health.time).toLocaleTimeString()} />
            </>
          )}
          {state.kind === 'offline' && <Detail label="Error" value={state.error} />}
          {lastChecked && <Detail label="Checked" value={lastChecked.toLocaleTimeString()} />}
        </View>

        <Button title="Refresh" variant="secondary" onPress={() => void check()} />
      </View>

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button title="Log out" variant="secondary" onPress={logOut} />
        </View>
        <View style={styles.action}>
          <Button title="Delete account" variant="danger" onPress={deleteAccount} />
        </View>
      </View>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[typography.small, { color: theme.muted }]}>{label}</Text>
      <Text style={[typography.small, styles.detailValue, { color: theme.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  user: { alignItems: 'center', gap: 4 },
  name: { ...textMetrics, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, marginTop: 12 },
  card: {
    marginTop: 32,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { ...textMetrics, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  details: { marginTop: 16, marginBottom: 20, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', marginTop: 24, gap: 12 },
  action: { flex: 1 },
});
