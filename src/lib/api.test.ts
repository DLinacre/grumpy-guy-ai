import { describe, expect, it } from 'vitest';
import { requestGrumble } from './api';

describe('requestGrumble', () => {
  it('returns a grumble object with fallback text when offline', async () => {
    const result = await requestGrumble('dry', 'Writing unit tests');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('text');
    expect(result.tone).toBe('dry');
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('handles brutal tone correctly', async () => {
    const result = await requestGrumble('brutal');
    expect(result.tone).toBe('brutal');
    expect(result.text).toBeTruthy();
  });

  it('handles supportive tone correctly', async () => {
    const result = await requestGrumble('supportive');
    expect(result.tone).toBe('supportive');
    expect(result.text).toBeTruthy();
  });
});
