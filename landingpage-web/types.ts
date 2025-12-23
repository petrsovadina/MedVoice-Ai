
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface SolutionFeature {
  id: string;
  title: string;
  category: string;
  image: string;
  tags: string[];
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export enum Section {
  HERO = 'hero',
  FEATURES = 'features',
  SECURITY = 'security',
  PRICING = 'pricing',
}
