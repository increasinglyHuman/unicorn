import type { ContentPackage, GuideContent } from '../types';

export const sampleGuide: GuideContent = {
  id: 'test-terrain-sculpt',
  tool: 'test-app',
  context: 'terrain-editor.sculpt',
  mode: 'guide',
  level: 'beginner',
  locale: 'en',
  tags: ['terrain', 'sculpting', '3d'],
  title: 'Sculpting Terrain',
  description: 'Learn how to sculpt terrain using the brush tools',
  steps: [
    {
      target: '#brush-selector',
      highlight: true,
      title: 'Choose Your Brush',
      body: 'Select a brush shape from the toolbar.',
    },
    {
      target: '#terrain-canvas',
      highlight: true,
      title: 'Paint the Landscape',
      body: 'Click and drag to sculpt.',
      externalLinks: [
        {
          label: 'Terrain Deep Dive',
          url: 'https://docs.example.com/terrain',
          type: 'docs',
        },
      ],
    },
  ],
};

export const singleStepGuide: GuideContent = {
  id: 'test-save-tooltip',
  tool: 'test-app',
  context: 'toolbar.save',
  mode: 'guide',
  level: 'beginner',
  locale: 'en',
  tags: ['save', 'basics'],
  title: 'Saving Your Work',
  description: 'How to save your project',
  steps: [
    {
      target: '#save-btn',
      title: 'Save',
      body: 'Click here to save. Your work is auto-saved every 5 minutes.',
    },
  ],
};

export const advancedGuide: GuideContent = {
  id: 'test-advanced-shaders',
  tool: 'test-app',
  context: 'materials.shaders',
  mode: 'guide',
  level: 'advanced',
  locale: 'en',
  tags: ['shaders', 'materials', 'advanced'],
  title: 'Custom Shaders',
  description: 'Writing custom GLSL shaders for materials',
  steps: [
    {
      title: 'Shader Editor',
      body: 'Open the shader editor from the materials panel.',
    },
  ],
};

export const sampleContentPackage: ContentPackage = {
  tool: 'test-app',
  version: '1.0.0',
  guides: [sampleGuide, singleStepGuide, advancedGuide],
};

/** A guide with autoTrigger enabled, used in Phase 4+ tests. */
export const autoGuide: GuideContent = {
  id: 'test-auto-panel-intro',
  tool: 'test-app',
  context: 'panel.intro',
  mode: 'guide',
  level: 'beginner',
  locale: 'en',
  tags: ['onboarding'],
  title: 'Welcome to the Panel',
  description: 'Quick tour of panel features',
  autoTrigger: { on: 'first-use', prompt: 'soft' },
  steps: [{ title: 'Hello', body: 'This is the panel.' }],
};

export const autoGuideContentPackage: ContentPackage = {
  tool: 'test-app',
  version: '1.0.0',
  guides: [autoGuide],
};
