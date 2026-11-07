// All site copy lives here. Edit this file to update the portfolio.

export const profile = {
  name: 'Kailash G',
  handle: 'KAILASH.LAB',
  role: 'React Native Engineer',
  focus: 'Expo · TypeScript · iOS & Android',
  location: 'Kochi, Kerala, India',
  timezone: 'Asia/Kolkata',
  years: '4.5+',
  summary:
    'I build and ship cross-platform iOS and Android apps with React Native, Expo and TypeScript — owning features end to end: architecture, native integrations, testing, store releases and over-the-air updates.',
  email: 'kailashg4315215@gmail.com',
  linkedin: 'https://www.linkedin.com/in/kailash-g-3a8b1c9d1e5',
  github: 'https://github.com/kailashGN',
};

export interface Stage {
  version: string;
  period: string;
  role: string;
  org: string;
  mode: string;
  state: string; // name of the Specimen's form at this stage
  notes: string[];
}

// Oldest first — the Specimen evolves through these.
export const stages: Stage[] = [
  {
    version: 'v0.1',
    period: 'Nov 2021 — Feb 2022',
    role: 'Support Engineer',
    org: 'Kran Consulting',
    mode: 'On-site',
    state: 'Dispersed signal',
    notes: [
      'Post-delivery support: resolved client issues in live systems.',
      'Corrected database records and shipped UI fixes.',
    ],
  },
  {
    version: 'v1.0',
    period: 'Mar 2022 — Jun 2022',
    role: 'React Native Intern',
    org: 'Codedady Solutions',
    mode: 'On-site',
    state: 'First lattice',
    notes: ['Built screens and features for two mobile apps that launched during the internship.'],
  },
  {
    version: 'v2.0',
    period: 'Jun 2022 — Nov 2022',
    role: 'Junior React Native Developer',
    org: 'Antilia Solutions',
    mode: 'Remote',
    state: 'Layered shell',
    notes: [
      'Developed features and fixed bugs in production mobile apps.',
      'Used Redux for state management and cut unnecessary re-renders.',
      'Integrated Firebase Authentication for sign-up and login.',
    ],
  },
  {
    version: 'v4.5',
    period: 'Dec 2022 — Present',
    role: 'React Native Developer',
    org: 'Hubspire Technology Solutions',
    mode: 'Kochi · Hybrid',
    state: 'Crystalline core',
    notes: [
      'Lead or primary mobile developer on client apps across transit, media, fitness and staffing.',
      'Bare React Native and Expo, native modules, Firebase, CodePush and EAS Update.',
      'Own Play Store and App Store releases end to end; upgrade legacy apps to current React Native.',
      'Mentor interns on live projects through code review.',
    ],
  },
];

export type ExperimentKind = 'transit' | 'video' | 'fitness' | 'shifts' | 'figma' | 'graphql';

export interface Experiment {
  code: string;
  kind: ExperimentKind;
  title: string;
  domain: string;
  status: string;
  summary: string;
  objective: string;
  build: string[];
  outcome: string;
  stack: string[];
  link?: { label: string; href: string };
}

