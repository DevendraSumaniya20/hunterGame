import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { PlayerView } from '@hunt/shared';
import { roleHex } from '../theme';

const SNAPSHOT_MS = 500;

/**
 * Custom-view pin. Android snapshots the child view into a bitmap, so it must track view changes
 * until the view has laid out, then stop for performance. Re-tracks when the role colour changes.
 */
export function PlayerMarker({ player }: { player: PlayerView }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const id = setTimeout(() => setTracking(false), SNAPSHOT_MS);
    return () => clearTimeout(id);
  }, [player.role]);

  if (!player.location) return null;
  return (
    <Marker
      coordinate={{ latitude: player.location.lat, longitude: player.location.lng }}
      title={player.name}
      tracksViewChanges={tracking}>
      {/* fill = role, ring = the player's own colour */}
      <View style={[styles.pin, { backgroundColor: roleHex[player.role], borderColor: player.color }]}>
        <Text style={styles.initial}>{player.name.charAt(0).toUpperCase()}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  initial: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
