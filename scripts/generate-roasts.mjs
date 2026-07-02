// Phase 6 batch generator (AGENTS.md §8.4, §15.5).
//
// Fills the SHARED `roast_lines` pool. v1 is ROAST-ONLY + Unhinged: every line
// is a full roast (tactic 'roast'), no gentle waves. Two modes:
//   • default (no key): OFFLINE seed corpus below (zero spend).
//   • ANTHROPIC_API_KEY + ROAST_PROVIDER=anthropic: generate via Claude Opus 4.8
//     (bake-off winner) using the same voice prompt, then filter §9.3.
//
// Output: emits supabase/migrations/0009_seed_roast_lines.sql (idempotent).
//   npm run roast:generate
//
// Every line passes a mirror of src/lib/safety.ts (§9.3). Slots filled later by
// RoastService string-interp (never live AI): {name} {cue} {excuse} {count}
// {done} {target} {unit}.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'supabase', 'migrations', '0009_seed_roast_lines.sql');

// --- Safety mirror (§9.3) — keep in sync with src/lib/safety.ts -------------
// Ego/character jabs allowed (consent-gated); only the four hard categories block.
const BLOCKED = [
  /\b(fat|fatso|obese|chubby|skinny|ugly|hideous|disgusting)\b/i,
  /\b(your (face|body|weight|looks|teeth|skin))\b/i,
  /\b(retard|retarded|tranny|fag|faggot|slut|whore)\b/i,
  /\b(kill yourself|kys|hang yourself|end it all|suicide|cut yourself|worthless human|you should die)\b/i,
  /\b(depress(ed|ion)|bipolar|psycho|schizo|mentally ill)\b/i,
];
const isSafe = (t) => !BLOCKED.some((re) => re.test(t));

const CATEGORIES = ['gym', 'study', 'chores', 'diet', 'water', 'sleep', 'custom'];
// Launch is locked to Unhinged (level 4). Add 1–3 here if rudeness unlocks.
const LEVELS = [4];
const BUCKETS = ['low', 'half', 'almost'];

