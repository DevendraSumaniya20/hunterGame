import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LatLng, isHunterTeam } from '@hunt/shared';
import { Button } from '../components/Button';
import { ChatButton } from '../components/ChatButton';
import { CatchToast } from '../components/CatchToast';
import { GameMap } from '../components/GameMap';
import { PhaseBanner } from '../components/PhaseBanner';
import { Radar } from '../components/Radar';
import { RoleBadge } from '../components/RoleBadge';
import { Screen } from '../components/Screen';
import { selectMe, useGameStore } from '../store/gameStore';
import { colors, floatingShadow, spacing, type } from '../theme';

interface Props {
  position: LatLng | null;
  locationError: string | null;
}

export function GameScreen({ position, locationError }: Props) {
  const view = useGameStore(s => s.view)!;
  const me = useGameStore(selectMe);
  const lastCatch = useGameStore(s => s.lastCatch);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const hunter = !!me && isHunterTeam(me.role);
  const runnersLeft = view.players.filter(p => p.role === 'runner');
  const blindfolded = hunter && view.phase === 'headstart';

  const subtitle = hunter
    ? view.phase === 'headstart'
      ? 'Runners are hiding. Get ready…'
      : `${runnersLeft.length} runner${runnersLeft.length === 1 ? '' : 's'} left. Catch them!`
    : view.phase === 'headstart'
      ? 'Run! Get as far away as you can.'
      : 'Stay hidden until the clock runs out.';

  const others = view.players.filter(p => p.id !== view.me && p.location);

  const showAll = () => {
    const coords = [...others.map(p => p.location!), ...(position ? [position] : [])].map(l => ({
      latitude: l.lat,
      longitude: l.lng,
    }));
    if (coords.length) mapRef.current?.fitToCoordinates(coords, { edgePadding: MAP_PADDING, animated: true });
  };

  // Jump to our own position once the first GPS fix arrives.
  const centered = useRef(false);
  useEffect(() => {
    if (!position || centered.current) return;
    centered.current = true;
    mapRef.current?.animateToRegion({ latitude: position.lat, longitude: position.lng, ...ZOOM });
  }, [position]);

  // Hunters: zoom out to everyone whenever the set of visible players changes (chase start, new helper).
  const visibleIds = others.map(p => p.id).join();
  useEffect(() => {
    if (hunter && visibleIds) showAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when who is visible changes
  }, [hunter, visibleIds]);

  return (
    <Screen padded={false}>
      <GameMap
        ref={mapRef}
        players={view.players}
        me={view.me}
        center={position}
        catchRadiusM={hunter ? view.settings.catchRadiusM : undefined}
      />

      {blindfolded && (
        <View style={styles.blindfold} pointerEvents="none">
          <Text style={styles.blindfoldTitle}>Eyes closed!</Text>
          <Text style={styles.blindfoldText}>The map opens when the head start ends.</Text>
        </View>
      )}

      <View style={[styles.top, { paddingTop: insets.top + spacing(1) }]} pointerEvents="box-none">
        <PhaseBanner phase={view.phase} endsAt={view.phaseEndsAt} subtitle={subtitle} />
        <CatchToast event={lastCatch} me={view.me} />
        {locationError ? (
          <Text style={styles.error}>{locationError}</Text>
        ) : (
          !position && (
            <Text style={styles.error} testID="gps-waiting">
              Waiting for GPS. Other players can’t see you yet.
            </Text>
          )
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(1) }]} pointerEvents="box-none">
        <View style={styles.pills}>
          <View style={styles.meRow}>
            <Text style={styles.meName}>{me?.name}</Text>
            {me && <RoleBadge role={me.role} testID="my-role" />}
          </View>
          <ChatButton />
        </View>
        {hunter ? (
          <Button title="Show everyone" variant="gray" onPress={showAll} style={styles.onMap} disabled={blindfolded} />
        ) : (
          <Radar distanceM={view.nearestHunterM} />
        )}
      </View>
    </Screen>
  );
}

const ZOOM = { latitudeDelta: 0.004, longitudeDelta: 0.004 }; // ~400 m
const MAP_PADDING = { top: 200, bottom: 200, left: 60, right: 60 };

const styles = StyleSheet.create({
  top: { position: 'absolute', left: spacing(2), right: spacing(2), top: 0, gap: spacing(1) },
  bottom: { position: 'absolute', left: spacing(2), right: spacing(2), bottom: 0, gap: spacing(1) },
  pills: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(1) },
  meRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    alignSelf: 'flex-start',
    backgroundColor: colors.floating,
    borderRadius: 999,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    ...floatingShadow,
  },
  meName: { ...type.headline, color: colors.label },
  onMap: { backgroundColor: colors.floating, ...floatingShadow },
  blindfold: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    padding: spacing(4),
  },
  blindfoldTitle: { ...type.largeTitle, color: colors.label },
  blindfoldText: { ...type.body, color: colors.secondaryLabel, textAlign: 'center' },
  error: { ...type.footnote, color: colors.red, backgroundColor: colors.floating, padding: spacing(1), borderRadius: 8 },
});
