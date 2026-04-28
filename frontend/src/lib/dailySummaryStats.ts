import type { MatchPlayer, MatchRecord, Player } from '../types';

export interface DailyPartnerNemesisInfo {
  name: string;
  /** 與該對象同隊時的勝率，或對該對手時「我方」勝率 */
  winRate: number;
  games: number;
  /** 對該對手敗場數（天敵用） */
  lossesVs?: number;
}

/** 當日對手方：敗場數並列最高者（可多人） */
export interface DailyNemesisSummary {
  names: string[];
  lossesVs: number;
}

export interface DailyPlayerSummaryRow {
  key: string;
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  /** 顯示用整數 CP（μ×10 四捨五入） */
  powerCp: number;
  /** 當日賽程（時間序）中，相鄰兩次上場之間最多間隔幾場（不含首尾未上場） */
  maxRestMatches: number;
  bestPartner: DailyPartnerNemesisInfo | null;
  nemesis: DailyNemesisSummary | null;
  /** 有紀錄的各場 μ 差加總／場次 */
  avgCpDelta: number | null;
}

function keyFor(p: MatchPlayer): string {
  if (p.id) return String(p.id);
  return `name:${p.name}`;
}

function inTeam(playerKey: string, team: MatchPlayer[]): boolean {
  return team.some((p) => keyFor(p) === playerKey);
}

function pickName(p: MatchPlayer, playerLookup: Map<string, Pick<Player, 'name'>>): string {
  const k = keyFor(p);
  const found = p.id ? playerLookup.get(String(p.id)) : undefined;
  return found?.name || p.name || k;
}

/**
 * 依當日對戰紀錄（可為新→舊，內部會轉成時間序）彙整每位有上場球員的摘要列。
 * 回傳列依戰力（powerCp）高→低，同戰力再依勝率、勝場、姓名。
 */
export function computeDailyPlayerSummary(
  matchesNewestFirst: MatchRecord[],
  players: Pick<Player, 'id' | 'name' | 'mu'>[],
): DailyPlayerSummaryRow[] {
  const chronological = [...matchesNewestFirst].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const playerLookup = new Map<string, Pick<Player, 'name'>>();
  for (const p of players) {
    if (p.id) playerLookup.set(String(p.id), p);
  }

  const keys = new Set<string>();
  const nameByKey = new Map<string, string>();
  for (const m of chronological) {
    for (const p of [...(m.team1 || []), ...(m.team2 || [])]) {
      const k = keyFor(p);
      keys.add(k);
      nameByKey.set(k, pickName(p, playerLookup));
    }
  }

  const rows: DailyPlayerSummaryRow[] = [];

  for (const pid of keys) {
    let wins = 0;
    let losses = 0;
    const partnerStats = new Map<string, { wins: number; games: number }>();
    const oppStats = new Map<string, { wins: number; games: number }>();
    const cpDeltas: number[] = [];
    let lastMuAfter: number | undefined;

    for (const m of chronological) {
      const inT1 = inTeam(pid, m.team1 || []);
      const inT2 = inTeam(pid, m.team2 || []);
      if (!inT1 && !inT2) continue;

      const myTeam = inT1 ? (m.team1 || []) : (m.team2 || []);
      const oppTeam = inT1 ? (m.team2 || []) : (m.team1 || []);
      const won = (m.winner === 1 && inT1) || (m.winner === 2 && inT2);
      if (won) wins++;
      else losses++;

      const me = myTeam.find((p) => keyFor(p) === pid);
      if (me && me.muBefore !== undefined && me.muAfter !== undefined) {
        cpDeltas.push(Math.round((me.muAfter - me.muBefore) * 10));
      }
      if (me?.muAfter !== undefined) lastMuAfter = me.muAfter;

      const mate = myTeam.find((p) => keyFor(p) !== pid);
      if (mate) {
        const mk = keyFor(mate);
        const cur = partnerStats.get(mk) || { wins: 0, games: 0 };
        cur.games++;
        if (won) cur.wins++;
        partnerStats.set(mk, cur);
      }

      for (const op of oppTeam) {
        const ok = keyFor(op);
        if (ok === pid) continue;
        const cur = oppStats.get(ok) || { wins: 0, games: 0 };
        cur.games++;
        if (won) cur.wins++;
        oppStats.set(ok, cur);
      }
    }

    const playedIndices: number[] = [];
    for (let i = 0; i < chronological.length; i++) {
      const m = chronological[i];
      if (inTeam(pid, m.team1 || []) || inTeam(pid, m.team2 || [])) playedIndices.push(i);
    }
    let maxRest = 0;
    if (playedIndices.length >= 2) {
      for (let k = 0; k < playedIndices.length - 1; k++) {
        const gap = playedIndices[k + 1] - playedIndices[k] - 1;
        if (gap > maxRest) maxRest = gap;
      }
    }

    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;

    let bestPartner: DailyPartnerNemesisInfo | null = null;
    for (const [oid, st] of partnerStats) {
      if (st.games < 1) continue;
      const wr = Math.round((st.wins / st.games) * 1000) / 10;
      const name = nameByKey.get(oid) || oid;
      if (
        !bestPartner ||
        wr > bestPartner.winRate ||
        (wr === bestPartner.winRate && st.games > bestPartner.games)
      ) {
        bestPartner = { name, winRate: wr, games: st.games };
      }
    }

    const nemesisCandidates: { name: string; lossesVs: number }[] = [];
    for (const [oid, st] of oppStats) {
      if (st.games < 1) continue;
      const lossesVs = st.games - st.wins;
      const name = nameByKey.get(oid) || oid;
      nemesisCandidates.push({ name, lossesVs });
    }
    let nemesis: DailyNemesisSummary | null = null;
    if (nemesisCandidates.length > 0) {
      const maxLosses = Math.max(...nemesisCandidates.map((c) => c.lossesVs));
      if (maxLosses >= 1) {
        const names = nemesisCandidates
          .filter((c) => c.lossesVs === maxLosses)
          .map((c) => c.name)
          .sort((a, b) => a.localeCompare(b, 'zh-Hant'));
        nemesis = { names, lossesVs: maxLosses };
      }
    }

    const derivedMu =
      pid.startsWith('name:') ? undefined : players.find((p) => String(p.id) === pid)?.mu;
    const powerCp =
      derivedMu !== undefined
        ? Math.round(derivedMu * 10)
        : lastMuAfter !== undefined
          ? Math.round(lastMuAfter * 10)
          : Math.round(25 * 10);

    const avgCpDelta =
      cpDeltas.length > 0
        ? Math.round((cpDeltas.reduce((a, b) => a + b, 0) / cpDeltas.length) * 10) / 10
        : null;

    rows.push({
      key: pid,
      name: nameByKey.get(pid) || pid,
      wins,
      losses,
      winRate,
      powerCp,
      maxRestMatches: maxRest,
      bestPartner,
      nemesis,
      avgCpDelta,
    });
  }

  rows.sort((a, b) => {
    if (b.powerCp !== a.powerCp) return b.powerCp - a.powerCp;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });

  return rows;
}
