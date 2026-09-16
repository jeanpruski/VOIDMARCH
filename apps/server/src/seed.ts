import { WorldRepository, prisma } from './repository.js';
import { defaultOptions } from './engine.js';
import { tickWorld } from './simulation.js';
const repo = new WorldRepository(defaultOptions);
await repo.init();
await repo.mutate((s) => tickWorld(s, Date.now(), new Set()));
console.log('Monde initialisé ; les royaumes existants sont conservés.');
await prisma.$disconnect();
