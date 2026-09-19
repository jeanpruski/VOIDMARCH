import { describe, it, expect } from 'vitest';
import { settingsSchema } from '@voidmarch/protocol';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { bannerDesign, bannerSvg, realmBanner, bannerContrast } from '../apps/web/src/banner-art';

describe('identité bicolore', () => {
  it('conserve les anciens profils et normalise les valeurs inconnues', () => {
    expect(bannerDesign({ bannerColor: '#112233', bannerSecondary: '#abcdef' })).toMatchObject({
      primary: '#112233',
      secondary: '#abcdef',
      pattern: 'plain',
      miniShape: 'same',
    });
    expect(
      bannerSvg(
        bannerDesign({
          emblem: '<script>',
          bannerShape: 'unknown',
          bannerColor: 'red" onload="alert(1)',
        }),
      ),
    ).not.toContain('<script>');
    expect(bannerDesign({ emblem: 'toString' }).emblem).toBe('crown');
  });
  it('valide et transmet le même dessin aux autres joueurs sans modifier la couleur territoriale', () => {
    const now = Date.now(),
      state = createState('banner-test', now);
    const a = addPlayer(state, 'a', 'Alice', 'ASH', now);
    addPlayer(state, 'b', 'Basile', 'ASH', now);
    const patch = settingsSchema.parse({
      emblem: 'atom',
      bannerColor: '#ffcc22',
      bannerSecondary: '#662299',
      bannerAccent: '#222244',
      bannerPattern: 'diagonal',
      bannerShape: 'shield',
      miniFlagShape: 'pennant',
    });
    Object.assign(a.settings, patch);
    const own = worldView(state, 'a', now),
      other = worldView(state, 'b', now);
    expect(realmBanner(own, 'a')).toEqual(realmBanner(other, 'a'));
    expect(other.realms.find((r) => r.id === 'a')?.color).toBe('#ffcc22');
    expect(settingsSchema.safeParse({ bannerPattern: 'unknown' }).success).toBe(false);
    expect(settingsSchema.safeParse({ bannerAccent: 'not-a-color' }).success).toBe(false);
    expect(settingsSchema.safeParse({ miniFlagShape: 'unknown' }).success).toBe(false);
  });
  it('utilise la forme du mini-drapeau indépendamment et détecte le manque de contraste', () => {
    const d = bannerDesign({
      bannerShape: 'shield',
      miniFlagShape: 'pennant',
      bannerPattern: 'horizontal',
    });
    expect(bannerSvg(d)).not.toEqual(bannerSvg(d, true));
    expect(bannerSvg(d, true)).toContain('M3 3L97 35 3 67Z');
    expect(bannerContrast('#ffffff', '#ffffff')).toBe(1);
    expect(bannerContrast('#000000', '#ffffff')).toBe(21);
  });
});
