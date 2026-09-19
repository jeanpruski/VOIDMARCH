import {
  EMBLEM_IDS,
  UNITS,
  BUILDINGS,
  RESOURCES,
  RULES,
  MAX_GROUP_UNITS,
  MAX_MOVE_STEPS,
} from '@voidmarch/config';
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
  z.object({
    type: z.literal('RESUPPLY'),
    actorId: id,
    payload: z.object({ unitIds: z.array(id).min(1).max(MAX_GROUP_UNITS) }).strict(),
  }),
  z.object({
    type: z.literal('ARMY_SAVE'),
    actorId: id,
    payload: z
      .object({
        armyId: id.optional(),
        name: z.string().trim().min(1).max(32),
        unitIds: z.array(id).min(1).max(MAX_GROUP_UNITS),
        formation: z.enum(['COMPACT', 'LINE', 'PROTECTED']),
      })
      .strict(),
  }),
  z.object({
    type: z.literal('ARMY_DELETE'),
    actorId: id,
    payload: z.object({ armyId: id }).strict(),
  }),
  z.object({
    type: z.literal('OPERATION_CREATE'),
    actorId: id,
    payload: hex
      .extend({
        title: z.string().trim().min(3).max(64),
        objective: z.enum(['CAPTURE', 'HOLD', 'SIEGE']),
        holdMinutes: z.union([z.literal(5), z.literal(15), z.literal(30)]).default(15),
      })
      .strict(),
  }),
  z.object({
    type: z.literal('OPERATION_JOIN'),
    actorId: id,
    payload: z
      .object({
        operationId: id,
        role: z.enum(['ASSAULT', 'ARTILLERY', 'AIR', 'SUPPORT']),
        ready: z.boolean(),
      })
      .strict(),
  }),
  z.object({
    type: z.literal('OPERATION_START'),
    actorId: id,
    payload: z.object({ operationId: id }).strict(),
  }),
  z.object({
    type: z.literal('OPERATION_CANCEL'),
    actorId: id,
    payload: z.object({ operationId: id }).strict(),
  }),
  z.object({ type: z.literal('EMBARK'), actorId: id, payload: z.object({ unitId: id }).strict() }),
  z.object({
    type: z.literal('DISEMBARK'),
    actorId: id,
    payload: z.object({ unitId: id, q: hex.shape.q, r: hex.shape.r }).strict(),
  }),
  z.object({
    type: z.literal('MOVE_GROUP'),
    actorId: id,
    payload: z
      .object({
        orders: z
          .array(
            z.discriminatedUnion('type', [
              z
                .object({
                  type: z.literal('MOVE'),
                  actorId: id,
                  payload: z.object({ path: z.array(hex).min(1).max(MAX_MOVE_STEPS) }).strict(),
                })
                .strict(),
              z.object({ type: z.literal('MOVE_ROAD'), actorId: id, payload: hex }).strict(),
            ]),
          )
          .min(1)
          .max(MAX_GROUP_UNITS),
      })
      .strict(),
  }),
  z.object({
    type: z.literal('MISSION_ACCEPT'),
    actorId: id,
    payload: z.object({ offerId: id }).strict(),
  }),
  z.object({
    type: z.literal('MISSION_ABANDON'),
    actorId: id,
    payload: z.object({ missionId: id }).strict(),
  }),
  z.object({
    type: z.literal('ALLIANCE_CREATE'),
    actorId: id,
    payload: z.object({
      name: z.string().trim().min(3).max(32),
      emblem: z.enum(['shield', 'eye', 'crown', 'star']),
    }),
  }),
  z.object({ type: z.literal('ALLIANCE_INVITE'), actorId: id, payload: z.object({ to: id }) }),
  z.object({
    type: z.literal('ALLIANCE_RESPOND'),
    actorId: id,
    payload: z.object({ invitationId: id, accept: z.boolean() }),
  }),
  z.object({ type: z.literal('ALLIANCE_LEAVE'), actorId: id, payload: z.object({}) }),
  z.object({
    type: z.literal('ALLIANCE_CHAT'),
    actorId: id,
    payload: z.object({ text: z.string().trim().min(1).max(400) }),
  }),
  z.object({
    type: z.literal('ALLIANCE_MARK'),
    actorId: id,
    payload: hex.extend({
      label: z.string().trim().min(1).max(64),
      kind: z.enum(['HELP', 'ATTACK', 'RESOURCE']),
    }),
  }),
  z.object({
    type: z.literal('ALLIANCE_UNMARK'),
    actorId: id,
    payload: z.object({ markerId: id }),
  }),
  z.object({
    type: z.literal('DECLARE_WAR'),
    actorId: id,
    payload: hex.extend({
      to: id,
      objective: z.enum(['FORT', 'MINE', 'TRIBUTE']),
      tributeGold: z.number().int().min(0).max(100000),
    }),
  }),
  z.object({ type: z.literal('SETTLE_WAR'), actorId: id, payload: z.object({ warId: id }) }),
  z.object({ type: z.literal('CLAIM_SITE'), actorId: id, payload: z.object({ siteId: id }) }),
  z.object({ type: z.literal('CLEANUP'), actorId: id, payload: hex }),
  z.object({ type: z.literal('LAUNCH_NUKE'), actorId: id, payload: hex }),
  z.object({
    type: z.literal('RENAME_UNIT'),
    actorId: id,
    payload: z.object({ name: z.string().trim().min(1).max(32) }),
  }),
  z.object({ type: z.literal('INSTALL_TURRET'), actorId: id, payload: z.object({}) }),
  z.object({ type: z.literal('UPGRADE_TURRET'), actorId: id, payload: z.object({}) }),
  z.object({ type: z.literal('MOVE_ROAD'), actorId: id, payload: hex }),
  z.object({
    type: z.literal('MOVE'),
    actorId: id,
    payload: z.object({ path: z.array(hex).min(1).max(MAX_MOVE_STEPS) }),
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
    payload: z.object({
      eventId: id.optional(),
      caravanId: id.optional(),
      expeditionId: id.optional(),
    }),
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
    realmName: z.union([
      z.literal(''),
      z
        .string()
        .trim()
        .min(3)
        .max(40)
        .regex(/^[\p{L}\p{N} _’'-]+$/u),
    ]),
    emblem: z.enum(EMBLEM_IDS),
    bannerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bannerSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bannerShape: z.enum(['swallow', 'shield', 'square', 'pennant']),
    bannerPattern: z.enum(['plain', 'diagonal', 'vertical', 'horizontal']),
    bannerAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    miniFlagShape: z.enum(['same', 'swallow', 'shield', 'square', 'pennant']),
    lastCameraQ: z.number().finite().min(-1e5).max(1e5),
    lastCameraR: z.number().finite().min(-1e5).max(1e5),
  })
  .partial()
  .strict();
export const realmIdentitySchema = settingsSchema.pick({
  realmName: true,
  emblem: true,
  bannerColor: true,
  bannerSecondary: true,
  bannerAccent: true,
  bannerPattern: true,
  bannerShape: true,
  miniFlagShape: true,
});
export const authSchema = z.object({
  realmIdentity: realmIdentitySchema.optional(),
  heroAppearance: heroAppearanceSchema.optional(),
  username: usernameSchema,
  password: z.string().min(10).max(128),
  email: z.string().email().max(254).optional(),
  faction: z.enum(['ASH', 'MASK', 'IRON']).default('ASH'),
});
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