// --- OFFLINE SEED CORPUS (roast-only, texting voice) ------------------------
// Per-category roast lines ({name}/{cue} slots). Used when no AI key is set.
// Plain-spoken American voice: 2-4 real sentences, punch front-loaded so the
// first line survives a notification clip. Sarcasm via matter-of-fact call-outs.
// Backtick strings so apostrophes/quotes need no escaping; {slots} are literal.
const ROAST_BY_CAT = {
  gym: [
    `The gym was open all day and you knew it. It was open when you woke up, open at lunch, and it's still open right now while you decide you're too tired. Twelve hours, zero used.`,
    `You didn't go to the gym again. The shoes are by the door where you left them this morning, and they've done more standing around today than you have.`,
    `Another workout skipped, another day the plan survives only in your head. You've been "starting properly on Monday" since sometime around March.`,
    `You bought the whole gym outfit and it's still folded in the drawer. At this rate it'll wear out from being looked at before it ever sees a treadmill.`,
    `You've talked about the gym more than you'll ever actually go. If describing a workout burned calories you'd be in great shape by now.`,
    `The pre-workout kicked in and you spent every bit of that energy scrolling on the couch. That was the session. That was the whole thing.`,
    `You called one flight of stairs "leg day" and for a second I thought you were joking. You were not.`,
    `Your gym bag has been packed by the front door for three days. It's not a decoration, and you walk past it anyway like it is.`,
    `You said you'd go after work, then after dinner, then "tomorrow for sure." It's tomorrow now. You already know how this ends.`,
    `The membership charges you whether you show up or not, and lately it's basically a monthly donation. Very generous of you.`,
  ],
  study: [
    `You made a study plan last week and never touched it. Today you sat down and made a brand new plan instead of doing the old one. The planning is the actual hobby at this point.`,
    `The textbook is open to the same page it's been on since Tuesday. You've looked at it, taken a photo of it for your story, and closed it again.`,
    `You've watched forty minutes of "study with me" videos instead of studying. Someone else is being productive on camera and you're calling that research.`,
    `You reorganized your desk, color-coded your notes, and bought new highlighters. None of that is studying, and I'm fairly sure you know that.`,
    `You said you "work better under pressure," which is a generous way of saying you haven't started and won't until it's an emergency.`,
    `The notes look great. Clean, organized, and completely unread. You built a museum exhibit out of information you're actually supposed to learn.`,
    `You opened the material, decided to "review it quickly," and ended up arguing with a stranger online for an hour. Solid session.`,
    `You know every detail about your favorite creator's life and not one line from {name}. Interesting priorities for someone with an exam coming up.`,
    `The flashcards you made in September are still in the shrink wrap. You spent more time making them than you'll ever spend using them.`,
    `You'll cram the night before, blame the professor when it goes badly, and swear next time is different. It won't be, but I do admire the consistency.`,
  ],
  chores: [
    `{name} takes ten minutes and you've spent a week avoiding it. You've walked past it so many times it's basically part of the furniture now.`,
    `The dishes have been sitting there long enough to develop a personality. You keep adding to the pile like that's a form of progress.`,
    `You lit a candle so the place would "feel clean," which is bold for someone who hasn't cleaned anything. The mess is still there. It just smells nicer now.`,
    `You said you'd do it after this one episode. That was six episodes ago and the laundry hasn't moved an inch.`,
    `You'd rather deep-clean your phone screen than touch the pile by {cue}. Real dedication to doing anything except the actual thing.`,
    `{cue} is sitting exactly where it was three days ago. It isn't going to move on its own, no matter how long you stare at it.`,
    `Company's coming over and suddenly you're a cleaning machine. Funny how the mess was invisible right up until someone else might see it.`,
    `You've "been meaning to get to it" so long that "it" is now a permanent fixture. At this point the mess practically pays rent.`,
    `You tidied by moving one thing two feet to the left and sitting back down. That's not cleaning, that's just rearranging the scene.`,
    `The chore list has the same three items it had on Monday. You keep looking at it like reading it counts as doing it.`,
  ],
  diet: [
    `The diet lasted until lunch, same as last time and the time before that. By noon you'd already talked yourself into "starting fresh tomorrow."`,
    `You meal-prepped a whole fridge of containers and ordered takeout twice anyway. The containers are just sitting there watching. They know.`,
    `You called it a cheat day again. It's the fourth one this week, which means the cheat is the plan and the diet is the exception.`,
    `You spent ten minutes reading the healthy options and then ordered your usual, like you always do. The research was purely for show.`,
    `You "eat clean" when people are watching and raid the fridge at 11pm when they're not. I see both shifts. I don't have anywhere else to be.`,
    `One bite turned into the whole thing again. It always does, and you always look surprised, like it hasn't gone exactly this way every single time.`,
    `The salad is wilting in the fridge while you finish the fries. You bought it with good intentions and precisely zero follow-through.`,
    `You've said "starts Monday" so many times that Mondays have stopped taking you seriously. Today was a Monday, for what it's worth.`,
    `You're counting a "small" portion like the numbers care how you label it. The amount is the amount, whatever you decide to call it.`,
    `You blamed the weekend for the diet falling apart, as if the weekend reached over and fed you itself. That part was all you.`,
  ],
  water: [
    `You've had three coffees and not one glass of water. Then you'll wonder why your head hurts at 3pm, like it's some great mystery instead of the obvious answer.`,
    `The water bottle has followed you around all day, full and untouched. You've carried it everywhere except to your mouth.`,
    `{name} is the easiest goal you've got and you're still ignoring it. All you have to do is drink. That is the entire task.`,
    `Your houseplant drinks more consistently than you do, and it can't even reach the sink. Sit with that one for a second.`,
    `You'll drink coffee, soda, and energy drinks all day, but the one thing on the list gets skipped every single time.`,
    `Two sips by 4pm is not the hydration plan you think it is. The bottle is right there and has been the whole time.`,
    `You set a reminder to drink water, swiped it away without a thought, and complained about being tired an hour later. Connect the two.`,
    `"I forgot to drink water" is a wild thing to say about a bottle sitting six inches from your hand all day. You didn't forget. You ignored it.`,
    `The headache showed up right on schedule and you still didn't take the hint. The signals keep coming and you keep marking them unread.`,
    `You treat water like an optional extra and then act confused about why you feel rough by evening. It isn't a puzzle. Drink the water.`,
  ],
  sleep: [
    `{name} means nothing while you're up at 1am watching strangers argue about nothing online. You set a bedtime and treat it like a suggestion someone else made.`,
    `You said "one more episode" three episodes ago. You knew it was a lie when you said it, and so did I.`,
    `You doomscroll until 2am and then act shocked when the morning is hard. The morning didn't change. You did that to yourself last night.`,
    `The second the lights go off, your brain decides now is the perfect time to start a whole new project. Very convenient, and completely fake.`,
    `You set an alarm to fix your sleep and then stayed up late enough to turn that alarm into your enemy. You're losing a war you started.`,
    `The phone is the last thing you look at every single night, and then you wonder why your sleep is a mess. It isn't a mystery.`,
    `You told someone you were "going to bed" an hour ago and you're still very much awake. Apparently going to bed means lying down and staying online.`,
    `Your bedtime has more plot twists than the shows keeping you up. It slides later every night and you keep pretending that isn't a pattern.`,
    `"I'll sleep when I'm dead" is fun to say right up until it's 4am and you're staring at the ceiling regretting it. Tonight could be different. It won't be.`,
    `You'll "rest your eyes" for a minute and wake up at 4am fully dressed with the lights still on. That's not resting, that's just powering off on the couch.`,
  ],
  custom: [
    `{name} is something you say to feel productive, not something you actually do. You set it, you look at it, and then you go do literally anything else.`,
    `You've planned {name} more times than you've done it, and it isn't close. The planning feels like progress, which is exactly why nothing gets finished.`,
    `You're reading this right now instead of doing {name}, which is honestly the most on-brand thing you could be doing.`,
    `You set {cue} as a reminder and developed instant amnesia the second you saw it. It's not that you forgot. You decided not to.`,
    `{name} again? We both already know how this goes. You'll think about it, feel a little bad about it, and do nothing about it.`,
    `You talk a big game about {name} and then deliver absolutely nothing. All setup, no follow-through, every single time.`,
    `{name} has been "in progress" long enough to collect dust. Nothing has actually happened, but you keep the label on it so it feels alive.`,
    `You keep waiting for motivation to show up before you start, like it owes you a visit. It doesn't, it won't, and you'll use that as the excuse.`,
    `You set the reminder for {name} mostly so you could feel the small thrill of ignoring it. Congratulations on building a system that works perfectly against you.`,
    `Tomorrow's your big fresh start for {name}, same as yesterday's was, and the day before that. At some point "tomorrow" is just the word you use to avoid today.`,
  ],
};

