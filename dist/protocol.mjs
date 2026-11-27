export const PROTOCOL = 1;
export const MAX_PLAYERS = 25;
export const TICK = 1 / 30;
export const ACTION = Object.freeze({
  forward: 1, back: 2, left: 4, right: 8, sprint: 16,
  crouch: 32, ads: 64, shoot: 128, use: 256, jump: 512,
  reload: 1024, pick: 2048, build: 4096, material: 8192, rotate: 16384,
  slot1: 32768, slot2: 65536, slot3: 131072, slot4: 262144, slot5: 524288
});
export const ACTION_MASK = (1 << 20) - 1;
export const STATUSES = ["bus","dive","glide","ground","dead"];
export const EQUIPMENT = ["","pick","pistol","smg","shotgun","rifle","sniper","bandage","medkit","small","big"];
export const EQUIPMENT_KIND = ["","pick","gun","gun","gun","gun","gun","med","med","med","med"];
