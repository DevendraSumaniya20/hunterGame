import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import { LatLng, PlayerView, isHunterTeam } from '@hunt/shared';
import { roleHex } from '../theme';
import { PlayerMarker } from './PlayerMarker';

interface Props {
  players: PlayerView[];
  me: string;
  center: LatLng | null;
  /** draw catch circles around hunter-team players */
  catchRadiusM?: number;
}

const DELTA = 0.004; // ~400 m view

export const GameMap = forwardRef<MapView, Props>(({ players, me, center, catchRadiusM }, ref) => (
  <MapView
    ref={ref}
    style={StyleSheet.absoluteFill}
    showsUserLocation
    showsMyLocationButton
    initialRegion={
      center ? { latitude: center.lat, longitude: center.lng, latitudeDelta: DELTA, longitudeDelta: DELTA } : undefined
    }>
    {players.map(p => {
      if (!p.location || p.id === me) return null;
      return (
        <React.Fragment key={p.id}>
          {catchRadiusM && isHunterTeam(p.role) && (
            <Circle
              center={{ latitude: p.location.lat, longitude: p.location.lng }}
              radius={catchRadiusM}
              strokeColor={roleHex[p.role]}
              fillColor={roleHex[p.role] + '26'}
            />
          )}
          <PlayerMarker player={p} />
        </React.Fragment>
      );
    })}
  </MapView>
));