const SKIP_LINES = [
  `So your reason today is "{excuse}." You said the same thing on Monday, and again on Wednesday, and I believed it a little less each time. This was never really about {excuse}.`,
  `"{excuse}," sure. That would land better if your screen time didn't show two hours of scrolling right before you decided you were too busy.`,
  `You typed "{excuse}" with a straight face, which takes real confidence given how many times you've used it this week. At least mix it up.`,
  `"{excuse}" again. It was believable the first couple of times. Now it's just the button you press to make the guilt go away for a minute.`,
  `Your excuse is "{excuse}," and the funny part is you had time for everything else today. Just not this. Never this.`,
  `"{excuse}" is doing an enormous amount of work for someone who's done none. I'd honestly respect a flat "I don't feel like it" more.`,
  `So we're going with "{excuse}." Noted and logged. We both know what it actually means, but I'll write down the polite version for the record.`,
  `"{excuse}" shows up like clockwork the exact moment it's time to do the thing. Strange how it never turns up at any other point in the day.`,
  `You said "{excuse}" and hit skip before the countdown even finished. That's not a reason, that's a reflex, and we both know it.`,
  `Impressive commitment to "{excuse}" as your answer for the third day in a row. You could at least rotate the material.`,
];

const DIGEST_LINES = [
  `You've got {count} things due today. Realistically you'll knock out the easiest one, feel accomplished for an hour, and let the rest slide into tomorrow. We've seen this before.`,
  `{count} goals due and the day already has a plan: do the bare minimum, then decide the rest can wait. It usually can't, but that's never stopped you.`,
  `There are {count} things on your list today. Odds are you'll spend more energy avoiding them than it would take to just do them.`,
  `{count} due today. You'll look at the list, feel a brief wave of motivation, and then find something else to do for the next four hours.`,
  `You set {count} goals for today, which is ambitious for someone about to ignore most of them. Bold to schedule this much disappointment in advance.`,
  `{count} things due and you're already tired just from reading them. That's the tell. You decided the outcome before the day even started.`,
  `Today's list has {count} items. History says one gets done, maybe, and the rest quietly roll onto tomorrow's list to be ignored again.`,
  `{count} goals waiting on you today. You'll get to them right after you check your phone one more time, which will somehow eat the whole morning.`,
  `You've got {count} due. The easy money says you do the fun one, skip the hard ones, and tell yourself tomorrow is the real start.`,
  `{count} things to handle today, and we both know your effort budget for this is running close to zero. Prove me wrong. You won't, but you could.`,
];

