import sys
sys.path.append('/home/administrator/Documents/amber-master/backend')

from database import SessionLocal
import models
import crud

def test():
    db = SessionLocal()
    try:
        # Get or create two test players
        p1 = db.query(models.Player).filter(models.Player.email == 'host@test.com').first()
        if not p1:
            p1 = models.Player(id='test_host_id', email='host@test.com', name='HostPlayer', feathers=1000)
            db.add(p1)
            db.commit()
            p1 = db.query(models.Player).filter(models.Player.email == 'host@test.com').first()

        p2 = db.query(models.Player).filter(models.Player.email == 'guest@test.com').first()
        if not p2:
            p2 = models.Player(id='test_guest_id', email='guest@test.com', name='GuestPlayer', feathers=1000)
            db.add(p2)
            db.commit()
            p2 = db.query(models.Player).filter(models.Player.email == 'guest@test.com').first()

        print(f"Host: {p1.name} (id={p1.id}), Guest: {p2.name} (id={p2.id})")

        # Create room
        res_create = crud.create_game_room(db, p1.email, 'feather', 100)
        print("Create response:", res_create)
        room_code = res_create['room']['room_code']

        # Get active rooms
        active_rooms_1 = crud.get_active_game_rooms(db)
        print("Active rooms after creation:", active_rooms_1)

        # Join room
        res_join = crud.join_game_room(db, room_code, p2.email)
        print("Join response:", res_join)

        # Get active rooms again
        active_rooms_2 = crud.get_active_game_rooms(db)
        print("Active rooms after joining:", active_rooms_2)

    except Exception as e:
        print("Error:", e)
    finally:
        db.close()

if __name__ == '__main__':
    test()
