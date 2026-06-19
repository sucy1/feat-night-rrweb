import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import 'construct-style-sheets-polyfill';
import { launchPuppeteer, sampleEvents as events } from './utils';
import { createPlayerService, createSpeedService } from '../src/replay/machine';
import { Timer } from '../src/replay/timer';
import { EventType } from '@rrweb/types';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

describe('playback speed control', function () {
  vi.setConfig({ testTimeout: 10_000 });

  describe('Timer speed control', () => {
    it('should initialize with the specified speed', () => {
      const timer = new Timer([], { speed: 2 });
      expect(timer.speed).toBe(2);
    });

    it('should update speed via setSpeed', () => {
      const timer = new Timer([], { speed: 1 });
      expect(timer.speed).toBe(1);
      timer.setSpeed(4);
      expect(timer.speed).toBe(4);
      timer.setSpeed(8);
      expect(timer.speed).toBe(8);
    });

    it('should support 1x, 2x, 4x, 8x speeds', () => {
      const timer = new Timer([], { speed: 1 });
      const testSpeeds = [1, 2, 4, 8];
      for (const speed of testSpeeds) {
        timer.setSpeed(speed);
        expect(timer.speed).toBe(speed);
      }
    });
  });

  describe('Speed Machine', () => {
    it('should transition from normal to skipping on FAST_FORWARD', () => {
      const timer = new Timer([], { speed: 1 });
      const speedService = createSpeedService({
        normalSpeed: -1,
        timer,
      });
      speedService.start();

      expect(speedService.state.matches('normal')).toBe(true);
      speedService.send({ type: 'FAST_FORWARD', payload: { speed: 10 } });
      expect(speedService.state.matches('skipping')).toBe(true);
      expect(timer.speed).toBe(10);
    });

    it('should restore normal speed on BACK_TO_NORMAL', () => {
      const timer = new Timer([], { speed: 2 });
      const speedService = createSpeedService({
        normalSpeed: -1,
        timer,
      });
      speedService.start();

      speedService.send({ type: 'FAST_FORWARD', payload: { speed: 10 } });
      expect(speedService.state.matches('skipping')).toBe(true);

      speedService.send({ type: 'BACK_TO_NORMAL' });
      expect(speedService.state.matches('normal')).toBe(true);
      expect(timer.speed).toBe(2);
    });

    it('should handle SET_SPEED in normal state', () => {
      const timer = new Timer([], { speed: 1 });
      const speedService = createSpeedService({
        normalSpeed: -1,
        timer,
      });
      speedService.start();

      speedService.send({ type: 'SET_SPEED', payload: { speed: 4 } });
      expect(speedService.state.matches('normal')).toBe(true);
      expect(timer.speed).toBe(4);
    });

    it('should transition to normal when SET_SPEED in skipping', () => {
      const timer = new Timer([], { speed: 1 });
      const speedService = createSpeedService({
        normalSpeed: -1,
        timer,
      });
      speedService.start();

      speedService.send({ type: 'FAST_FORWARD', payload: { speed: 10 } });
      expect(speedService.state.matches('skipping')).toBe(true);

      speedService.send({ type: 'SET_SPEED', payload: { speed: 2 } });
      expect(speedService.state.matches('normal')).toBe(true);
      expect(timer.speed).toBe(2);
    });
  });
});

describe('replayer speed API', function () {
  vi.setConfig({ testTimeout: 10_000 });

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
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should get current speed with getSpeed()', async () => {
    const speed = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, { speed: 1 });
      replayer.getSpeed();
    `);
    expect(speed).toBe(1);
  });

  it('should return correct speed after setConfig', async () => {
    const speeds = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, { speed: 1 });
      const initialSpeed = replayer.getSpeed();
      replayer.setConfig({ speed: 2 });
      const speedAfter2x = replayer.getSpeed();
      replayer.setConfig({ speed: 4 });
      const speedAfter4x = replayer.getSpeed();
      replayer.setConfig({ speed: 8 });
      const speedAfter8x = replayer.getSpeed();
      replayer.setConfig({ speed: 1 });
      const speedAfterReset = replayer.getSpeed();
      [initialSpeed, speedAfter2x, speedAfter4x, speedAfter8x, speedAfterReset];
    `);
    expect(speeds).toEqual([1, 2, 4, 8, 1]);
  });

  it('should initialize with custom speed', async () => {
    const speed = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, { speed: 4 });
      replayer.getSpeed();
    `);
    expect(speed).toBe(4);
  });

  it('should support 2x playback speed', async () => {
    const result = await page.evaluate(`
      new Promise((resolve) => {
        const { Replayer } = rrweb;
        const replayer = new Replayer(events, { speed: 2 });
        const speed = replayer.getSpeed();
        replayer.on('finish', () => {
          resolve({ speed, finished: true });
        });
        replayer.play();
        setTimeout(() => resolve({ speed, finished: false, timeout: true }), 5000);
      });
    `);
    expect(result.speed).toBe(2);
  });

  it('should support 4x playback speed', async () => {
    const result = await page.evaluate(`
      new Promise((resolve) => {
        const { Replayer } = rrweb;
        const replayer = new Replayer(events, { speed: 4 });
        const speed = replayer.getSpeed();
        resolve({ speed });
      });
    `);
    expect(result.speed).toBe(4);
  });

  it('should support 8x playback speed', async () => {
    const result = await page.evaluate(`
      new Promise((resolve) => {
        const { Replayer } = rrweb;
        const replayer = new Replayer(events, { speed: 8 });
        const speed = replayer.getSpeed();
        resolve({ speed });
      });
    `);
    expect(result.speed).toBe(8);
  });

  it('should change speed dynamically during playback', async () => {
    const result = await page.evaluate(`
      new Promise((resolve) => {
        const { Replayer } = rrweb;
        const replayer = new Replayer(events, { speed: 1 });
        replayer.pause();
        replayer.setConfig({ speed: 4 });
        const speedAfterSet = replayer.getSpeed();
        resolve({ speedAfterSet });
      });
    `);
    expect(result.speedAfterSet).toBe(4);
  });
});
