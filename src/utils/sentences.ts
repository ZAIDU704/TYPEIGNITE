// Curated, high-quality English typing practice passages across 8 real-world domains.
// Includes a balanced mix of short, medium, and longer passages with natural grammar,
// realistic punctuation, capital letters, numbers, and spaces.

export interface PracticePassage {
  id: string;
  category:
    | 'communication'
    | 'technology'
    | 'programming_security'
    | 'education_productivity'
    | 'business_entrepreneurship'
    | 'science_nature'
    | 'critical_thinking'
    | 'everyday_life';
  text: string;
}

export const PRACTICE_PASSAGES: PracticePassage[] = [
  // 1. Everyday communication and professional messages
  {
    id: 'comm_1',
    category: 'communication',
    text: 'Thank you for sending the updated project schedule; I will review the milestones and share my feedback before noon.',
  },
  {
    id: 'comm_2',
    category: 'communication',
    text: 'Could we reschedule our Thursday afternoon meeting to Friday at ten? Our client requested a quick briefing on the new design.',
  },
  {
    id: 'comm_3',
    category: 'communication',
    text: 'Please find the quarterly summary attached. Let me know if any section needs additional context before we present it to the board.',
  },
  {
    id: 'comm_4',
    category: 'communication',
    text: 'Clear communication saves hours of confusion. When writing an email, state your purpose early and highlight the next action items.',
  },
  {
    id: 'comm_5',
    category: 'communication',
    text: 'I appreciate your patience while our support team investigated the billing issue. Your account credit has now been processed in full.',
  },
  {
    id: 'comm_6',
    category: 'communication',
    text: 'Before we finalize the contract, please confirm that the delivery dates and warranty terms match what we discussed on Monday.',
  },
  {
    id: 'comm_7',
    category: 'communication',
    text: 'Welcome to the engineering team! During your first week, we will pair you with a mentor to walk through our codebase and workflows.',
  },
  {
    id: 'comm_8',
    category: 'communication',
    text: 'Following up on our earlier conversation, the logistics partner confirmed that all three shipments will arrive at the warehouse tomorrow.',
  },
  {
    id: 'comm_9',
    category: 'communication',
    text: 'Great job leading the product demonstration today. Your answers to the technical questions gave the stakeholders real confidence.',
  },
  {
    id: 'comm_10',
    category: 'communication',
    text: 'If you are unable to attend the workshop in person, we will share a live stream link and a complete recording afterward.',
  },

  // 2. Technology, computers, and digital skills
  {
    id: 'tech_1',
    category: 'technology',
    text: 'Solid-state drives read and write data without moving mechanical parts, allowing modern laptops to boot in just a few seconds.',
  },
  {
    id: 'tech_2',
    category: 'technology',
    text: 'Keyboard shortcuts dramatically improve daily workflow efficiency once your fingers memorize the most common key combinations.',
  },
  {
    id: 'tech_3',
    category: 'technology',
    text: 'Cloud synchronization keeps documents accessible across desktops, tablets, and phones while maintaining an automatic version history.',
  },
  {
    id: 'tech_4',
    category: 'technology',
    text: 'Operating systems manage hardware resources, schedule background processes, and provide a secure interface between applications and memory.',
  },
  {
    id: 'tech_5',
    category: 'technology',
    text: 'High-refresh displays reduce motion blur and input latency, making scrolling, design work, and interactive graphics feel noticeably smoother.',
  },
  {
    id: 'tech_6',
    category: 'technology',
    text: 'Regularly organizing your local folders and archiving outdated downloads prevents storage clutter and makes important files easy to locate.',
  },
  {
    id: 'tech_7',
    category: 'technology',
    text: 'Fiber-optic cables transmit data as pulses of light through microscopic glass strands, delivering gigabit speeds over long distances.',
  },
  {
    id: 'tech_8',
    category: 'technology',
    text: 'Modern web browsers compile JavaScript into optimized machine code and leverage hardware acceleration to render complex 3D scenes.',
  },
  {
    id: 'tech_9',
    category: 'technology',
    text: 'Ergonomic posture matters during long computer sessions: keep your wrists neutral, your monitor at eye level, and your shoulders relaxed.',
  },
  {
    id: 'tech_10',
    category: 'technology',
    text: 'Automated backup routines protect critical documents by storing encrypted copies both on an external drive and in a remote data center.',
  },

  // 3. Programming and cybersecurity fundamentals
  {
    id: 'prog_1',
    category: 'programming_security',
    text: 'Writing clean, self-documenting code with descriptive variable names makes debugging and future maintenance far easier for the whole team.',
  },
  {
    id: 'prog_2',
    category: 'programming_security',
    text: 'Multi-factor authentication adds a vital layer of defense by requiring a hardware key or time-based token alongside your password.',
  },
  {
    id: 'prog_3',
    category: 'programming_security',
    text: 'Unit tests verify that pure functions handle edge cases, empty inputs, and unexpected values before changes ever reach production.',
  },
  {
    id: 'prog_4',
    category: 'programming_security',
    text: 'Never store plain-text passwords or secret API keys inside source control; always use strong hashing algorithms and environment variables.',
  },
  {
    id: 'prog_5',
    category: 'programming_security',
    text: 'Version control systems like Git allow developers to experiment on isolated branches, review diffs carefully, and merge features safely.',
  },
  {
    id: 'prog_6',
    category: 'programming_security',
    text: 'Phishing emails often create a false sense of urgency; always inspect the sender domain and verify requests through a trusted channel.',
  },
  {
    id: 'prog_7',
    category: 'programming_security',
    text: 'Parameterized database queries prevent SQL injection attacks by strictly separating user-supplied input from executable command syntax.',
  },
  {
    id: 'prog_8',
    category: 'programming_security',
    text: 'When profiling a slow application, measure actual bottlenecks first instead of guessing where cpu cycles or memory allocations occur.',
  },
  {
    id: 'prog_9',
    category: 'programming_security',
    text: 'Transport Layer Security encrypts network traffic end to end so eavesdroppers cannot intercept sensitive session tokens on public Wi-Fi.',
  },
  {
    id: 'prog_10',
    category: 'programming_security',
    text: 'Small, focused pull requests are much easier to review thoroughly than massive commits that touch dozens of unrelated modules at once.',
  },

  // 4. Education, learning, and productivity
  {
    id: 'edu_1',
    category: 'education_productivity',
    text: 'Deliberate practice focuses on accuracy before raw speed; when you eliminate recurring mistakes, velocity follows naturally.',
  },
  {
    id: 'edu_2',
    category: 'education_productivity',
    text: 'Spaced repetition strengthens long-term memory by reviewing challenging concepts right before you are about to forget them.',
  },
  {
    id: 'edu_3',
    category: 'education_productivity',
    text: 'Breaking a complex research project into forty-minute focused blocks with short breaks prevents burnout and sustains deep concentration.',
  },
  {
    id: 'edu_4',
    category: 'education_productivity',
    text: 'Teaching a newly learned concept to someone else in simple language is one of the fastest ways to uncover gaps in your own understanding.',
  },
  {
    id: 'edu_5',
    category: 'education_productivity',
    text: 'Writing down your top three priorities at the end of each workday allows you to start the next morning with immediate clarity and momentum.',
  },
  {
    id: 'edu_6',
    category: 'education_productivity',
    text: 'Active reading involves questioning the author, summarizing key arguments in the margins, and connecting new ideas to prior knowledge.',
  },
  {
    id: 'edu_7',
    category: 'education_productivity',
    text: 'Silence non-essential notifications during study sessions so your attention remains anchored on solving the problem in front of you.',
  },
  {
    id: 'edu_8',
    category: 'education_productivity',
    text: 'Consistent daily habits compound over months: twenty minutes of focused skill building every day beats an occasional weekend marathon.',
  },
  {
    id: 'edu_9',
    category: 'education_productivity',
    text: 'Curiosity turns routine assignments into meaningful exploration when you ask why a principle works rather than just memorizing formulas.',
  },
  {
    id: 'edu_10',
    category: 'education_productivity',
    text: 'Reviewing your notes within twenty-four hours of a lecture consolidates key takeaways while the examples are still fresh in your mind.',
  },

  // 5. Business, marketing, and entrepreneurship
  {
    id: 'biz_1',
    category: 'business_entrepreneurship',
    text: 'Successful startups solve a genuine, recurring problem for a specific audience rather than building flashy features nobody requested.',
  },
  {
    id: 'biz_2',
    category: 'business_entrepreneurship',
    text: 'Listening closely to customer support conversations reveals the exact words people use to describe their needs and frustrations.',
  },
  {
    id: 'biz_3',
    category: 'business_entrepreneurship',
    text: 'Sustainable growth depends on strong unit economics, transparent pricing, and a product experience that earns word-of-mouth referrals.',
  },
  {
    id: 'biz_4',
    category: 'business_entrepreneurship',
    text: 'A clear value proposition explains in one sentence how your service saves time, reduces risk, or improves results for the buyer.',
  },
  {
    id: 'biz_5',
    category: 'business_entrepreneurship',
    text: 'Cash flow management is essential for small businesses; tracking receivables and operating expenses prevents unexpected seasonal shortfalls.',
  },
  {
    id: 'biz_6',
    category: 'business_entrepreneurship',
    text: 'Before launching a major marketing campaign, test two headline variations with a small audience to see which message resonates most.',
  },
  {
    id: 'biz_7',
    category: 'business_entrepreneurship',
    text: 'Long-term partnerships thrive when both organizations communicate expectations openly and deliver on their commitments ahead of schedule.',
  },
  {
    id: 'biz_8',
    category: 'business_entrepreneurship',
    text: 'Customer retention is just as valuable as acquisition; thoughtful onboarding helps new users achieve their first success within minutes.',
  },
  {
    id: 'biz_9',
    category: 'business_entrepreneurship',
    text: 'Effective team leaders set clear goals, remove organizational roadblocks, and give talented people the autonomy to do their best work.',
  },
  {
    id: 'biz_10',
    category: 'business_entrepreneurship',
    text: 'Transparent post-launch reviews help product teams celebrate what worked well and refine their strategy for the next release cycle.',
  },

  // 6. Science, nature, and general knowledge
  {
    id: 'sci_1',
    category: 'science_nature',
    text: 'Photosynthesis converts sunlight, water, and carbon dioxide into chemical energy while releasing oxygen into the Earth atmosphere.',
  },
  {
    id: 'sci_2',
    category: 'science_nature',
    text: 'Ocean currents act as a global conveyor belt, redistributing solar heat from the equator toward the poles and shaping coastal climates.',
  },
  {
    id: 'sci_3',
    category: 'science_nature',
    text: 'Light from the Sun takes approximately eight minutes and twenty seconds to travel nearly one hundred and fifty million kilometers to Earth.',
  },
  {
    id: 'sci_4',
    category: 'science_nature',
    text: 'Honeybees communicate the distance and direction of blooming wildflowers to their hive mates by performing a precise figure-eight waggle dance.',
  },
  {
    id: 'sci_5',
    category: 'science_nature',
    text: 'High mountain glaciers store vast reserves of fresh water, feeding major river valleys slowly throughout the warm summer months.',
  },
  {
    id: 'sci_6',
    category: 'science_nature',
    text: 'The human brain contains billions of neurons that form new synaptic connections whenever we practice a musical instrument or learn a language.',
  },
  {
    id: 'sci_7',
    category: 'science_nature',
    text: 'Coral reefs cover less than one percent of the ocean floor, yet they provide shelter and nourishment for nearly a quarter of all marine species.',
  },
  {
    id: 'sci_8',
    category: 'science_nature',
    text: 'Astronomers use spectroscopy to analyze starlight, identifying the exact chemical elements burning inside distant galaxies.',
  },
  {
    id: 'sci_9',
    category: 'science_nature',
    text: 'Redwood trees along the Pacific coast can live for more than two thousand years and grow taller than a thirty-story building.',
  },
  {
    id: 'sci_10',
    category: 'science_nature',
    text: 'Earth magnetic field shields our atmosphere from charged solar wind particles, creating vibrant auroras near the polar circles.',
  },

  // 7. Problem-solving and critical thinking
  {
    id: 'think_1',
    category: 'critical_thinking',
    text: 'When faced with a complicated problem, start by separating verified facts from assumptions and define the root cause clearly.',
  },
  {
    id: 'think_2',
    category: 'critical_thinking',
    text: 'Correlation does not prove causation; just because two trends rise together does not mean one directly drives the other.',
  },
  {
    id: 'think_3',
    category: 'critical_thinking',
    text: 'First-principles thinking asks what we know to be fundamentally true and builds practical solutions upward from those building blocks.',
  },
  {
    id: 'think_4',
    category: 'critical_thinking',
    text: 'Good decision-makers actively seek out evidence that challenges their initial hypothesis to avoid confirmation bias.',
  },
  {
    id: 'think_5',
    category: 'critical_thinking',
    text: 'If a system fails repeatedly, improve the underlying process and safeguards rather than blaming the individual who pressed the button.',
  },
  {
    id: 'think_6',
    category: 'critical_thinking',
    text: 'Comparing trade-offs across cost, reliability, and time-to-delivery helps engineering teams choose the most balanced architecture.',
  },
  {
    id: 'think_7',
    category: 'critical_thinking',
    text: 'Stepping away for a brisk ten-minute walk often untangles a mental knot that an hour of staring at the screen could not resolve.',
  },
  {
    id: 'think_8',
    category: 'critical_thinking',
    text: 'Before scaling a complex workflow, run a small pilot test to uncover hidden edge cases while the cost of adjustment is still low.',
  },
  {
    id: 'think_9',
    category: 'critical_thinking',
    text: 'Asking five thoughtful why questions in sequence usually reveals the structural bottleneck behind an apparent surface symptom.',
  },
  {
    id: 'think_10',
    category: 'critical_thinking',
    text: 'Clear diagrams and flowcharts expose logical contradictions immediately when a team maps out how data moves through a system.',
  },

  // 8. Positive, realistic everyday situations
  {
    id: 'life_1',
    category: 'everyday_life',
    text: 'An early morning walk through the neighborhood park is a refreshing way to enjoy the crisp air before the city traffic begins.',
  },
  {
    id: 'life_2',
    category: 'everyday_life',
    text: 'Preparing fresh ingredients on Sunday evening makes cooking healthy, flavorful dinners during a busy workweek much simpler.',
  },
  {
    id: 'life_3',
    category: 'everyday_life',
    text: 'The local community library offers quiet reading tables, helpful librarians, and free workshops for learners of every age.',
  },
  {
    id: 'life_4',
    category: 'everyday_life',
    text: 'Keeping a small notebook in your jacket pocket is great for jotting down book recommendations, travel ideas, and grocery lists.',
  },
  {
    id: 'life_5',
    category: 'everyday_life',
    text: 'After a sudden summer rainstorm, the scent of wet pavement and pine needles filled the breeze as sunlight broke through the clouds.',
  },
  {
    id: 'life_6',
    category: 'everyday_life',
    text: 'Sharing a pot of freshly brewed tea and good conversation with old friends always makes a rainy weekend afternoon feel warm.',
  },
  {
    id: 'life_7',
    category: 'everyday_life',
    text: 'Learning to repair a bicycle tire, hem a pair of trousers, or bake sourdough bread builds practical confidence and self-reliance.',
  },
  {
    id: 'life_8',
    category: 'everyday_life',
    text: 'The weekend farmers market was vibrant with crates of ripe strawberries, crusty artisan loaves, and bouquets of yellow sunflowers.',
  },
  {
    id: 'life_9',
    category: 'everyday_life',
    text: 'Checking train schedules and packing your essentials the night before a trip turns departure morning into a calm, enjoyable start.',
  },
  {
    id: 'life_10',
    category: 'everyday_life',
    text: 'Steady rhythm and calm breathing keep your hands relaxed under pressure, whether you are playing piano or racing to the finish line.',
  },
];

