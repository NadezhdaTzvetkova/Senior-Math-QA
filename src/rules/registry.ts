import { REEL_AND_BOUNDS_RULES } from './bounds/reel-bounds-rules.js';
import { CORE_CALCULATION_RULES } from './calculations/core-calculation-rules.js';
import { CONSISTENCY_AND_AGGREGATION_RULES } from './calculations/consistency-rules.js';
import { CONTRACT_AND_ENUM_RULES } from './contract/core-rules.js';
import { EXTENDED_CONTRACT_RULES } from './contract/extended-contract-rules.js';
import { FORMAT_AND_TYPE_RULES } from './format/core-format-rules.js';
import type { ValidationRule } from '../validation/rule.js';

export const ALL_RULES: readonly ValidationRule[] = [
  ...CONTRACT_AND_ENUM_RULES,
  ...EXTENDED_CONTRACT_RULES,
  ...FORMAT_AND_TYPE_RULES,
  ...CORE_CALCULATION_RULES,
  ...CONSISTENCY_AND_AGGREGATION_RULES,
  ...REEL_AND_BOUNDS_RULES,
];
