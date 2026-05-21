import sys
import os

# Add /app to sys.path since it is the root of the app in the docker container
sys.path.append("/app")

import models
import crud
from database import SessionLocal, engine, Base
from datetime import datetime, date, timedelta

def run_tests():
    # Make sure tables are created
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Create or fetch test players
        lender = db.query(models.Player).filter(models.Player.id == "lender_test").first()
        if not lender:
            lender = models.Player(id="lender_test", name="測試貸方", email="lender@test.com", feathers=2000)
            db.add(lender)
        else:
            lender.feathers = 2000

        borrower = db.query(models.Player).filter(models.Player.id == "borrower_test").first()
        if not borrower:
            borrower = models.Player(id="borrower_test", name="測試借方", email="borrower@test.com", feathers=100)
            db.add(borrower)
        else:
            borrower.feathers = 100

        # Clean existing active loans
        db.query(models.PlayerLoan).filter(
            models.PlayerLoan.borrower_id == "borrower_test"
        ).delete()
        db.query(models.FeatherTransaction).filter(
            models.FeatherTransaction.player_id.in_(["lender_test", "borrower_test"])
        ).delete()
        db.commit()

        print("--- Test 1: Create Loan ---")
        res = crud.create_loan(db, "lender_test", "borrower_test", 500, 10.0)
        print("Create Loan Result:", res)
        assert res["status"] == "success", "Loan creation failed"
        
        # Verify feathers
        db.refresh(lender)
        db.refresh(borrower)
        print(f"Lender feathers: {lender.feathers} (expected: 1500)")
        print(f"Borrower feathers: {borrower.feathers} (expected: 600)")
        assert lender.feathers == 1500, "Lender feathers mismatch"
        assert borrower.feathers == 600, "Borrower feathers mismatch"

        # Verify loan record
        loan = db.query(models.PlayerLoan).filter(models.PlayerLoan.id == res["loan_id"]).first()
        assert loan is not None, "Loan record not found"
        print(f"Loan total due: {loan.total_due} (expected: 550)")
        print(f"Loan status: {loan.status} (expected: active)")
        assert loan.total_due == 550, "Total due mismatch"
        assert loan.status == "active", "Status mismatch"

        print("--- Test 2: Auto-repayment on claim ---")
        # Let's simulate Wednesday claim auto deduction by running the same block of logic
        borrower.feathers += 1000 # borrower now has 1600
        
        # Run the auto repayment code block
        active_loans = db.query(models.PlayerLoan).filter(
            models.PlayerLoan.borrower_id == borrower.id,
            models.PlayerLoan.status == 'active'
        ).order_by(models.PlayerLoan.created_at.asc()).all()

        for active_loan in active_loans:
            due = active_loan.total_due - active_loan.repaid_amount
            repay_amt = min(borrower.feathers, due)
            borrower.feathers -= repay_amt
            
            lender_player = db.query(models.Player).filter(models.Player.id == active_loan.lender_id).first()
            if lender_player:
                lender_player.feathers += repay_amt
                
            active_loan.repaid_amount += repay_amt
            if active_loan.repaid_amount >= active_loan.total_due:
                active_loan.status = 'repaid'

        db.commit()
        db.refresh(lender)
        db.refresh(borrower)
        db.refresh(loan)
        
        print(f"Borrower feathers after auto-repay: {borrower.feathers} (expected: 1050)")
        print(f"Lender feathers after auto-repay: {lender.feathers} (expected: 2050)")
        print(f"Loan status after auto-repay: {loan.status} (expected: repaid)")
        print(f"Loan repaid amount: {loan.repaid_amount} (expected: 550)")
        
        assert borrower.feathers == 1050, "Borrower feathers mismatch after auto-repay"
        assert lender.feathers == 2050, "Lender feathers mismatch after auto-repay"
        assert loan.status == "repaid", "Loan should be repaid"

        print("--- Test 3: Manual Repayment ---")
        # Let's reset feathers and create a new loan of 300 with 20% interest (360 total due)
        lender.feathers = 1000
        borrower.feathers = 500
        db.commit()
        
        res = crud.create_loan(db, "lender_test", "borrower_test", 300, 20.0)
        loan2_id = res["loan_id"]
        
        db.refresh(lender)
        db.refresh(borrower)
        assert lender.feathers == 700
        assert borrower.feathers == 800
        
        # Manually repay 160 feathers
        res_repay = crud.repay_loan(db, loan2_id, 160)
        print("Manual Repay Result:", res_repay)
        assert res_repay["status"] == "success"
        
        db.refresh(lender)
        db.refresh(borrower)
        loan2 = db.query(models.PlayerLoan).filter(models.PlayerLoan.id == loan2_id).first()
        
        print(f"Borrower feathers: {borrower.feathers} (expected: 640)")
        print(f"Lender feathers: {lender.feathers} (expected: 860)")
        print(f"Loan2 repaid: {loan2.repaid_amount} (expected: 160)")
        print(f"Loan2 status: {loan2.status} (expected: active)")
        
        assert borrower.feathers == 640
        assert lender.feathers == 860
        assert loan2.repaid_amount == 160
        assert loan2.status == "active"
        
        # Manually repay the rest
        res_repay2 = crud.repay_loan(db, loan2_id, None)
        print("Manual Repay Rest Result:", res_repay2)
        assert res_repay2["status"] == "success"
        
        db.refresh(lender)
        db.refresh(borrower)
        db.refresh(loan2)
        
        print(f"Borrower final feathers: {borrower.feathers} (expected: 440)")
        print(f"Lender final feathers: {lender.feathers} (expected: 1060)")
        print(f"Loan2 status: {loan2.status} (expected: repaid)")
        
        assert borrower.feathers == 440
        assert lender.feathers == 1060
        assert loan2.status == "repaid"

        print("ALL TESTS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
