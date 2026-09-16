import { defaultOptions } from '../apps/server/src/engine';
// Ordinary gameplay fixtures are deterministic. Rarity tests supply their own draw.
defaultOptions.recruitBonus = () => 0;