export const SENTENCE_POOL: string[] = PRACTICE_PASSAGES.map((p) => p.text);

/**
 * Beginner-friendly practice sentences: short, simple, comfortable sentences
 * with common everyday words designed for people who are learning to type.
 */
export const BEGINNER_SENTENCE_POOL: string[] = [
  'The red car is fast and ready to go.',
  'Keep your hands calm and type each word.',
  'Look at the screen and find the next key.',
  'Start slow and focus on typing with care.',
  'Press the space bar gently after each word.',
  'Good posture helps your fingers move well.',
  'The sun is bright over the smooth race track.',
  'Take a deep breath and enjoy the steady pace.',
  'Practice every day to build strong habits.',
  'Your car moves forward with every right key.',
  'Stay relaxed and keep your eyes on the line.',
  'Four cars line up at the clean start grid.',
  'Green lights shine when the race begins now.',
  'Small steps each day lead to great speed.',
  'Type one letter at a time without rushing.',
  'The blue car drives down the middle lane.',
  'Clear focus is the best way to win the race.',
  'Warm up your fingers before you go fast.',
  'A steady rhythm makes typing feel so easy.',
  'Watch the road ahead as your speed grows.',
  'Every clean word brings you closer to first.',
  'Rest your wrists lightly above the desk.',
  'Simple words help you learn where keys live.',
  'The cool breeze blows past the open track.',
  'Accuracy always comes before raw top speed.',
  'Home row keys guide your left and right hands.',
  'Nice and smooth wins the race every time.',
  'You can set your own speed goal and improve.',
  'Bright stars glow above the night speedway.',
  'Cross the finish line with a proud smile.',
  'Learning to type is a fun and useful skill.',
  'Keep going and trust your steady rhythm.',
];

