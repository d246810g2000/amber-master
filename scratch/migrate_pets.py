"""
One-time migration: map old pet IDs to new LoreCodex pets.
Preserves egg incubation progress and unlocked collection.

Usage (from repo root):
  python scratch/migrate_pets.py
  python scratch/migrate_pets.py --dry-run
"""
import argparse
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from database import SessionLocal
import models

OLD_TO_NEW_PET = {
    "pet_chick": "pet_green_slime",
    "pet_black_cat": "pet_black_cat",
    "pet_corgi": "pet_mushroom",
    "pet_rabbit": "pet_finalfantasy_moogle",
    "pet_cat": "pet_slime_king",
    "pet_slime": "pet_sonic_rings",
    "pet_dog": "pet_ribbon_pig",
    "pet_fox": "pet_chick",
    "pet_dragon": "pet_shiba_king",
    "pet_phoenix": "pet_ice_fire_siblings",
    "pet_unicorn": "pet_kingdomehearts_shadow",
    "pet_panda": "pet_panda_master",
}


def map_pet_id(pet_id: str) -> str | None:
    if not pet_id or not pet_id.startswith("pet_"):
        return None
    return OLD_TO_NEW_PET.get(pet_id, pet_id)


def migrate_unlocked(unlocked: str | None) -> tuple[str, bool]:
    if not unlocked:
        return "", False
    changed = False
    mapped: list[str] = []
    for raw in unlocked.split(","):
        pid = raw.strip()
        if not pid:
            continue
        new_id = map_pet_id(pid)
        if new_id != pid:
            changed = True
        if new_id and new_id not in mapped:
            mapped.append(new_id)
    return ",".join(mapped), changed


def migrate_player(p: models.Player) -> list[str]:
    logs: list[str] = []

    new_unlocked, unlock_changed = migrate_unlocked(p.unlocked_pets)
    if unlock_changed:
        logs.append(f"  unlocked_pets: {p.unlocked_pets!r} -> {new_unlocked!r}")
        p.unlocked_pets = new_unlocked or None

    for field in ("active_pet_id", "ability_pet_id"):
        val = getattr(p, field, None)
        if val and val.startswith("pet_"):
            new_val = map_pet_id(val)
            if new_val and new_val != val:
                logs.append(f"  {field}: {val} -> {new_val}")
                setattr(p, field, new_val)

    if p.active_pet_id and p.active_pet_id.startswith("pet_"):
        if not p.ability_pet_id:
            p.ability_pet_id = p.active_pet_id
            logs.append(f"  ability_pet_id: set from active_pet_id -> {p.ability_pet_id}")

    if p.active_egg_id:
        if p.active_pet_id and not p.active_pet_id.startswith("egg_"):
            if p.active_pet_id.startswith("pet_") and not p.ability_pet_id:
                p.ability_pet_id = p.active_pet_id
            logs.append(f"  fix active_pet_id -> {p.active_egg_id} (incubating)")
            p.active_pet_id = p.active_egg_id

    return logs


def main():
    parser = argparse.ArgumentParser(description="Migrate old pet IDs to new pet system")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without committing")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        players = db.query(models.Player).all()
        updated = 0
        for p in players:
            logs = migrate_player(p)
            if logs:
                print(f"{p.name} ({p.email}):")
                print("\n".join(logs))
                updated += 1
        if updated == 0:
            print("No players needed migration.")
        elif args.dry_run:
            db.rollback()
            print(f"\n[dry-run] Would update {updated} player(s).")
        else:
            db.commit()
            print(f"\nMigrated {updated} player(s).")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
