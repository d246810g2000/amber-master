import os
import sys
sys.path.append('/home/administrator/Documents/amber-master/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

from database import SessionLocal

db = SessionLocal()

# 新的商品名稱列表，用來過濾要保留的商品
new_seed_names = [
    '球場邊緣人', '撿球大師', '報隊請排隊', '發球姿勢 100 分', '活在線上的男人',
    '微笑殺手(肉球製造機)', '連裁判都敢殺', '撲球之鬼', '撲球之鬼(不擦地)',
    '跪求贊助零打券', '羽球界戴資穎', '這個殺氣不對勁', '倔強鐵牌木框',
    '不屈青銅邊框', '傲氣白銀邊框', '榮耀黃金邊框', '華麗白金邊框', '璀璨翡翠邊框',
    '璀璨鑽石邊框', '大師紫羅蘭框', '宗師傲紅邊框', '頂尖菁英流光框', '萬象星空邊框',
    '聖白羽翼邊框', '鐵牌：霧霾灰階', '銅牌：大地岩落', '白銀：微光銀河',
    '黃金：金光閃耀', '白金：海克斯科技', '翡翠：螢火之森', '鑽石：星辰風暴',
    '大師：虛空星河', '宗師：雷霆萬鈞', '菁英：傲世神巔', '終極：起源矩陣',
    '終極：飄零羽落'
]

try:
    # 找到所有不屬於新種子的舊商品
    old_items = db.query(models.ShopItem).filter(~models.ShopItem.name.in_(new_seed_names)).all()
    old_item_ids = [item.id for item in old_items]
    old_item_map = {item.id: item for item in old_items}

    if old_item_ids:
        print(f"找到 {len(old_item_ids)} 個舊商品準備移除。")

        # 0. 找出有購買這些商品的玩家並退款
        inventories = db.query(models.PlayerInventory).filter(
            models.PlayerInventory.item_id.in_(old_item_ids)
        ).all()
        
        refund_count = 0
        total_refunded = 0
        for inv in inventories:
            item = old_item_map[inv.item_id]
            # 判斷是否為永久商品
            is_permanent = inv.expires_at is None
            refund_amount = item.price_permanent if is_permanent else item.price
            
            player = db.query(models.Player).filter(models.Player.id == inv.player_id).first()
            if player:
                # 退還羽毛
                player.feathers += refund_amount
                
                # 記錄交易
                transaction = models.FeatherTransaction(
                    player_id=player.id,
                    amount=refund_amount,
                    type='refund',
                    description=f'商城商品下架退款: {item.name} ({"永久" if is_permanent else "7天"})'
                )
                db.add(transaction)
                refund_count += 1
                total_refunded += refund_amount

        print(f"已退款給 {refund_count} 筆購買紀錄，共退還 {total_refunded} 根羽毛。")

        # 1. 解除玩家裝備的舊商品
        players_to_unequip = db.query(models.Player).filter(
            (models.Player.active_title_id.in_(old_item_ids)) |
            (models.Player.active_frame_id.in_(old_item_ids)) |
            (models.Player.active_background_id.in_(old_item_ids))
        ).all()
        
        for player in players_to_unequip:
            if player.active_title_id in old_item_ids:
                player.active_title_id = None
            if player.active_frame_id in old_item_ids:
                player.active_frame_id = None
            if player.active_background_id in old_item_ids:
                player.active_background_id = None
        
        print(f"已重置 {len(players_to_unequip)} 位玩家的舊裝備。")
        db.flush()

        # 2. 移除玩家背包中的舊商品
        deleted_inventory = db.query(models.PlayerInventory).filter(
            models.PlayerInventory.item_id.in_(old_item_ids)
        ).delete(synchronize_session=False)
        print(f"已從玩家背包移除 {deleted_inventory} 筆舊商品紀錄。")
        db.flush()

        # 3. 刪除舊商品
        deleted_items = db.query(models.ShopItem).filter(
            models.ShopItem.id.in_(old_item_ids)
        ).delete(synchronize_session=False)
        print(f"已成功刪除 {deleted_items} 個舊商品。")
        
        db.commit()
        print("資料庫清理與退款完成！")
    else:
        print("沒有找到需要移除的舊商品。")

except Exception as e:
    db.rollback()
    print(f"清理過程中發生錯誤: {e}")
finally:
    db.close()