// Partial-completion lines are CATEGORY-SPECIFIC (each has its own flavor) and
// keyed by ratio bucket. {done}/{target}/{unit} are filled at send time.
// Note: gym + chores don't log an amount in v1 (goal form omits the measure
// field), so their partials won't fire unless measurement is enabled for them.
const PARTIAL_BY_CAT = {
  gym: {
    low: [
      `{done} {unit} out of {target}. That's not a workout, that's standing up with extra steps. You quit before your heart rate even noticed.`,
      `{done} {unit} out of {target} at the gym. You basically showed up just to prove you could leave early.`,
    ],
    half: [
      `{done} {unit} out of {target} and you racked it. You did the half that's easy and skipped the half that actually changes anything.`,
      `{done} out of {target} {unit} and you clocked out right when it started to work.`,
    ],
    almost: [
      `{done} {unit} out of {target} and you stopped. So close, and you handed it right back.`,
      `{done} out of {target} {unit}. You could see the cooldown from there and sat down instead.`,
    ],
  },
  study: {
    low: [
      `{done} {unit} out of {target}. I thought that was a typo. It was not. You opened the book and immediately closed the deal on doing nothing.`,
      `You read {done} {unit} of {target} and logged it like it counts. That's signing the attendance sheet and going home.`,
    ],
    half: [
      `{done} {unit} out of {target}. You did the easy half and stopped right before the part that shows up on the exam.`,
      `Halfway, {done} of {target} {unit}, and then your focus wandered off and never came back.`,
    ],
    almost: [
      `{done} {unit} out of {target} and you quit. You were basically done and still found a way not to finish.`,
      `{done} of {target} {unit}. The end was right there and you closed the book on principle, apparently.`,
    ],
  },
  chores: {
    low: [
      `{done} {unit} out of {target}. You picked up one thing, felt the effort, and sat back down.`,
      `You did {done} {unit} out of {target} and called it tidying. That's rearranging the mess, not clearing it.`,
    ],
    half: [
      `{done} {unit} out of {target} and you stopped. Half-cleaned is just a mess with better lighting.`,
      `Halfway through the {target} {unit}, and then you found something more interesting to not do.`,
    ],
    almost: [
      `{done} {unit} out of {target} and you bailed. A couple steps from done and you walked away from the finish.`,
      `{done} of {target} {unit}. Almost the whole thing, and you still left the last corner untouched.`,
    ],
  },
  diet: {
    low: [
      `{done} {unit} out of {target} today. You had the intention, and then the snack drawer had you.`,
      `You hit {done} of {target} {unit}. The rest were "starting tomorrow" in disguise.`,
    ],
    half: [
      `{done} of {target} {unit} and then the weekend logic kicked in early. Half a plan is no plan by dinner.`,
      `Halfway to {target} {unit} and you tapped out at {done}. The easy half, naturally.`,
    ],
    almost: [
      `{done} of {target} {unit} and you fumbled the last one at midnight. So close, and then the fridge won.`,
      `{done} out of {target} {unit} and the final stretch undid the whole day. You were almost through and you knew it.`,
    ],
  },
  water: {
    low: [
      `{done} {unit} out of {target}. That's not hydration, that's a rumor of it. The bottle is right there and still full.`,
      `You drank {done} {unit} of {target} today. Then the headache showed up right on cue and you acted surprised.`,
    ],
    half: [
      `{done} {unit} out of {target} and you stopped. Halfway hydrated is still walking around tired by 4pm.`,
      `Halfway to {target} {unit}, and then the bottle sat untouched for the rest of the day.`,
    ],
    almost: [
      `{done} {unit} of {target} and you quit at the last sip. You were basically there and left it in the bottle.`,
      `{done} out of {target} {unit}. One glass from done and you called it. Why.`,
    ],
  },
  sleep: {
    low: [
      `{done} {unit} out of {target}. You didn't sleep, you took a nap and called it a night.`,
      `{done} of {target} {unit} because "one more episode" turned into five. Tomorrow's going to be rough and you built it yourself.`,
    ],
    half: [
      `{done} {unit} out of {target} and the phone got the rest. Half a night's sleep and a full day of regretting it.`,
      `Halfway to {target} {unit}, and then 2am found you wide awake again.`,
    ],
    almost: [
      `{done} {unit} out of {target} and you cut it short scrolling. So close to a full night, and you gave the last hour to your phone.`,
      `{done} of {target} {unit}. Almost a real night's sleep and you traded the end of it for nothing.`,
    ],
  },
  custom: {
    low: [
      `{done} {unit} out of {target} and then you stopped. You did just enough to say you started and not one bit more.`,
      `You logged {done} of {target} {unit} and want credit for it. That's the effort version of showing up late and leaving early.`,
    ],
    half: [
      `{done} {unit} out of {target} and you folded at the midpoint. Half is exactly where you always quit, so at least it's on brand.`,
      `Halfway there, {done} of {target} {unit}, and then your motivation quietly filed out of the room.`,
    ],
    almost: [
      `{done} {unit} out of {target} and you tapped out. Two away from done and you handed it back at the buzzer.`,
      `{done} of {target} {unit}. You did all the hard part and quit right before it counted. That's the part I don't get.`,
    ],
  },
};

