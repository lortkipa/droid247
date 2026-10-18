import type { HealthStatus } from '@droid247/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, apiUrl } from '@/lib/api';
import { colors } from '@/lib/theme';

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

export default function StatusScreen() {
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

  const online = state.kind === 'online';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Image source={require('../../assets/icon-1024.png')} style={styles.logo} />
        <Text style={styles.title}>Droid247</Text>
        <Text style={styles.subtitle}>Backend status</Text>

        <View style={styles.statusRow}>
          {state.kind === 'checking' ? (
            <ActivityIndicator color={colors.signalOrange} />
          ) : (
            <View style={[styles.dot, { backgroundColor: online ? colors.online : colors.signalOrange }]} />
          )}
          <Text style={styles.statusText} testID="server-status">
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

        <Pressable
          onPress={() => void check()}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  logo: { width: 72, height: 72, borderRadius: 16 },
  title: { color: colors.mist, fontSize: 28, fontWeight: '700', marginTop: 12 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  statusText: { color: colors.white, fontSize: 22, fontWeight: '600' },
  details: { alignSelf: 'stretch', marginTop: 24, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  detailLabel: { color: colors.muted, fontSize: 14 },
  detailValue: { color: colors.mist, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  button: {
    marginTop: 24,
    alignSelf: 'stretch',
    backgroundColor: colors.signalOrange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
});
