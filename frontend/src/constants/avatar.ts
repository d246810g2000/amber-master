import User from "lucide-react/dist/esm/icons/user";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Smile from "lucide-react/dist/esm/icons/smile";
import Activity from "lucide-react/dist/esm/icons/activity";
import Bot from "lucide-react/dist/esm/icons/bot";
import React from 'react';

export interface AvatarStyle {
  id: string;
  name: string;
  icon: React.ReactElement;
}

export const AVATAR_STYLES: AvatarStyle[] = [
  { id: 'avataaars', name: '標準人像', icon: React.createElement(User, { size: 14 }) },
  { id: 'lorelei', name: '活潑色塊', icon: React.createElement(Sparkles, { size: 14 }) },
  { id: 'micah', name: '藝術插畫', icon: React.createElement(Smile, { size: 14 }) },
  { id: 'animals', name: 'Ｑ萌貓咪', icon: React.createElement(Smile, { size: 14 }) },
  { id: 'mascot', name: '可愛小妖怪', icon: React.createElement(Activity, { size: 14 }) },
  { id: 'big-smile', name: 'Ｑ團大笑臉', icon: React.createElement(Smile, { size: 14 }) },
  { id: 'bottts', name: '科技機器人', icon: React.createElement(Bot, { size: 14 }) },
];

export const PRESET_SEEDS = [
  "Felix", "Aneka", "Midnight", "Bubba", "Sasha", "Snuggles", "Gizmo", "Pepper", "Zoe", "Jasper",
  "Lucky", "Shadow", "Panda", "Smokey", "Daisy", "Buster", "Ginger", "Cookie", "Lulu", "Bear",
  "Ranger", "Scooter", "Moose", "Nala", "Simba", "Boots", "Rex", "Ace", "Oliver", "Buddy",
  "Cleo", "Misty", "Luna", "Apollo", "Zeus", "Athena", "Atlas", "Odin", "Loki", "Thor",
  "Apple", "Binary", "Code", "Delta", "Echo", "Falcon", "Gamma", "Halo", "Infinity", "Joker",
  "King", "Legacy", "Matrix", "Node", "Orbit", "Pixel", "Quantum", "Retro", "Sync", "Turbo",
  "Blue", "Red", "Green", "Yellow", "Cyan", "Magenta", "Silver", "Gold", "Diamond", "Ruby",
  "Tokyo", "Paris", "London", "Sydney", "Berlin", "Dubai", "NewYork", "Seoul", "Rome", "Cairo",
] as const;
