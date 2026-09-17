import { UNITS, BUILDINGS, RESOURCES, RULES } from '@voidmarch/config';
import { z } from 'zod';
const hex = z
  .object({
    q: z.number().int().min(-100000).max(100000),
    r: z.number().int().min(-100000).max(100000),
  })
  .strict();
const wallet = z
  .object({
    STONE: z.number().int().min(0).max(1e7).default(0),
    GOLD: z.number().int().min(0).max(1e7),
    WOOD: z.number().int().min(0).max(1e7),
    IRON: z.number().int().min(0).max(1e7),
    FOOD: z.number().int().min(0).max(1e7),
  })
  .strict();
const unit = z.enum(Object.keys(UNITS) as [keyof typeof UNITS, ...Array<keyof typeof UNITS>]);
const building = z.enum(
  Object.keys(BUILDINGS) as [keyof typeof BUILDINGS, ...Array<keyof typeof BUILDINGS>],
);
const id = z.string().min(1).max(80);
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INSTALL_TURRET'), actorId: id, payload: z.object({}) }),
  z.object({ type: z.literal('UPGRADE_TURRET'), actorId: id, payload: z.object({}) }),
  z.object({ type: z.literal('MOVE_ROAD'), actorId: id, payload: hex }),
  z.object({
    type: z.literal('MOVE'),
    actorId: id,
    payload: z.object({ path: z.array(hex).min(1).max(12) }),
  }),
  z.object({
    type: z.literal('GATHER'),
    actorId: id,
    payload: z.object({ resource: z.enum(RESOURCES) }),
  }),
  z.object({ type: z.literal('ATTACK'), actorId: id, payload: z.object({ targetId: id }) }),
  z.object({ type: z.literal('CAPTURE'), actorId: id, payload: z.object({}) }),
  z.object({ type: z.literal('BUILD'), actorId: id, payload: hex.extend({ kind: building }) }),
  z.object({ type: z.literal('TERRAFORM'), actorId: id, payload: hex }),
  z.object({ type: z.literal('ROAD'), actorId: id, payload: hex }),
  z.object({ type: z.literal('REMOVE_ROAD'), actorId: id, payload: hex }),
  z.object({ type: z.literal('RECRUIT'), actorId: id, payload: z.object({ kind: unit }) }),
  z.object({ type: z.literal('REPAIR'), actorId: id, payload: z.object({}) }),
  z.object({ type: z.literal('DEMOLISH'), actorId: id, payload: z.object({}) }),
  z.object({ type: z.literal('UPGRADE'), actorId: id, payload: z.object({}) }),
  z.object({
    type: z.literal('INTERACT'),
    actorId: id,
    payload: z.object({ eventId: id.optional(), caravanId: id.optional() }),
  }),
  z.object({
    type: z.literal('ABILITY'),
    actorId: id,
    payload: z.object({
      ability: z.enum([
        'RALLY',
        'SURVEY',
        'MEND',
        'RESTORE',
        'HERO_MEND',
        'HERO_RESTORE',
        'HERO_SURVEY',
      ]),
    }),
  }),
  z.object({
    type: z.literal('PROPOSE'),
    actorId: id,
    payload: z.object({
      to: id,
      kind: z.enum(['TRIBUTE', 'TRADE']),
      payer: id,
      offer: wallet,
      request: wallet,
      duration: z.number().int().min(60000).max(604800000),
      parentId: id.optional(),
    }),
  }),
  z.object({
    type: z.literal('RESPOND'),
    actorId: id,
    payload: z.object({ proposalId: id, decision: z.enum(['ACCEPT', 'REJECT', 'CANCEL']) }),
  }),
  z.object({ type: z.literal('RESPAWN'), actorId: id, payload: z.object({}) }),
]);
export const actionSchema = z
  .object({ actionId: z.string().uuid(), clientTimestamp: z.number().finite() })
  .and(commandSchema);
export type Action = z.infer<typeof actionSchema>;
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Au moins 3 caractères.')
  .max(24, '24 caractères maximum.')
  .regex(/^[\p{L}\p{N} _'-]+$/u, 'Ce nom contient des caractères non autorisés.');
export const heroAppearanceSchema = z
  .object({
    head: z.number().int().min(0).max(14),
    armor: z.number().int().min(0).max(14),
    boots: z.number().int().min(0).max(14),
    weapon: z.number().int().min(0).max(14),
    colors: z
      .object({
        head: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        armor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        boots: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        weapon: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .strict(),
  })
  .strict();
export const authSchema = z.object({
  heroAppearance: heroAppearanceSchema.optional(),
  username: usernameSchema,
  password: z.string().min(10).max(128),
  email: z.string().email().max(254).optional(),
  faction: z.enum(['ASH', 'MASK', 'IRON']).default('ASH'),
});
export const guestSchema = z.object({
  username: usernameSchema,
  faction: z.enum(['ASH', 'MASK', 'IRON']),
});
export const settingsSchema = z
  .object({
    locale: z.enum(['fr']),
    masterVolume: z.number().min(0).max(100),
    musicVolume: z.number().min(0).max(100),
    sfxVolume: z.number().min(0).max(100),
    muteUnfocused: z.boolean(),
    cameraSpeed: z.number().min(0.3).max(3),
    edgeScrolling: z.boolean(),
    grid: z.boolean(),
    coordinates: z.boolean(),
    reducedMotion: z.boolean(),
    highContrast: z.boolean(),
    confirmDangerous: z.boolean(),
    autoCenterEvents: z.boolean(),
    combatNotifications: z.boolean(),
    realmNotifications: z.boolean(),
    input: z.enum(['mouse', 'touch']),
    uiScale: z.number().min(0.8).max(1.3),
    tutorialCompleted: z.boolean(),
    emblem: z.enum(['crown', 'sword', 'eye', 'tower', 'bird', 'star', 'key', 'bell']),
    bannerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bannerSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bannerShape: z.enum(['swallow', 'shield', 'square']),
    lastCameraQ: z.number().finite().min(-1e5).max(1e5),
    lastCameraR: z.number().finite().min(-1e5).max(1e5),
  })
  .partial()
  .strict();
export const chunksSchema = z
  .object({
    chunks: z
      .array(
        z.object({
          q: z.number().int().min(-3125).max(3125),
          r: z.number().int().min(-3125).max(3125),
        }),
      )
      .max(RULES.maxViewChunks),
  })
  .strict();
