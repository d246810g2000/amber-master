import trueskill
import itertools
import random
from typing import List, Dict, Any, Optional, Tuple
from datetime import date

# Initialize TrueSkill environment (Defaults: mu=25.0, sigma=8.333, beta=4.166, tau=0.0833)
# We set draw_probability=0.0 because badminton matches usually don't end in a draw.
ts = trueskill.TrueSkill(draw_probability=0.0)

ENGINE_CONFIG = {
    'WAIT_WEIGHT': 10,
    'BONUS_THRESHOLD': 3,
    'BONUS_MULTIPLIER': 1000,
    'FATIGUE_PENALTY_PER_GAME': 2.0,  # Penalty applied to Mu for each consecutive game played
}

def get_match_quality(team1_ratings: List[trueskill.Rating], team2_ratings: List[trueskill.Rating]):
    return ts.quality([team1_ratings, team2_ratings])

def calculate_new_ratings(team1: List[Tuple[float, float]], team2: List[Tuple[float, float]], winner: int, score_multiplier: float = 1.0):
    t1_ratings = [trueskill.Rating(mu=p[0], sigma=p[1]) for p in team1]
    t2_ratings = [trueskill.Rating(mu=p[0], sigma=p[1]) for p in team2]
    
    ranks = [0, 1] if winner == 1 else [1, 0]
    new_ratings = ts.rate([t1_ratings, t2_ratings], ranks=ranks)
    
    # Apply score multiplier to the Delta Mu
    res_t1 = []
    for i, r in enumerate(new_ratings[0]):
        old_mu = t1_ratings[i].mu
        new_mu = old_mu + (r.mu - old_mu) * score_multiplier
        res_t1.append((new_mu, r.sigma))
        
    res_t2 = []
    for i, r in enumerate(new_ratings[1]):
        old_mu = t2_ratings[i].mu
        new_mu = old_mu + (r.mu - old_mu) * score_multiplier
        res_t2.append((new_mu, r.sigma))
        
    return [res_t1, res_t2]

def get_penalty(t1_ids: List[str], t2_ids: List[str], precomputed_matches: List[Dict], last_match_ids: set, ignore_fatigue: bool) -> float:
    penalty = 0.0
    current_four_ids = set(t1_ids + t2_ids)
    
    # 1. Diversity Penalty
    for m in precomputed_matches:
        all_m_ids = m['all_ids']
        weight = m['weight']
        
        # A. Quartet repetition
        same_quartet_count = len(current_four_ids.intersection(all_m_ids))
        if same_quartet_count == 4:
            penalty += 0.8 * weight
            
        # B. Teammate repetition
        t1_set = set(t1_ids)
        t2_set = set(t2_ids)
        if t1_set.issubset(m['t1_ids']) or t1_set.issubset(m['t2_ids']): penalty += 0.4 * weight
        if t2_set.issubset(m['t1_ids']) or t2_set.issubset(m['t2_ids']): penalty += 0.4 * weight
        
        # C. Interaction repetition
        if same_quartet_count >= 2:
            penalty += (same_quartet_count - 1) * 0.15 * weight
            
    # 2. Fatigue Penalty
    if not ignore_fatigue:
        fatigue_count = len(current_four_ids.intersection(last_match_ids))
        if fatigue_count > 0:
            penalty += 0.35 * fatigue_count
            
    return penalty

