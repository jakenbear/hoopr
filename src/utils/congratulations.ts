const CONGRATS_MESSAGES = [
  "Great session out there! Way to put in the work.",
  "Nothing but net! Well, mostly. Solid session.",
  "Shooters shoot, and you just proved it.",
  "That's a wrap! You left it all on the court.",
  "Kobe would be proud. Mamba mentality right there.",
  "The gym doesn't lie. Great work today.",
  "You can't buy buckets, but you just earned a bunch.",
  "Session complete! The court is your office.",
  "Splash! Another workout in the books.",
  "That's how you get better. One shot at a time.",
  "Ice cold from the field today. Keep grinding.",
  "The scoreboard doesn't lie. Solid shooting.",
  "Game recognize game. Nice session.",
  "You just clocked in and clocked out. Respect.",
  "Somewhere, a defender just got nervous.",
  "Automatic! Great reps out there.",
  "The best shooters are made, not born. Keep at it.",
  "Another day, another bucket. Well done.",
  "Range finder activated. Nice shooting.",
  "That was clean. Come back tomorrow and do it again.",
  "Wet like water! Good work today.",
  "You didn't come to play, you came to work. Respect.",
  "Session locked in. The results speak for themselves.",
  "Catch and shoot, pull up, it doesn't matter. You're putting in work.",
  "That's how legends are built. One session at a time.",
];

export function getRandomCongrats(): string {
  return CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)];
}

export function buildSessionSummary(
  makes: number,
  attempts: number,
  bestZone?: { name: string; percentage: number },
  worstZone?: { name: string; percentage: number }
): string {
  const pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;

  let summary = `Session complete. ${makes} for ${attempts}, ${pct} percent overall.`;

  if (bestZone && bestZone.percentage > 0) {
    summary += ` Best spot: ${bestZone.name} at ${bestZone.percentage} percent.`;
  }

  if (worstZone && worstZone.percentage < 100 && worstZone.name !== bestZone?.name) {
    summary += ` Work on: ${worstZone.name} at ${worstZone.percentage} percent.`;
  }

  return summary;
}
