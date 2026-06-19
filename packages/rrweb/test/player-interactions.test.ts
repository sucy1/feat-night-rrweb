import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import 'construct-style-sheets-polyfill';
import { launchPuppeteer, sampleEvents as events } from './utils';
import { EventType } from '@rrweb/types';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

describe('player UI interactions', function () {
  vi.setConfig({ testTimeout: 15_000 });

  let code: ISuite['code'];
  let browser: ISuite['browser'];
  let page: ISuite['page'];

  beforeAll(async () => {
    browser = await launchPuppeteer();
    const bundlePath = path.resolve(__dirname, '../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    await page.evaluate(`var events = ${JSON.stringify(events)}`);
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('play/pause state management', () => {
    it('should be in paused state initially when not autoplaying', async () => {
      const state = await page.evaluate(`
        const { Replayer } = rrweb;
        const replayer = new Replayer(events);
        replayer.service.state.value;
      `);
      expect(state).toBe('paused');
    });

    it('should transition to playing state when play() is called', async () => {
      const state = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events);
          replayer.on('state-change', (states) => {
            if (states.player?.value === 'playing') {
              resolve('playing');
            }
          });
          replayer.play();
          setTimeout(() => resolve('timeout'), 2000);
        });
      `);
      expect(state).toBe('playing');
    });

    it('should transition to paused state when pause() is called', async () => {
      const state = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events);
          replayer.on('state-change', (states) => {
            if (states.player?.value === 'paused') {
              resolve('paused');
            }
          });
          replayer.play();
          setTimeout(() => {
            replayer.pause();
          }, 100);
          setTimeout(() => resolve('timeout'), 2000);
        });
      `);
      expect(state).toBe('paused');
    });

    it('should remember current time when pausing', async () => {
      const result = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events, { speed: 1 });
          let playTime = 0;
          let pauseTime = 0;
          
          replayer.on('state-change', (states) => {
            if (states.player?.value === 'playing') {
              playTime = replayer.getCurrentTime();
            }
          });
          
          replayer.play(1000);
          
          setTimeout(() => {
            replayer.pause();
            pauseTime = replayer.getCurrentTime();
            resolve({ playTime, pauseTime, pausedAtStart: pauseTime >= 1000 });
          }, 500);
        });
      `);
      expect(result.pausedAtStart).toBe(true);
    });

    it('should resume from current time after pause', async () => {
      const result = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events, { speed: 1 });
          
          replayer.play(2000);
          
          setTimeout(() => {
            replayer.pause();
            const timeAfterPause = replayer.getCurrentTime();
            replayer.play();
            const timeAfterResume = replayer.getCurrentTime();
            resolve({
              timeAfterPause,
              timeAfterResume,
              resumedNearPause: Math.abs(timeAfterResume - timeAfterPause) < 100
            });
          }, 200);
        });
      `);
      expect(result.resumedNearPause).toBe(true);
    });
  });

  describe('seek/goto functionality', () => {
    it('should seek to specified time offset', async () => {
      const time = await page.evaluate(`
        const { Replayer } = rrweb;
        const replayer = new Replayer(events);
        replayer.pause(5000);
        replayer.getCurrentTime();
      `);
      expect(time).toBeCloseTo(5000, -2);
    });

    it('should clamp seek time to 0 when negative', async () => {
      const time = await page.evaluate(`
        const { Replayer } = rrweb;
        const replayer = new Replayer(events);
        replayer.pause(-1000);
        replayer.getCurrentTime();
      `);
      expect(time).toBe(0);
    });

    it('should seek while playing and continue playing', async () => {
      const result = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events);
          
          replayer.play();
          
          setTimeout(() => {
            const stateBefore = replayer.service.state.value;
            replayer.play(3000);
            const timeAfterSeek = replayer.getCurrentTime();
            const stateAfter = replayer.service.state.value;
            resolve({
              stateBefore,
              timeAfterSeek,
              stateAfter,
              seekedNearTarget: Math.abs(timeAfterSeek - 3000) < 100
            });
          }, 100);
        });
      `);
      expect(result.stateBefore).toBe('playing');
      expect(result.stateAfter).toBe('playing');
      expect(result.seekedNearTarget).toBe(true);
    });

    it('should seek while paused and stay paused', async () => {
      const result = await page.evaluate(`
        const { Replayer } = rrweb;
        const replayer = new Replayer(events);
        replayer.pause(1000);
        const stateBefore = replayer.service.state.value;
        replayer.pause(4000);
        const stateAfter = replayer.service.state.value;
        const timeAfter = replayer.getCurrentTime();
        { stateBefore, stateAfter, timeAfter, seeked: Math.abs(timeAfter - 4000) < 100 };
      `);
      expect(result.stateBefore).toBe('paused');
      expect(result.stateAfter).toBe('paused');
      expect(result.seeked).toBe(true);
    });
  });

  describe('playback speed control', () => {
    it('should play at different speeds and report correctly', async () => {
      const speeds = await page.evaluate(`
        const { Replayer } = rrweb;
        const replayer = new Replayer(events, { speed: 1 });
        const s1 = replayer.getSpeed();
        replayer.setConfig({ speed: 2 });
        const s2 = replayer.getSpeed();
        replayer.setConfig({ speed: 4 });
        const s3 = replayer.getSpeed();
        replayer.setConfig({ speed: 8 });
        const s4 = replayer.getSpeed();
        [s1, s2, s3, s4];
      `);
      expect(speeds).toEqual([1, 2, 4, 8]);
    });

    it('should update speed state machine correctly', async () => {
      const states = await page.evaluate(`
        const { Replayer } = rrweb;
        const replayer = new Replayer(events, { speed: 1 });
        const state1 = replayer.speedService.state.value;
        replayer.setConfig({ speed: 4 });
        const state2 = replayer.speedService.state.value;
        const speedValue = replayer.speedService.state.context.timer.speed;
        [state1, state2, speedValue];
      `);
      expect(states[0]).toBe('normal');
      expect(states[1]).toBe('normal');
      expect(states[2]).toBe(4);
    });

    it('should maintain speed after pause/play cycle', async () => {
      const result = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events, { speed: 4 });
          
          replayer.play();
          
          setTimeout(() => {
            replayer.pause();
            const speedAfterPause = replayer.getSpeed();
            replayer.play();
            const speedAfterResume = replayer.getSpeed();
            resolve({
              speedAfterPause,
              speedAfterResume,
              sameSpeed: speedAfterPause === 4 && speedAfterResume === 4
            });
          }, 200);
        });
      `);
      expect(result.sameSpeed).toBe(true);
    });
  });

  describe('finish state', () => {
    it('should emit finish event when playback ends', async () => {
      const finished = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events, { speed: 100 });
          replayer.on('finish', () => {
            resolve(true);
          });
          replayer.play();
          setTimeout(() => resolve(false), 5000);
        });
      `);
      expect(finished).toBe(true);
    });
  });

  describe('skip inactive periods', () => {
    it('should switch to skipping state when skipInactive is enabled', async () => {
      const result = await page.evaluate(`
        new Promise((resolve) => {
          const { Replayer } = rrweb;
          const replayer = new Replayer(events, { skipInactive: true, speed: 1 });
          
          let wasSkipping = false;
          replayer.on('state-change', (states) => {
            if (states.speed?.value === 'skipping') {
              wasSkipping = true;
            }
          });
          
          replayer.play();
          
          setTimeout(() => {
            replayer.pause();
            resolve({ wasSkipping });
          }, 500);
        });
      `);
      expect(result.wasSkipping).toBe(true);
    });
  });
});
