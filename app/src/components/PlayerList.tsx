import React from 'react';
import type { PlayerView } from '@hunt/shared';
import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';
import { Row } from './Row';
import { Section } from './Section';

interface Props {
  players: PlayerView[];
  me: string;
  hostId: string;
  header?: string;
  footer?: string;
}

export function PlayerList({ players, me, hostId, header, footer }: Props) {
  return (
    <Section header={header} footer={footer}>
      {players.map(p => {
        const tags = [p.id === me && 'you', p.id === hostId && 'host', !p.connected && 'offline'].filter(Boolean);
        return (
          <Row
            key={p.id}
            testID={`player-${p.name}`}
            leading={<Avatar name={p.name} color={p.color} size={28} />}
            title={tags.length ? `${p.name} (${tags.join(', ')})` : p.name}
            trailing={<RoleBadge role={p.role} />}
          />
        );
      })}
    </Section>
  );
}
