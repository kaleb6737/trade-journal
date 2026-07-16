/** Curated: classics, sharp desk voice, psychology — not generic motivational filler. */
const DESK_WISDOM_BASE = [
  {
    text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.",
    author: 'George Soros',
    tag: 'Asymmetry',
  },
  {
    text: 'Money is made by sitting, not trading.',
    author: 'Jesse Livermore',
    tag: 'Patience',
  },
  {
    text: 'Losers average losers.',
    author: 'Paul Tudor Jones',
    tag: 'Risk',
  },
  {
    text: "If you personalize your losses, you can't trade.",
    author: 'Bruce Kovner',
    tag: 'Mind',
  },
  {
    text: 'Win or lose, everybody gets what they want from the market.',
    author: 'Ed Seykota',
    tag: 'Psychology',
  },
  {
    text: "The market doesn't owe you a trend. It owes you nothing.",
    author: 'Desk note',
    tag: 'Expectations',
  },
  {
    text: 'Play great defense, not great offense.',
    author: 'Paul Tudor Jones',
    tag: 'Risk',
  },
  {
    text: "Confidence isn't knowing the next candle — it's knowing what you'll do if you're wrong.",
    author: 'Desk note',
    tag: 'Execution',
  },
  {
    text: 'Plan the trade. Trade the plan. Journal the gap between the two.',
    author: 'Desk note',
    tag: 'Review',
  },
  {
    text: 'Revenge trades pay interest in drawdowns.',
    author: 'Desk note',
    tag: 'Discipline',
  },
  {
    text: 'The goal of a successful trader is to make the best trades. Money is secondary.',
    author: 'Alexander Elder',
    tag: 'Process',
  },
  {
    text: 'Amateurs think about how much money they can make. Professionals think about how much money they could lose.',
    author: 'Jack Schwager',
    tag: 'Risk',
  },
  {
    text: "If you're arguing with the tape, the tape isn't listening.",
    author: 'Desk note',
    tag: 'Ego',
  },
  {
    text: 'Trade what you see, not the story you need to be true.',
    author: 'Desk note',
    tag: 'Clarity',
  },
  {
    text: 'One sloppy exit can erase ten clean entries.',
    author: 'Desk note',
    tag: 'Execution',
  },
  {
    text: 'Your edge is the return on discipline, not the return on being clever.',
    author: 'Desk note',
    tag: 'Edge',
  },
  {
    text: "The hard part isn't the setup — it's doing nothing when there isn't one.",
    author: 'Desk note',
    tag: 'Patience',
  },
  {
    text: 'Markets are a mirror: they show your impulses long before they show you money.',
    author: 'Desk note',
    tag: 'Mind',
  },
  {
    text: 'Every trade is a probability ticket, not a verdict on your intelligence.',
    author: 'Desk note',
    tag: 'Mind',
  },
  {
    text: 'If you cannot take a small loss, sooner or later you will take the mother of all losses.',
    author: 'Ed Seykota',
    tag: 'Risk',
  },
  {
    text: 'Bottoms are an event. Tops are a process.',
    author: 'Jim Rogers',
    tag: 'Context',
  },
  {
    text: 'Consistency is built in quiet hours — not in the middle of a fast market.',
    author: 'Desk note',
    tag: 'Habits',
  },
  {
    text: "You don't need another indicator. You need fewer emotional overrides.",
    author: 'Desk note',
    tag: 'Focus',
  },
  {
    text: 'Position sizing is the throttle; conviction is just the story you tell yourself.',
    author: 'Desk note',
    tag: 'Sizing',
  },
  {
    text: 'The best loss is the one that matched your plan — even when it stings.',
    author: 'Desk note',
    tag: 'Process',
  },
  {
    text: 'There is a time to go long, a time to go short, and a time to go fishing.',
    author: 'Jesse Livermore',
    tag: 'Patience',
  },
  {
    text: "Missing a move hurts less than forcing a trade you don't actually have.",
    author: 'Desk note',
    tag: 'FOMO',
  },
  {
    text: 'Review your worst day with more reverence than your best — that is where the tuition went.',
    author: 'Journal',
    tag: 'Review',
  },
  {
    text: 'When in doubt, size down. Doubt is data.',
    author: 'Desk note',
    tag: 'Risk',
  },
  {
    text: 'The market can stay noisy longer than you can stay impulsive.',
    author: 'Desk note',
    tag: 'Composure',
  },
  {
    text: 'Great traders are boring on purpose: same playbook, same risk, same after-action review.',
    author: 'Desk note',
    tag: 'Process',
  },
]

export const DESK_WISDOM = DESK_WISDOM_BASE.map((item, id) => ({ id, ...item }))

export const DESK_WISDOM_QUOTE_COUNT = DESK_WISDOM.length

export function isValidDeskWisdomQuoteId(quoteId) {
  return Number.isInteger(quoteId) && quoteId >= 0 && quoteId < DESK_WISDOM_QUOTE_COUNT
}