def matchmake(
    all_players: List[Dict], 
    selected_ids: List[str], 
    recent_matches: List[Dict] = [], 
    ignore_fatigue: bool = False,
    target_date: str = ""
) -> List[Dict]:
    if not target_date:
        target_date = date.today().isoformat()
        
    selected_id_set = set(str(sid) for sid in selected_ids)
    target_players = [p for p in all_players if str(p['id']) in selected_id_set]
    
    print(f"[TrueSkill] selected_id_set: {selected_id_set}")
    print(f"[TrueSkill] Found {len(target_players)} target players out of {len(all_players)}")
    
    if len(target_players) < 4:
        return []
        
    # Pre-calculate constants
    wait_count_map = {str(pid): 0 for pid in selected_ids}
    consecutive_count_map = {str(pid): 0 for pid in selected_ids}
    still_consecutive = {str(pid): True for pid in selected_ids}
    
    for i, m in enumerate(recent_matches):
        participants = set([str(p['id']) for p in m.get('team1', []) + m.get('team2', [])])
        for pid in selected_ids:
            if pid in participants:
                if wait_count_map[pid] == 0:
                    wait_count_map[pid] = i + 1
                if still_consecutive[pid]:
                    consecutive_count_map[pid] += 1
            else:
                still_consecutive[pid] = False
    
    for pid in selected_ids:
        if wait_count_map[pid] == 0: wait_count_map[pid] = 2
            
    player_priorities = []
    for p in target_players:
        pid = str(p['id'])
        score = (p.get('matchCount', 0) * 10) - (wait_count_map.get(pid, 0) * 10) - (1000 if wait_count_map.get(pid, 0) >= 3 else 0)
        player_priorities.append({'player': p, 'score': score})
    player_priorities.sort(key=lambda x: (x['score'], random.random()))
    
    finalist_pool = [x['player'] for x in player_priorities[:12]]
    
    # --- PERFORMANCE OPTIMIZATION: Pre-compute Match Sets ---
    scan_limit = 15
    precomputed_matches = []
    for idx, m in enumerate(recent_matches[:scan_limit]):
        t1_ids = set([str(p['id']) for p in m.get('team1', [])])
        t2_ids = set([str(p['id']) for p in m.get('team2', [])])
        precomputed_matches.append({
            't1_ids': t1_ids,
            't2_ids': t2_ids,
            'all_ids': t1_ids.union(t2_ids),
            'weight': 1.2 if m.get('matchDate', '') == target_date else max(0.1, (scan_limit - idx) / scan_limit)
        })
        
    last_match_ids = precomputed_matches[0]['all_ids'] if precomputed_matches else set()
    
    # --- PERFORMANCE OPTIMIZATION: Pre-compute Effective Ratings ---
    eff_ratings = {}
    for p in finalist_pool:
        pid = str(p['id'])
        count = consecutive_count_map.get(pid, 0)
        mu_penalty = (count * ENGINE_CONFIG['FATIGUE_PENALTY_PER_GAME']) if (not ignore_fatigue and count >= 1) else 0
        eff_ratings[pid] = trueskill.Rating(mu=p['mu'] - mu_penalty, sigma=p['sigma'])

    matches = []
    for group in itertools.combinations(finalist_pool, 4):
        g_ids = [str(p['id']) for p in group]
        splits = [
            ((g_ids[0], g_ids[3]), (g_ids[1], g_ids[2])),
            ((g_ids[0], g_ids[2]), (g_ids[1], g_ids[3])),
            ((g_ids[0], g_ids[1]), (g_ids[2], g_ids[3]))
        ]
        
        for t1_ids, t2_ids in splits:
            q = get_match_quality([eff_ratings[i] for i in t1_ids], [eff_ratings[i] for i in t2_ids])
            
            penalty = get_penalty(list(t1_ids), list(t2_ids), precomputed_matches, last_match_ids, ignore_fatigue)
            
            effective_quality = q - penalty + (random.random() * 0.02)
            
            # Map back to player objects for the response
            p_map = {str(p['id']): p for p in group}
            matches.append({
                'team1': [p_map[i] for i in t1_ids],
                'team2': [p_map[i] for i in t2_ids],
                'quality': q,
                'effectiveQuality': effective_quality
            })
            
    print(f"[TrueSkill] Generated {len(matches)} possible match combinations")
    matches.sort(key=lambda x: x['effectiveQuality'], reverse=True)
    return matches[:10]
