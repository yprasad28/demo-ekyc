function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDob(dob: string): string | null {
  if (!dob) return null;
  const trimmed = dob.trim();

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    if (dd.length === 2 && mm.length === 2 && yyyy.length === 4) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return null;
}

function computeNameScore(aadhaarName: string, panName: string): number {
  const a = normalizeName(aadhaarName);
  const b = normalizeName(panName);

  if (a === b) return 100;

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));

  let intersection = 0;
  Array.from(aTokens).forEach((token) => {
    if (bTokens.has(token)) intersection++;
  });

  const union = new Set([...Array.from(aTokens), ...Array.from(bTokens)]).size;
  if (union === 0) return 0;

  return Math.round((intersection / union) * 100);
}

function computeDobScore(aadhaarDob: string, panDob: string): number {
  const a = normalizeDob(aadhaarDob);
  const b = normalizeDob(panDob);

  if (!a || !b) return 0;
  return a === b ? 100 : 0;
}

export function computeCombinedScore(
  aadhaarName: string,
  panName: string,
  aadhaarDob: string,
  panDob: string
): number {
  const nameScore = computeNameScore(aadhaarName, panName);
  const dobScore = computeDobScore(aadhaarDob, panDob);
  return Math.round(nameScore * 0.6 + dobScore * 0.4);
}
