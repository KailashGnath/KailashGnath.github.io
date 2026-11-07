import { experiments, about, type ExperimentKind } from '../content/resume';

/** What the swarm should be, given what's on screen. */
export interface DirectorState {
  stage: number;
  experiment: number;
  cluster: number;
  interest: number;
}

const STAGE_SHAPES = ['db', 'phoneList', 'layers', 'twoPhones'];

export const EXPERIMENT_SHAPES: Record<ExperimentKind, string> = {
  transit: 'pin',
  video: 'play',
  fitness: 'dumbbell',
  shifts: 'calendar',
  figma: 'pen',
  graphql: 'network',
};

// Same order as skillGroups: mobile, state, motion, features, quality, ai.
const CLUSTER_SHAPES = ['devices', 'braces', 'motion', 'bell', 'shield', 'spark'];

const clampIdx = (i: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(i)));

export function shapeFor(chamber: string, s: DirectorState): string {
  switch (chamber) {
    case 'hero':
      return 'phone';
    case 'evolution':
      return STAGE_SHAPES[clampIdx(s.stage, STAGE_SHAPES.length)];
    case 'experiments':
      return EXPERIMENT_SHAPES[experiments[clampIdx(s.experiment, experiments.length)].kind];
    case 'toolkit':
      return CLUSTER_SHAPES[clampIdx(s.cluster, CLUSTER_SHAPES.length)];
    case 'about':
      return about.interests[clampIdx(s.interest, about.interests.length)].shape;
    case 'credentials':
      return 'cap';
    case 'evolving':
      return 'terminal';
    case 'contact':
      return 'plane';
    default:
      return 'phone';
  }
}