export const experiments: Experiment[] = [
  {
    code: 'EXP-01',
    kind: 'transit',
    title: 'Public Transit Trip-Planning App',
    domain: 'Mobility · iOS & Android',
    status: 'In production',
    summary:
      'Live trip tracking that keeps running in the background, with a rider alert system that behaves the same on both platforms.',
    objective:
      'Help riders follow a trip in real time — even with the app closed — and get the right alert at the right moment.',
    build: [
      'Real-time live-trip tracking in the background, with step-by-step foreground and background location permission flows that match on iOS and Android.',
      'Trip notification system: leave-by, approaching-stop, delay, off-course and arrival-check alerts, with de-duplication and automatic retry of failed syncs.',
      'Arrivals search, favorites and system-wide service alerts, matching the web platform’s API contracts and behaviour.',
      'Accessibility and localization: VoiceOver/TalkBack grouping and announcements, RTL layout fixes and translated content.',
      'A desktop location-simulation tool (Python, JavaScript) that replays GPX routes on physical phones, plus in-app GPX export — so QA can test live trips without travelling.',
      'Upgraded to a new Expo SDK major version and resolved the dependency and test breakages.',
    ],
    outcome:
      'Every feature shipped with Jest and React Native Testing Library regression tests, through CI checks (lint, type-check, tests) and AI-assisted code review.',
    stack: ['React Native', 'Expo', 'TypeScript', 'Background Location', 'MapLibre', 'Jest', 'RNTL', 'Python'],
  },
  {
    code: 'EXP-02',
    kind: 'video',
    title: 'Media Discovery & Short-Video App',
    domain: 'Media · Streaming',
    status: 'In production',
    summary:
      'A vertical short-video feed on HLS that preloads the next four videos for near-instant playback, with subscriptions and ads built in.',
    objective: 'Make an endless video feed feel instant, and build the business layer around it.',
    build: [
      'Vertical short-video feed with HLS streaming, preloading the next 4 videos, plus likes, saves, search and a content-report flow.',
      'Subscriptions and paywalls with RevenueCat; AdMob native ads in content feeds.',
      'Apple, Google and Facebook sign-in, account sharing with deep-link invitations, a paginated watchlist and an in-app notification center.',
      'Moved animations to the UI thread with Reanimated and Skia, fixed crashes and met Android’s 16 KB page-size requirement.',
    ],
    outcome: 'Managed TestFlight betas and App Store releases for a smoother, more stable app.',
    stack: ['React Native', 'HLS', 'Reanimated', 'Skia', 'RevenueCat', 'AdMob', 'Deep Links'],
  },
  {
    code: 'EXP-03',
    kind: 'fitness',
    title: 'Fitness Coaching & Booking App',
    domain: 'Health · Live video',
    status: 'In production',
    summary:
      'Live 1:1 coaching over video, with trainer scheduling that works across time zones — built from an empty repo.',
    objective: 'Connect trainers and clients for live sessions, wherever they are in the world.',
    build: [
      'Set up the app from scratch: project configuration, theming, a reusable component library and navigation.',
      'Live 1:1 video sessions with the Zoom Video SDK, later upgraded to a newer SDK.',
      'Trainer availability scheduling with recurring slots, holidays and cross-time-zone booking.',
      'Push notifications with badge counts, session reminders and deep-link routing; account deletion for store compliance; gift-card coupons.',
    ],
    outcome: 'Mixpanel event tracking across the funnel, including signed-out users.',
    stack: ['React Native', 'Zoom Video SDK', 'Push Notifications', 'Mixpanel', 'Design System'],
  },
  {
    code: 'EXP-04',
    kind: 'shifts',
    title: 'Workforce Shift-Booking App',
    domain: 'Staffing · Scheduling',
    status: 'In production',
    summary:
      'Shift discovery with search, filters, calendar views and dynamic incentives across multiple organizations.',
    objective: 'Let workers find and book shifts quickly, with times that are always right.',
    build: [
      'Shift listings with search, filters and calendar views, dynamic incentives, multi-organization accounts and phone-number OTP login.',
      'Fixed time-zone handling for shift times and added a forced-update prompt.',
      'Mixpanel analytics shipped to the client’s tracking specification.',
      'Sentry error tracking and session replay; Expo SDK upgrades; EAS builds automated through Bitbucket Pipelines.',
    ],
    outcome: 'A release pipeline that builds itself, and errors that are caught before users report them.',
    stack: ['Expo', 'EAS', 'Sentry', 'Mixpanel', 'Bitbucket Pipelines', 'OTP Auth'],
  },
  {
    code: 'EXP-05',
    kind: 'figma',
    title: 'Figma-to-Code MCP Server',
    domain: 'Open source · AI tooling',
    status: 'Published · npm & Smithery',
    summary:
      'A Model Context Protocol server that reads Figma design data and generates UI components for AI coding assistants.',
    objective: 'Cut the manual work between a finished design and working UI code.',
    build: [
      'Extracts structured design data from Figma and generates UI components from it.',
      'Keeps generated code consistent with the source design.',
      'Published as an npm package and on the Smithery MCP registry.',
    ],
    outcome: 'Forked and starred by other developers; reduces manual UI build time.',
    stack: ['TypeScript', 'Node.js', 'MCP', 'Figma API'],
  },
  {
    code: 'EXP-06',
    kind: 'graphql',
    title: 'GraphQL MCP Server',
    domain: 'Open source · AI tooling',
    status: 'Open source',
    summary: 'An MCP server that gives AI coding assistants direct, structured access to GraphQL APIs.',
    objective: 'Let an AI assistant explore and query a GraphQL API the way a developer would.',
    build: [
      'Exposes GraphQL schemas and operations as tools an AI assistant can call.',
      'Built in TypeScript on the Model Context Protocol.',
    ],
    outcome: 'Part of an ongoing set of tools that make AI assistants better at real app work.',
    stack: ['TypeScript', 'GraphQL', 'MCP'],
  },
];