// Weekly-progress lines (§4.7): days-per-week frequency ratio, NOT a per-session
// amount. {done}/{target} are DAYS (days done vs days wanted this week). Fired
// when a weekly-target goal is still under target after a completion.
const WEEKLY_BY_CAT = {
  gym: {
    low: [
      `You wanted the gym {target} times this week and you've gone {done}. It's not looking like a comeback from here.`,
      `{done} gym days out of {target} this week. At this pace the plan quietly becomes next week's plan.`,
    ],
    half: [
      `Halfway to your {target} gym days with {done} done. The back half of the week is where this usually falls apart.`,
      `{done} of {target} gym days in. You're right on the line between on track and the story you'll tell yourself Sunday.`,
    ],
    almost: [
      `{done} of {target} gym days, one short. You're close enough that skipping now would be a genuine waste.`,
      `Almost there, {done} of {target} gym days. Don't let the last one turn into "I basically did it."`,
    ],
  },
  study: {
    low: [
      `You aimed for {target} study days this week and hit {done}. The exam isn't going to move to match your pace.`,
      `{done} of {target} study sessions this week. The other days you meant to, which counts for nothing.`,
    ],
    half: [
      `Halfway to {target} study days with {done} done. You know the second half of the week is where you always fade.`,
      `{done} of {target} study days in. On track for now, which is not the same as finished.`,
    ],
    almost: [
      `{done} of {target} study days, one to go. You've done the hard part, so don't fumble the easy one.`,
      `Almost at your {target} study days, {done} down. Stopping here would be a strange place to quit.`,
    ],
  },
  chores: {
    low: [
      `You planned {target} clean-ups this week and managed {done}. The mess doesn't care about your intentions.`,
      `{done} of {target} chore days this week. The rest of the list is still exactly where you left it.`,
    ],
    half: [
      `Halfway to {target} chore days with {done} done. The weekend version of you is not known for finishing this.`,
      `{done} of {target} chore days in. Fine so far, but so far has burned you before.`,
    ],
    almost: [
      `{done} of {target} chore days, one left. You're too close to let it roll into next week.`,
      `Almost done, {done} of {target} chore days. Don't stall out on the final one.`,
    ],
  },
  diet: {
    low: [
      `You wanted {target} on-plan days and you've had {done}. The week is basically writing its own ending already.`,
      `{done} of {target} clean days this week. The other days had opinions and the snack drawer won.`,
    ],
    half: [
      `Halfway to {target} clean days with {done} done. The weekend is coming and it has never been your friend here.`,
      `{done} of {target} on-plan days in. Holding for now, which the weekend tends to fix.`,
    ],
    almost: [
      `{done} of {target} clean days, one short. This is a bad week to cave right at the finish.`,
      `Almost at {target} clean days, {done} down. One more and you actually pull it off for once.`,
    ],
  },
  water: {
    low: [
      `You aimed for {target} days of hitting your water and hit {done}. The bottle's available all seven, for the record.`,
      `{done} of {target} water days this week. The other days you just decided thirst was a personality.`,
    ],
    half: [
      `Halfway to {target} water days with {done} done. Somehow this is the goal you still find hard.`,
      `{done} of {target} water days in. On pace, which for you is not a guarantee.`,
    ],
    almost: [
      `{done} of {target} water days, one to go. It's water. Do not overthink the last one.`,
      `Almost at {target} water days, {done} down. Finishing this one requires literally drinking.`,
    ],
  },
  sleep: {
    low: [
      `You wanted {target} nights of real sleep and got {done}. Your phone is winning the week by a wide margin.`,
      `{done} of {target} good sleep nights this week. The rest you traded for a screen and regretted by morning.`,
    ],
    half: [
      `Halfway to {target} sleep nights with {done} done. The late nights usually start piling up right about now.`,
      `{done} of {target} sleep nights in. Decent, until "one more episode" gets a vote.`,
    ],
    almost: [
      `{done} of {target} sleep nights, one short. Don't blow it on a doomscroll tonight.`,
      `Almost at {target} sleep nights, {done} down. The last one just means putting the phone down.`,
    ],
  },
  custom: {
    low: [
      `You set out to do {name} {target} times this week and managed {done}. The gap is starting to tell a story.`,
      `{done} of {target} on {name} this week. The other days it stayed a plan, as usual.`,
    ],
    half: [
      `Halfway to {target} on {name} with {done} done. The back half of the week is where you tend to vanish.`,
      `{done} of {target} for {name} so far. On track, which history says is fragile.`,
    ],
    almost: [
      `{done} of {target} on {name}, one to go. Too close to quit and call it "life got busy."`,
      `Almost at your {target} for {name}, {done} down. Don't let the last one become next week's problem.`,
    ],
  },
};

