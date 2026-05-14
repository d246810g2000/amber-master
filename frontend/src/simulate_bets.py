
def simulate_bet_logic(t1_mu, t2_mu):
    # 模擬後端目前的算法
    raw_h = round((t1_mu - t2_mu) * 2) / 2
    handicap_line = max(-10.5, min(10.5, raw_h))
    
    base_ou = 39.5 - (abs(handicap_line) * 0.85)
    ou_line = float(int(max(30.5, base_ou))) + 0.5
    
    abs_h = abs(handicap_line)
    ml_locked = abs_h > 6.0
    hd_locked = abs_h <= 1.0
    
    return {
        "mu_diff": t1_mu - t2_mu,
        "handicap": handicap_line,
        "ou": ou_line,
        "ml_locked": ml_locked,
        "hd_locked": hd_locked
    }

scenarios = [
    (25.0, 25.0, "完全對等"),
    (27.0, 25.0, "微弱領先 (差20 CP)"),
    (29.5, 25.0, "明顯優勢 (差45 CP)"),
    (32.0, 25.0, "實力差距 (差70 CP)"),
    (38.0, 25.0, "懸殊對局 (差130 CP)"),
    (60.0, 25.0, "極端屠殺 (差350 CP)")
]

print(f"{'情境':<18} | {'戰力差':<6} | {'讓分盤':<6} | {'大小分':<6} | {'獨贏鎖定':<8} | {'讓分鎖定':<8}")
print("-" * 80)
for t1, t2, desc in scenarios:
    res = simulate_bet_logic(t1, t2)
    ml_s = "🔒 鎖定" if res['ml_locked'] else "✅ 開放"
    hd_s = "🔒 鎖定" if res['hd_locked'] else "✅ 開放"
    print(f"{desc:<18} | {res['mu_diff']:>6.1f} | {res['handicap']:>6.1f} | {res['ou']:>6.1f} | {ml_s:<8} | {hd_s:<8}")