// Deterministic seeded pseudo-random generator (Mulberry32)
export function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) + 0x6d2b79f5;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a deterministic Fisher-Yates shuffled index order for a given seed + cycle + pool size.
 * Guarantees that within any race, passages NEVER repeat until all passages in the pool have been shown,
 * while multiplayer players sharing the same room seed still receive the exact same passage sequence.
 */
function getShuffledOrderForPool(seed: number, cycle: number, poolSize: number): number[] {
  const indices = Array.from({ length: poolSize }, (_, i) => i);
  const rng = seededRandom(Math.floor(seed) * 31337 + cycle * 7919 + 101);
  for (let i = poolSize - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices;
}

let lastSoloFirstPassageIdx = -1;
let soloRoundCounter = 0;

/**
 * Generates a fresh random seed for a new single-player round that guarantees
 * the opening passage never repeats the previous round's opening passage.
 */
export function createFreshRaceSeed(): number {
  soloRoundCounter += 1;
  for (let attempt = 0; attempt < 25; attempt++) {
    const randomBits =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0] % 900000
        : Math.floor(Math.random() * 900000);
    const candidateSeed = 1000 + ((randomBits + Date.now() + soloRoundCounter * 104729) % 900000);
    const firstOrder = getShuffledOrderForPool(candidateSeed, 0, SENTENCE_POOL.length);
    if (firstOrder[0] !== lastSoloFirstPassageIdx) {
      lastSoloFirstPassageIdx = firstOrder[0];
      return candidateSeed;
    }
  }
  const fallback = Math.floor(Math.random() * 900000) + 1000;
  lastSoloFirstPassageIdx = getShuffledOrderForPool(fallback, 0, SENTENCE_POOL.length)[0];
  return fallback;
}

/**
 * Returns the practice passage at `index` for a given race `seed` and optional `difficulty`.
 * When `difficulty === 'beginner'`, returns beginner-friendly short, simple sentences.
 * For all other levels ('rookie', 'pro', 'master', or undefined), returns from the main SENTENCE_POOL.
 */
export function getSentenceAt(
  index: number,
  seed: number = 1,
  difficulty?: 'beginner' | 'rookie' | 'pro' | 'master'
): string {
  const activePool = difficulty === 'beginner' ? BEGINNER_SENTENCE_POOL : SENTENCE_POOL;
  const poolSize = activePool.length;
  const safeIndex = Math.max(0, Math.floor(index));
  const cycle = Math.floor(safeIndex / poolSize);
  const posInCycle = safeIndex % poolSize;
  const order = getShuffledOrderForPool(seed, cycle, poolSize);
  return activePool[order[posInCycle]];
}
