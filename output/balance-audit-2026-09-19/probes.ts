import {writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {BUILDINGS,buildingUpgrade,RESOURCES} from '@voidmarch/config';
import {createState,createRealm,unitStats,writeTile,disk} from '@voidmarch/game-rules';
import {addPlayer,addBuilding,execute} from '../../apps/server/src/engine';
import {expeditionOffers} from '../../apps/server/src/expeditions';
import {actionSchema} from '@voidmarch/protocol';
const now=1900000000000;
const action=(type:string,actorId:string,payload:object,at=now)=>actionSchema.parse({type,actorId,payload,actionId:randomUUID(),clientTimestamp:at});
let s=createState('adventures-test',now);const r=addPlayer(s,'audit','Audit','MASK',now);
const cost={...BUILDINGS.WELL.cost};for(let l=1;l<5;l++)for(const k of RESOURCES)cost[k]+=buildingUpgrade('WELL',l)!.cost[k]??0;
r.wallet={...cost};const p={q:r.capital.q+1,r:r.capital.r};writeTile(s,p,{terrain:'PLAIN',ownerId:r.id});
const orders:any[]=[];
const build=execute(s,r.id,action('BUILD',r.id,{...p,kind:'WELL'}),now);orders.push(build.result);s=build.state;
const well=Object.values(s.buildings).find(b=>b.kind==='WELL')!;
for(let l=1;l<5;l++){const result=execute(s,r.id,action('UPGRADE',well.id,{}),now);orders.push(result.result);s=result.state;}
const wellProbe={cost,orders,remaining:s.realms.audit.wallet,ap:s.realms.audit.ap,offers:expeditionOffers(s,'audit',now).map(o=>({level:o.level,mode:o.expedition?.mode,reward:o.reward,distance:o.expedition?.targetDistance}))};
let battle=createState('siege-audit',now);
for(const id of ['a','b']){battle.realms[id]=createRealm(id,id,'MASK',{q:id==='a'?-5:5,r:0},now);battle.realms[id].protectedUntil=0;battle.realms[id].wallet={GOLD:10000,WOOD:10000,STONE:10000,IRON:10000,FOOD:10000};}
for(const p of disk({q:0,r:0},8))writeTile(battle,p,{terrain:'PLAIN'});
const wall=addBuilding(battle,battle.realms.b,{q:1,r:0},'ATOMIC_WALL',now);
const attacker={id:'siege',ownerId:'a',kind:'NEUTRON_MORTAR' as const,q:0,r:0,trainingBonus:100,hp:unitStats({kind:'NEUTRON_MORTAR',trainingBonus:100}).hp,createdAt:now,updatedAt:now};battle.units.siege=attacker;
const rounds=[];
for(let turn=0;turn<12;turn++){
 battle.realms.a.ap=2;battle.realms.b.ap=1;
 const hit=execute(battle,'a',action('ATTACK','siege',{targetId:wall.id}),now);battle=hit.state;
 const afterHit=battle.buildings[wall.id]?.hp;
 const repair=execute(battle,'b',action('REPAIR',wall.id,{}),now);battle=repair.state;
 rounds.push({attack:hit.result.accepted,attackReason:hit.result.reason,afterHit,repair:repair.result.accepted,repairReason:repair.result.reason,afterRepair:battle.buildings[wall.id]?.hp});
}
writeFileSync('output/balance-audit-2026-09-19/probes.json',JSON.stringify({wellProbe,siege:{rounds,defenderWallet:battle.realms.b.wallet}},null,2));
console.log(JSON.stringify({wellProbe,siege:{rounds,defenderWallet:battle.realms.b.wallet}},null,2));
