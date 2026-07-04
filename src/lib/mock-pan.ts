export interface PanRecord {
  panNumber: string;
  name: string;
  dob: string;
  status: 'ACTIVE' | 'INACTIVE';
  panType: 'INDIVIDUAL' | 'FIRM' | 'COMPANY';
}

export const mockPanDb: Record<string, PanRecord> = {
  "ABCDE1234F": {
    panNumber: "ABCDE1234F",
    name: "AARAV SHARMA",
    dob: "1990-05-15",
    status: "ACTIVE",
    panType: "INDIVIDUAL"
  },
  "XYZAB5678C": {
    panNumber: "XYZAB5678C",
    name: "PRIYA K PATEL", // slightly different name to show fuzzy match (e.g. middle initial K)
    dob: "1993-08-22",
    status: "ACTIVE",
    panType: "INDIVIDUAL"
  },
  "QWERB9012D": {
    panNumber: "QWERB9012D",
    name: "RAHUL VERMA",
    dob: "1985-11-30",
    status: "ACTIVE",
    panType: "INDIVIDUAL"
  },
  "PLMKO9876E": {
    panNumber: "PLMKO9876E",
    name: "ANANYA DAS",
    dob: "1995-04-12",
    status: "ACTIVE",
    panType: "INDIVIDUAL"
  },
  "ASDFG4321H": {
    panNumber: "ASDFG4321H",
    name: "AMIT JOSHI",
    dob: "1988-02-28",
    status: "ACTIVE",
    panType: "INDIVIDUAL"
  }
};

// Simple Levenshtein distance
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

// Similarity between two words (0.0 to 1.0)
function wordSimilarity(w1: string, w2: string): number {
  if (w1 === w2) return 1.0;
  const dist = levenshteinDistance(w1, w2);
  const maxLen = Math.max(w1.length, w2.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - dist / maxLen;
}

// Fuzzy name matching logic
export function fuzzyNameMatch(nameA: string, nameB: string): number {
  const cleanA = nameA.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();
  const cleanB = nameB.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();

  if (cleanA === cleanB) return 100;

  const tokensA = cleanA.split(/\s+/).filter(t => t.length > 0);
  const tokensB = cleanB.split(/\s+/).filter(t => t.length > 0);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // For each token in A, find its best match similarity in B
  let totalScoreA = 0;
  for (const tA of tokensA) {
    let maxSim = 0;
    for (const tB of tokensB) {
      const sim = wordSimilarity(tA, tB);
      if (sim > maxSim) maxSim = sim;
    }
    totalScoreA += maxSim;
  }

  // For each token in B, find its best match similarity in A
  let totalScoreB = 0;
  for (const tB of tokensB) {
    let maxSim = 0;
    for (const tA of tokensA) {
      const sim = wordSimilarity(tA, tB);
      if (sim > maxSim) maxSim = sim;
    }
    totalScoreB += maxSim;
  }

  // Average bidirectional similarity
  const avgScoreA = totalScoreA / tokensA.length;
  const avgScoreB = totalScoreB / tokensB.length;
  const matchScore = ((avgScoreA + avgScoreB) / 2) * 100;

  return Math.round(matchScore);
}

export function verifyPanRecord(panNumber: string): PanRecord | null {
  const cleanNum = panNumber.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  return mockPanDb[cleanNum] || null;
}