export interface SkillGroup {
  id: string;
  label: string;
  skills: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    id: 'mobile',
    label: 'Mobile',
    skills: ['React Native (New Arch)', 'Expo SDK', 'Expo Router', 'EAS Build / Submit / Update', 'Native Modules', 'Config Plugins', 'iOS', 'Android'],
  },
  {
    id: 'state',
    label: 'State & Data',
    skills: ['Redux Toolkit', 'Zustand', 'TanStack Query', 'Apollo Client', 'GraphQL', 'REST', 'MMKV'],
  },
  {
    id: 'motion',
    label: 'UI & Motion',
    skills: ['Reanimated', 'Gesture Handler', 'Skia', 'NativeWind', 'Restyle', 'FlashList', 'React Hook Form', 'Zod'],
  },
  {
    id: 'features',
    label: 'App Features',
    skills: ['Push (Expo, FCM)', 'Background Location', 'MapLibre', 'Deep Links', 'RevenueCat', 'AdMob', 'HLS Video', 'Zoom Video SDK', 'i18n & RTL', 'VoiceOver / TalkBack'],
  },
  {
    id: 'quality',
    label: 'Quality & Ops',
    skills: ['Jest', 'RN Testing Library', 'Maestro', 'Storybook', 'Sentry', 'Mixpanel', 'GitHub Actions', 'Bitbucket Pipelines', 'CodePush'],
  },
  {
    id: 'ai',
    label: 'AI Tooling',
    skills: ['MCP Servers', 'Claude Code', 'CodeRabbit', 'TypeScript', 'Python'],
  },
];

export const credentials = [
  { code: 'CRT-01', title: 'Professional Cloud Architect', issuer: 'Google Cloud' },
  { code: 'CRT-02', title: 'Introduction to Front-End Development', issuer: 'Meta' },
  { code: 'CRT-03', title: 'Programming with JavaScript', issuer: 'Meta' },
  { code: 'CRT-04', title: 'JavaScript Algorithms & Data Structures', issuer: 'freeCodeCamp' },
  { code: 'EDU-01', title: 'B.Tech, Computer Science & Engineering', issuer: 'Bir Tikendrajit University' },
];

// "Off the clock" — the person behind the commits. Each interest has a particle shape.
export interface Interest {
  id: string;
  shape: string; // id in src/world/shapes/library.ts
  label: string;
  title: string;
  note: string;
}

export const about = {
  intro:
    "Hybrid app developer from Kerala. Developer by profession, curious by nature — I'd rather build the thing than talk about it.",
  interests: [
    {
      id: 'home',
      shape: 'palm',
      label: 'Home',
      title: 'Kerala, India',
      note: "Where I live, work and build. God's own country — and a good place to keep learning things outside my profession.",
    },
    {
      id: 'tyson',
      shape: 'tyson',
      label: 'Tyson',
      title: 'A very good German Shepherd',
      note: "I'm a huge dog person. Tyson is my German Shepherd, and he holds a special place in my life.",
    },
    {
      id: 'strength',
      shape: 'barbell',
      label: 'Strength',
      title: 'Strength training & nutrition',
      note: 'Regular gym sessions, eating right, and working on a slightly better version of myself every week. Same loop as shipping software.',
    },
    {
      id: 'machines',
      shape: 'coupe',
      label: 'Machines',
      title: 'Cars, motorcycles & how they work',
      note: 'Automotive technology, driving, and everything in between. If it has an engine, I want to know how it runs.',
    },
    {
      id: 'curiosity',
      shape: 'planet',
      label: 'Curiosity',
      title: 'Space, physics & history',
      note: 'Space, physics, human evolution, history, and the science behind everyday things. I read a lot about things that have nothing to do with code.',
    },
    {
      id: 'building',
      shape: 'gear',
      label: 'Side projects',
      title: 'Building things from scratch',
      note: 'I always have a new idea on the go. This site is one of them — I built it to learn Three.js and creative web animation.',
    },
  ] as Interest[],
  facts: ['Based in Kerala, India', 'Developer by profession, curious by nature', 'Prefers building over talking', 'Always has a next idea'],
};

// "Currently exploring" — lines typed into the live process panel.
export const evolving = [
  { tag: 'EXPANDING', text: 'From hybrid mobile into full-stack — web and backend engineering' },
  { tag: 'LEARNING', text: '3D web experiences, Three.js and creative animation (you are looking at it)' },
  { tag: 'BUILDING', text: 'MCP servers that let AI assistants work with real design and API data' },
  { tag: 'DEEPENING', text: 'React Native New Architecture, native modules and UI-thread motion' },
  { tag: 'TRAINING', text: 'Better programming for strength, nutrition and recovery' },
  { tag: 'ALWAYS', text: 'Combining technology, creativity and problem-solving. Shipping, then shipping again' },
];