// --- AI mode (Opus 4.8) — mirror of src/lib/ai/provider.ts ------------------
// OPT-IN ONLY. Default = offline seed corpus above (zero API spend). The live
// Opus path exists for the unattended server cron (roast-refresh Edge Function),
// which can't use an interactive CLI/subscription. To enable a live gen locally:
//   ROAST_USE_AI=1 ROAST_PROVIDER=anthropic ANTHROPIC_API_KEY=… npm run roast:generate
const USE_AI =
  process.env.ROAST_USE_AI === '1' &&
  process.env.ROAST_PROVIDER === 'anthropic' &&
  !!process.env.ANTHROPIC_API_KEY;
const AI_MODEL = process.env.ROAST_MODEL ?? 'claude-opus-4-8';
const AI_COUNT = Number(process.env.ROAST_COUNT ?? '12'); // lines per context

const SYSTEM_PROMPT = `You write savage, FUNNY push notifications for RoastMode, a habit tracker that ROASTS people when they flake. The roast IS the product — screenshot-and-send energy or you failed.

COME FOR THEM, second person. Their delusion, ego, "this time i mean it," all-talk-no-action personality. Roast the behavior and the excuse, never the person's worth.

VOICE (the #1 thing): plain-spoken American English, like a sharp friend who's calling you out in a normal message. Full, correct sentences with normal capitalization and punctuation. 2 to 4 sentences per roast. NO slang, NO "lol/bro/nah/babe/fr/it's giving", NO emoji, NO all-lowercase. The humor comes from matter-of-fact call-outs of the obvious ("The gym was open all day. You knew that. You didn't go anyway."), not from wordplay or hype.

STRUCTURE: front-load the punch — the FIRST sentence must land on its own, because notifications get clipped after ~1 line. Then 1-2 sentences of dry follow-through.

WHAT LANDS: call out real behavior + the lie they tell themselves; anchor in real life (fridge, snooze, doomscroll, another planner, the shoes by the door); occasional dry 4th-wall as the app ("I see both shifts", "I don't have anywhere else to be"). Deadpan over loud.

DO NOT: no fake lore/institutions (councils, lawyers, files, documentaries, support groups). Don't personify the goal as taking action. No writerly flourishes ("fully functional", "genuinely deranged", "truly inspiring commitment"). No "X is not a Y it's a Z" as a crutch. No forced rule-of-three lists.

OFF LIMITS (store-ban, never): body/weight/appearance, identity/race/gender/sexuality/religion/slurs, mental-health/self-harm. Everything about their flaky character is fair game.

SLOTS — use literally where natural, the app fills them: {name}=goal, {cue}=trigger, {excuse}=their excuse, {count}=tasks due, {done}/{target}/{unit}.`;

