import type { Hex } from './index';
export interface Alliance {
  id: string;
  name: string;
  emblem: 'shield' | 'eye' | 'crown' | 'star';
  leaderId: string;
  members: string[];
  createdAt: number;
  messages: { id: string; authorId: string; text: string; at: number }[];
  markers: (Hex & {
    id: string;
    authorId: string;
    label: string;
    kind: 'HELP' | 'ATTACK' | 'RESOURCE';
    expiresAt: number;
  })[];
}
export interface AllianceInvitation {
  id: string;
  allianceId: string;
  from: string;
  to: string;
  expiresAt: number;
}
export interface War extends Hex {
  id: string;
  from: string;
  to: string;
  objective: 'FORT' | 'MINE' | 'TRIBUTE';
  title: string;
  tributeGold: number;
  startsAt: number;
  endsAt: number;
  status: 'ACTIVE' | 'WON' | 'SETTLED' | 'EXPIRED';
}
export interface NuclearStrike extends Hex {
  radius?: number;
  scorchesTerrain?: boolean;
  id: string;
  ownerId: string;
  siloId: string;
  launchedAt: number;
  impactAt: number;
  resolvedAt?: number;
}
export interface StrategicSite extends Hex {
  id: string;
  kind: 'RADIO' | 'MINE' | 'SANCTUARY';
  ownerId?: string;
}
export interface Fallout extends Hex {
  intensity: number;
}
export interface StrategyState {
  alliances: Record<string, Alliance>;
  invitations: Record<string, AllianceInvitation>;
  wars: Record<string, War>;
  strikes: Record<string, NuclearStrike>;
  sites: Record<string, StrategicSite>;
  fallout: Record<string, Fallout>;
  nuclearReadyAt: Record<string, number>;
  lastTick: number;
  nextExpeditionAt: number;
  nextSiteAt: number;
}
export interface StrategyView {
  alliance?: Alliance;
  invitations: (AllianceInvitation & { name: string })[];
  allies: { realmId: string; position: Hex }[];
  wars: War[];
  strikes: NuclearStrike[];
  sites: StrategicSite[];
  fallout: Fallout[];
  expeditions: (Hex & { id: string; title: string; expiresAt: number })[];
  nuclearReadyAt: number;
}
