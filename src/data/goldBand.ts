/**
 * GAC Gold Band — copy for the audit tier that sits above standard SVS
 * verification (proposal v18 §6: a paid annual audit at £1,500). The rule itself lives in lib/svs.ts
 * (goldBandActive): held only while compliance holds.
 */

export const GOLD_BAND = {
  name: 'GAC Gold Band',
  marque: '◆ GAC Gold Band',
  eyebrow: 'GAC Gold Band · audit tier',
  summary:
    'A paid annual audit above standard verification, open to Premium suppliers at £1,500 a year: documentation, insurance, performance history and a site visit. Suppliers who pass carry the Gold Band badge in the marketplace, so clients see at a glance which suppliers GAC has looked at most closely. Standard verification stays free.',
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
  rule: 'Renewed annually. No supplier can advertise their way into it, and it comes off if compliance lapses — the same rule that governs every other badge on the platform.',
  scheduledNote:
    'Premium subscriber; the Gold Band audit is booked but not yet passed. Premium makes a supplier eligible — only the audit confers the marque.',
} as const;