function userPrompt(kind, opts) {
  const head = `Write ${AI_COUNT} roast notifications. Output EXACTLY a numbered list, one roast per line, no commentary. Plain-spoken American English, 2-4 full sentences each, punch in the first sentence. `;
  if (kind === 'skip') return `${head}Context: user tapped "I can't today" with excuse {excuse}. Roast the bail. Use {excuse}.`;
  if (kind === 'digest') return `${head}Context: morning digest, {count} goals due today, none done. One roast each summarizing the day ahead. Use {count}.`;
  if (kind === 'partial') return `${head}Context: a "${opts.category}" quantified goal — they did {done} of {target} {unit} (ratio bucket: ${opts.bucket}). Mock the ratio for THIS specific activity, not the body. Use {done}/{target}/{unit}.`;
  if (kind === 'weekly') return `${head}Context: a "${opts.category}" goal with a weekly target — they've done it {done} of {target} DAYS this week and are still short (ratio bucket: ${opts.bucket}). Roast the weekly shortfall and nudge them to finish the week. Use {done}/{target} (these are days, not a per-session amount).`;
  return `${head}Context: a "${opts.category}" goal they ignored and did not do. Roast them for not showing up. Use {name} and {cue} where natural.`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Org rate limit is 5 req/min on opus — space calls out and retry on 429/5xx.
const THROTTLE_MS = Number(process.env.ROAST_THROTTLE_MS ?? '13000');
const MAX_RETRIES = Number(process.env.ROAST_MAX_RETRIES ?? '5');

async function anthropicFetch(body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(60000, 2 ** attempt * 1000);
    console.warn(`  ${res.status} — retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(waitMs / 1000)}s`);
    await sleep(waitMs);
  }
}

// Total Opus calls planned = wave per category + skip + digest + partial per bucket, × levels.
const TOTAL_CALLS = LEVELS.length * (CATEGORIES.length + 1 + 1 + BUCKETS.length);
let callNo = 0;

const ctxLabel = (kind, opts) =>
  `${kind}${opts.category ? '/' + opts.category : ''}${opts.bucket ? '/' + opts.bucket : ''}`;

async function callOpus(kind, opts) {
  const n = ++callNo;
  const label = ctxLabel(kind, opts);
  process.stdout.write(`[${n}/${TOTAL_CALLS}] ${label} — throttle ${THROTTLE_MS / 1000}s… `);
  await sleep(THROTTLE_MS); // stay under 5 req/min
  const started = Date.now();
  process.stdout.write('calling Opus… ');
  const json = await anthropicFetch({
    model: AI_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt(kind, opts) }],
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const text = json.content.map((c) => c.text ?? '').join('');
  const parsed = text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
    .filter((l) => l.length > 0 && !/^(here|sure|okay)\b/i.test(l));
  // §9.3: reject lines that cross the hard categories (don't abort the batch).
  const clean = parsed.filter(isSafe);
  const dropped = parsed.length - clean.length;
  const usage = json.usage ? ` (${json.usage.input_tokens}→${json.usage.output_tokens} tok)` : '';
  console.log(`${clean.length} lines${dropped > 0 ? `, ${dropped} dropped §9.3` : ''} in ${secs}s${usage}`);
  return clean;
}

