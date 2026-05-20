import type { Story } from '../../types';

export const stories: Story[] = [
  {
    id: 's1',
    headline: 'The quiet brilliance of a Sunday in Indianapolis',
    italicizeTokens: ['quiet', 'Indianapolis'],
    deck:
      'Caitlin Clark dropped 31 and 13 against Chicago. The box score is the least interesting part.',
    body: [
      {
        type: 'paragraph',
        text:
          'There is a particular kind of basketball happening in Indianapolis right now — the kind that does not announce itself. The kind that does not need to. On a Sunday afternoon in May, with the Fever up nineteen and the clock dripping past the four-minute mark, Caitlin Clark threw a left-handed pocket pass to a cutter she could not see. It went through three pairs of legs and landed in stride.',
      },
      { type: 'stat', value: '31 / 13', label: 'POINTS / ASSISTS · vs. CHI' },
      {
        type: 'paragraph',
        text:
          'No one stood up. There was no roar. Just the small, tight nod of a player who has stopped being surprised by herself.',
      },
      {
        type: 'quote',
        text: 'I do not think about year one anymore. I do not think about year two. I just want to play the next possession well.',
        by: 'Caitlin Clark',
      },
      {
        type: 'paragraph',
        text:
          'This is the second-year leap, but inverted. Where most stars get louder, she has gotten smaller. Quieter. More precise. The shots she once took because she could, she now takes because she should. The Fever are 18–4. They have not been mentioned on national broadcasts in three weeks. This is a feature, not a bug.',
      },
      { type: 'heading', text: 'On the next ten games' },
      {
        type: 'paragraph',
        text:
          'The schedule will, soon enough, take the team to Las Vegas, then to New York, then home to face Seattle in a Friday night that will sell out by Tuesday. The wins will continue or they will not. Either way the basketball will keep happening: precise, generous, quietly excellent.',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&q=80',
    byline: 'BY KATIE LEE',
    publishedAt: '2026-05-18T10:30:00-04:00',
    readMinutes: 4,
    tags: ['WNBA'],
    athleteId: 'caitlin',
  },
  {
    id: 's2',
    headline: 'Luka, the slow guard',
    italicizeTokens: ['slow'],
    deck:
      'He does not get faster. He gets earlier. A study in the highest skill in basketball: knowing.',
    body: [
      {
        type: 'paragraph',
        text:
          'There are players who play fast. There are players who play smart. And then there is Luka Dončić, who plays early — who is, by every available measurement, slower than he was last season, and somehow more impossible to guard.',
      },
      { type: 'stat', value: '33.8', label: 'PPG · CAREER HIGH' },
      {
        type: 'paragraph',
        text:
          'Watch a possession. He gets the ball at the logo. He surveys. He walks. The defender, primed for the pull-up he has been pulling up on for eight years, edges back. Luka steps into the space, throws a pass to a corner cutter, and the offense has gained a step it did not earn. He has gained a step it did not earn.',
      },
      {
        type: 'quote',
        text: 'I don’t need to be fast. I need to be on time.',
        by: 'Luka Dončić',
      },
      {
        type: 'paragraph',
        text:
          'This is the trick. The trick is patience. It is the inversion of every coaching cliché about urgency. Urgency, in his hands, is a different vector — applied later, applied calmer, applied in inches not in miles per hour.',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=1600&q=80',
    byline: 'BY DAVID SHOEMAKER',
    publishedAt: '2026-05-17T16:20:00-04:00',
    readMinutes: 5,
    tags: ['NBA'],
    athleteId: 'luka',
  },
  {
    id: 's3',
    headline: 'The Celtics, again, and forever',
    italicizeTokens: ['again', 'forever'],
    deck:
      'They beat Cleveland by sixteen. They beat the Lakers by eleven. They beat Toronto by twenty-two. This is not a column. This is a weather report.',
    body: [
      {
        type: 'paragraph',
        text:
          'At a certain point you stop writing about the Boston Celtics in the way one writes about a team. You begin to write about them the way one writes about humidity in July: a fact, an immovable feature of the season, something to be endured by everyone else.',
      },
      { type: 'stat', value: '38–14', label: 'CURRENT RECORD · EAST 1ST' },
      {
        type: 'paragraph',
        text:
          'Their offense is the most efficient in the league. Their defense is the second-most. Jayson Tatum is averaging 28 a night, doing it on twenty shots, which is what stars look like when they stop trying to be stars. The supporting cast is the supporting cast in the way the rhythm section is the rhythm section — it is, in fact, the entire band.',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=80',
    byline: 'BY ANNA REYES',
    publishedAt: '2026-05-18T08:00:00-04:00',
    readMinutes: 3,
    tags: ['NBA'],
    athleteId: 'tatum',
  },
  {
    id: 's4',
    headline: 'A box score is not a story',
    italicizeTokens: ['not'],
    deck:
      'Why we’re building MARGIN, in three short paragraphs.',
    body: [
      {
        type: 'paragraph',
        text:
          'Every other sports app starts from the score and writes outward. We start from the player and write inward. The score is the last paragraph of a story, not the first.',
      },
      {
        type: 'paragraph',
        text:
          'You follow people, not franchises. You watch the clip, then read the recap. You argue, you predict, you keep score of yourself. We left the colors at the door because the typography does the work.',
      },
      {
        type: 'paragraph',
        text:
          'This is what sports looks like when you treat the reader like an adult.',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=1600&q=80',
    byline: 'BY MARGIN STAFF',
    publishedAt: '2026-05-12T09:00:00-04:00',
    readMinutes: 2,
    tags: ['NBA', 'WNBA', 'NFL'],
  },
  {
    id: 's5',
    headline: 'On the art of the late closeout',
    italicizeTokens: ['late'],
    deck:
      'Jaylen Brown’s defense is having a quiet renaissance. Charts inside.',
    body: [
      {
        type: 'paragraph',
        text:
          'A closeout is a small act of geometry, a body trying to occupy a passing lane and a shooting pocket at once. Jaylen Brown is doing it as well as anyone since prime Kawhi Leonard, and almost no one is saying so.',
      },
    ],
    heroImage:
      'https://images.unsplash.com/photo-1593766827228-8a8b4f02c1e5?w=1600&q=80',
    byline: 'BY MICHAEL OKO',
    publishedAt: '2026-05-16T11:00:00-04:00',
    readMinutes: 6,
    tags: ['NBA'],
  },
];

export function storyById(id: string): Story | undefined {
  return stories.find(s => s.id === id);
}
