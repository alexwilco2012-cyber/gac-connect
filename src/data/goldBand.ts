/**
 * GAC Gold Band — copy for the audit tier that sits above standard SVS
 * verification (proposal v12 §6). The rule itself lives in lib/svs.ts
 * (goldBandActive): held only while compliance holds.
 */

export const GOLD_BAND = {
  name: 'GAC Gold Band',
  marque: '◆ GAC Gold Band',
  eyebrow: 'GAC Gold Band · audit tier',
  summary:
    'An audit tier above standard verification, open to Premium suppliers. Gold Band is earned, not bought: an enhanced audit renewed annually, so clients see at a glance which suppliers GAC has examined most closely.',
  scope: [
    {
      title: 'Documentation',
      body: 'Policies, procedures, and the paperwork behind every certificate.',
    },
    {
      title: 'Insurance',
      body: 'Cover levels checked against the work the supplier actually takes on.',
    },
    {
      title: 'Performance history',
      body: 'Completed platform jobs and the ratings agents and clients gave them.',
    },
    {
      title: 'Site practice',
      body: 'How the crew works quayside and onboard, seen rather than declared.',
    },
  ],
  rule: 'Renewed annually. Advertising cannot confer it, and lapsed compliance removes it — the same rule that governs every other trust mark on the platform.',
  scheduledNote:
    'Premium subscriber; the Gold Band audit is booked but not yet passed. Premium makes a supplier eligible — only the audit confers the marque.',
} as const;
