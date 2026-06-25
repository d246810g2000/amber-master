import React from "react";
import { cn, isMobileDevice } from "../lib/utils";
import { PetTier } from "../types";


// Import tiered pet components
import {
  GreenSlimePet,
  BlackCatPet,
  PikachuPet,
  MushroomPet,
  IceGirlPet,
  FireBoyPet,
  RabbitWarriorPet
} from "./pets/ClassicPets";

import {
  SlimeKingPet,
  RibbonPigPet,
  SonicRingsPet,
  MooglePet
} from "./pets/EpicPets";

import {
  KirbyPet,
  TotoroPet,
  SnorlaxPet,
  ChickPet
} from "./pets/LegendaryPets";

import {
  UnicornPet,
  PandaMasterPet,
  ScarabPet,
  KingdomHeartsShadowPet,
  MetroidPet,
  IceFireSiblingsPet,
  KuribohPet
} from "./pets/UltimatePets";

interface PetRendererProps {
  petId: string | null | undefined;
  tier?: PetTier;
  className?: string;
}

export const PetRenderer: React.FC<PetRendererProps> = ({ petId, tier, className }) => {
  if (!petId) return null;

  const uId = React.useId().replace(/:/g, "");

  const getAnimationClass = (tier: PetTier | undefined) => {
    if (isMobileDevice()) return "";
    switch (tier) {
      case "classic": return "";
      case "epic": return "animate-[petBounceSlow_1.4s_infinite_ease-in-out]";
      case "legendary": return "animate-[petFloat_2.8s_infinite_ease-in-out]";
      case "ultimate": return "animate-[ultimateFloat_3.5s_infinite_ease-in-out]";        
      default: return "";
    }
  };

  const animClass = getAnimationClass(tier);

  const styleBlock = isMobileDevice() ? null : (
    <style>{`
      /* Core Float & Bounce Animations */
      @keyframes petFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-5px) rotate(1deg); }
      }
      @keyframes petFloatSlow {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-7px) rotate(-1.5deg); }
      }
      @keyframes petBounceSlow {
        0%, 100% { transform: translateY(0px) rotate(-2deg) scaleY(1); }
        50% { transform: translateY(-5px) rotate(2deg) scaleY(0.96); }
      }
      @keyframes petBreath {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.03, 0.97); }
      }
      
      /* Magical Aura Breathing */
      @keyframes auraBreathing {
        0%, 100% { transform: scale(0.93); opacity: 0.22; }
        50% { transform: scale(1.07); opacity: 0.48; }
      }
      @keyframes auraBreathingSlow {
        0%, 100% { transform: scale(0.9); opacity: 0.15; }
        50% { transform: scale(1.1); opacity: 0.4; }
      }
      
      /* Outer Rotating Elements */
      @keyframes rotateCw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes rotateCcw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
      }
      
      /* Rising Particle Systems */
      @keyframes floatParticleA {
        0% { transform: translateY(6px) translateX(0px) scale(0); opacity: 0; }
        15% { opacity: 0.9; }
        80% { opacity: 0.9; }
        100% { transform: translateY(-18px) translateX(-3px) scale(1); opacity: 0; }
      }
      @keyframes floatParticleB {
        0% { transform: translateY(8px) translateX(-2px) scale(0); opacity: 0; }
        20% { opacity: 0.95; }
        75% { opacity: 0.95; }
        100% { transform: translateY(-24px) translateX(3px) scale(0.8); opacity: 0; }
      }
      @keyframes floatParticleC {
        0% { transform: translateY(3px) translateX(3px) scale(0); opacity: 0; }
        15% { opacity: 0.8; }
        85% { opacity: 0.8; }
        100% { transform: translateY(-15px) translateX(-1px) scale(0.9); opacity: 0; }
      }
      
      /* Part Specific Mini-Animations */
      @keyframes wingFlapLeft {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-18deg); }
      }
      @keyframes wingFlapRight {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(18deg); }
      }
      @keyframes tailWagFast {
        0%, 100% { transform: rotate(-14deg); }
        50% { transform: rotate(14deg); }
      }
      @keyframes tailWagSlow {
        0%, 100% { transform: rotate(-7deg); }
        50% { transform: rotate(7deg); }
      }
      @keyframes earWiggleLeft {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-8deg); }
      }
      @keyframes earWiggleRight {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(8deg); }
      }
      @keyframes innerAuraPulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
      @keyframes epicSquashBounce {
        0%, 100% { transform: translateY(0px) scale(1.12, 0.88); }
        15% { transform: translateY(-1px) scale(0.98, 1.02); }
        50% { transform: translateY(-9px) scale(0.91, 1.09); }
        85% { transform: translateY(-1px) scale(1.02, 0.98); }
      }
      @keyframes legendaryAccessoryOscillating {
        0%, 100% { transform: translateY(0px) rotate(-4deg); }
        50% { transform: translateY(-2px) rotate(6deg); }
      }
      @keyframes ultimateFloat {
        0%, 100% { transform: translateY(0px) scale(1) rotate(-1.5deg); filter: hue-rotate(0deg) saturate(1.1); }
        25% { transform: translateY(-4px) scale(1.03) rotate(1deg); filter: hue-rotate(10deg) saturate(1.3); }
        50% { transform: translateY(-9px) scale(0.97) rotate(-1deg); filter: hue-rotate(24deg) saturate(1.6) brightness(1.15); }
        75% { transform: translateY(-4px) scale(1.03) rotate(2deg); filter: hue-rotate(10deg) saturate(1.3); }
      }
      @keyframes holoShift {
        0%, 100% { filter: hue-rotate(0deg) saturate(1.4) brightness(1); }
        50% { filter: hue-rotate(180deg) saturate(1.9) brightness(1.2); }
      }
      @keyframes staffSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .particle-glow {
        filter: drop-shadow(0 0 5px currentColor);
      }
    `}</style>
  );

  const renderPetContent = () => {
    switch (petId) {
      // ==========================================
      // === CLASSIC TIER PETS ===
      // ==========================================
      case "pet_green_slime":
      case "pet_slime_classic":
        return <GreenSlimePet uId={uId} animClass={animClass} className={className} />;
      case "pet_black_cat":
      case "pet_cat":
        return <BlackCatPet uId={uId} animClass={animClass} className={className} />;
      case "pet_pikachu":
      case "pet_pikachu_classic":
        return <PikachuPet uId={uId} animClass={animClass} className={className} />;
      case "pet_mushroom":
      case "pet_mushroom_classic":
        return <MushroomPet uId={uId} animClass={animClass} className={className} />;
      case "pet_ice_girl":
      case "pet_ice_girl_classic":
        return <IceGirlPet uId={uId} animClass={animClass} className={className} />;
      case "pet_fire_boy":
      case "pet_fire_boy_classic":
        return <FireBoyPet uId={uId} animClass={animClass} className={className} />;
      case "pet_rabbit_warrior":
      case "pet_rabbit":
        return <RabbitWarriorPet uId={uId} animClass={animClass} className={className} />;

      // ==========================================
      // === EPIC TIER PETS ===
      // ==========================================
      case "pet_slime_king":
      case "pet_slime":
        return <SlimeKingPet uId={uId} animClass={animClass} className={className} />;
      case "pet_ribbon_pig":
        return <RibbonPigPet uId={uId} animClass={animClass} className={className} />;
      case "pet_sonic_rings":
        return <SonicRingsPet uId={uId} animClass={animClass} className={className} />;
      case "pet_finalfantasy_moogle":
        return <MooglePet uId={uId} animClass={animClass} className={className} />;

      // ==========================================
      // === LEGENDARY TIER PETS ===
      // ==========================================
      case "pet_kirby":
      case "pet_shiba_king":
      case "pet_dog":
        return <KirbyPet uId={uId} animClass={animClass} className={className} />;
      case "pet_totoro":
      case "pet_fox_fire":
        return <TotoroPet uId={uId} animClass={animClass} className={className} />;
      case "pet_snorlax":
      case "pet_dragon_thunder":
        return <SnorlaxPet uId={uId} animClass={animClass} className={className} />;
      case "pet_chick":
      case "pet_chick_classic":
      case "pet_kero":
      case "pet_kero_classic":
        return <ChickPet uId={uId} animClass={animClass} className={className} />;

      // ==========================================
      // === ULTIMATE TIER PETS ===
      // ==========================================
      case "pet_unicorn":
        return <UnicornPet uId={uId} animClass={animClass} className={className} />;
      case "pet_panda_master":
      case "pet_panda":
        return <PandaMasterPet uId={uId} animClass={animClass} className={className} />;
      case "pet_scarab":
        return <ScarabPet uId={uId} animClass={animClass} className={className} />;
      case "pet_kingdomehearts_shadow":
        return <KingdomHeartsShadowPet uId={uId} animClass={animClass} className={className} />;
      case "pet_metroid_metroid":
        return <MetroidPet uId={uId} animClass={animClass} className={className} />;
      case "pet_ice_fire_siblings":
        return <IceFireSiblingsPet uId={uId} animClass={animClass} className={className} />;
      case "pet_yugioh_kuriboh":
        return <KuribohPet uId={uId} animClass={animClass} className={className} />;

      default:
        // Fallback placeholder if unmatched
        return (
          <div className={cn("w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border text-xs text-slate-400", className)}>
            {petId}
          </div>
        );
    }
  };

  return (
    <>
      {styleBlock}
      {renderPetContent()}
    </>
  );
};