/** Get lines for a context: from Opus if enabled, else the seed corpus. */
async function linesFor(kind, opts) {
  if (USE_AI) return callOpus(kind, opts);
  if (kind === 'skip') return SKIP_LINES;
  if (kind === 'digest') return DIGEST_LINES;
  if (kind === 'partial') return PARTIAL_BY_CAT[opts.category][opts.bucket];
  if (kind === 'weekly') return WEEKLY_BY_CAT[opts.category][opts.bucket];
  return ROAST_BY_CAT[opts.category];
}

// --- Assemble rows ----------------------------------------------------------
const rows = [];
const push = (r) => {
  if (!isSafe(r.text)) throw new Error(`§9.3 BLOCKED: "${r.text}"`);
  rows.push(r);
};

async function build() {
  for (const level of LEVELS) {
    // wave roasts — per category, tactic 'roast', wave 4 (roast-only)
    for (const category of CATEGORIES) {
      for (const text of await linesFor('wave', { category })) {
        push({ kind: 'wave', category, level, wave: 4, tactic: 'roast', bucket: null, text });
      }
    }
    // skip + digest — cross-category
    for (const text of await linesFor('skip', {})) push({ kind: 'skip', category: null, level, wave: null, tactic: null, bucket: null, text });
    for (const text of await linesFor('digest', {})) push({ kind: 'digest', category: null, level, wave: null, tactic: null, bucket: null, text });
    // partial — per category, per ratio bucket (category-specific flavor)
    for (const category of CATEGORIES) {
      for (const bucket of BUCKETS) {
        for (const text of await linesFor('partial', { category, bucket })) {
          push({ kind: 'partial', category, level, wave: null, tactic: null, bucket, text });
        }
      }
    }
    // weekly — per category, per ratio bucket (days-per-week frequency, §4.7)
    for (const category of CATEGORIES) {
      for (const bucket of BUCKETS) {
        for (const text of await linesFor('weekly', { category, bucket })) {
          push({ kind: 'weekly', category, level, wave: null, tactic: null, bucket, text });
        }
      }
    }
  }
}

// --- Emit idempotent seed migration -----------------------------------------
const lit = (v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

async function main() {
  const t0 = Date.now();
  if (USE_AI) {
    const est = Math.ceil((TOTAL_CALLS * THROTTLE_MS) / 1000);
    console.log(`▶ Opus mode — model ${AI_MODEL}, ${AI_COUNT} lines/context`);
    console.log(`  ${TOTAL_CALLS} calls @ ${THROTTLE_MS / 1000}s throttle → ~${est}s minimum (5 req/min limit)\n`);
  } else {
    console.log('▶ Seed mode (offline corpus — no API key / ROAST_PROVIDER unset)\n');
  }
  await build();
  console.log(`\n  assembled ${rows.length} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const values = rows
    .map((r) => `  (${lit(r.kind)}, ${lit(r.category)}, ${r.level}, ${r.wave ?? 'null'}, ${lit(r.tactic)}, ${lit(r.bucket)}, ${lit(r.text)})`)
    .join(',\n');

  const sql = `-- Phase 6 seed of the shared roast_lines pool (§8.4). GENERATED by
-- scripts/generate-roasts.mjs — do not hand-edit; re-run \`npm run roast:generate\`.
-- ROAST-ONLY + Unhinged. ${USE_AI ? `Generated by ${AI_MODEL}` : 'Offline seed corpus'}, cleared by the §9.3 filter. Idempotent.

delete from public.roast_lines;

insert into public.roast_lines (kind, category, level, wave, tactic, bucket, text) values
${values};
`;

  writeFileSync(OUT, sql);
  const byKind = rows.reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {});
  console.log(`✓ ${rows.length} lines generated (${USE_AI ? AI_MODEL : 'seed'}), all passed §9.3`);
  console.log(`  by kind: ${JSON.stringify(byKind)}`);
  console.log(`✓ wrote ${OUT.replace(join(__dirname, '..') + '/', '')}`);
  console.log('  → apply it like the other migrations to fill the pool.');
}

main().catch((e) => {
  console.error('✗ failed:', e.message ?? e);
  process.exit(1);
});
