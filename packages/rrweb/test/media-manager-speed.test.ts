import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaInteractions, EventType } from '@rrweb/types';
import type { eventWithTime, mediaInteractionData } from '@rrweb/types';
import { MediaManager } from '../src/replay/media';
import { createPlayerService, createSpeedService } from '../src/replay/machine';
import { Timer } from '../src/replay/timer';
import type { Mirror } from 'rrweb-snapshot';

describe('MediaManager speed sync', () => {
  let mockMediaElement: HTMLMediaElement;
  let mockEmitter: any;
  let timer: Timer;
  let playerService: ReturnType<typeof createPlayerService>;
  let speedService: ReturnType<typeof createSpeedService>;
  let mediaManager: MediaManager;
  let mockMirror: Mirror;

  beforeEach(() => {
    mockMediaElement = {
      nodeName: 'VIDEO',
      currentTime: 0,
      duration: 100,
      playbackRate: 1,
      volume: 1,
      muted: false,
      loop: false,
      paused: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getAttribute: vi.fn().mockReturnValue(null),
      setAttribute: vi.fn(),
    } as unknown as HTMLMediaElement;

    mockEmitter = {
      on: vi.fn(),
      emit: vi.fn(),
    };

    const events: eventWithTime[] = [
      {
        type: EventType.Meta,
        data: { width: 1024, height: 768 },
        timestamp: 0,
      },
      {
        type: EventType.DomContentLoaded,
        data: {},
        timestamp: 10,
      },
      {
        type: EventType.Load,
        data: {},
        timestamp: 20,
      },
    ];

    timer = new Timer(events, { speed: 1 });
    playerService = createPlayerService({
      timer,
      events,
      speed: 1,
      root: document.createElement('div'),
    });
    speedService = createSpeedService({
      normalSpeed: -1,
      timer,
    });
    playerService.start();
    speedService.start();

    mockMirror = {
      getMeta: vi.fn().mockReturnValue({
        attributes: {
          rr_mediaState: 'played',
          rr_mediaPlaybackRate: 1,
          rr_mediaCurrentTime: 0,
        },
      }),
    } as unknown as Mirror;

    mediaManager = new MediaManager({
      warn: vi.fn(),
      service: playerService,
      speedService,
      getCurrentTime: () => timer.timeOffset,
      emitter: mockEmitter,
    });
  });

  describe('playback rate calculation', () => {
    it('should use base playback rate at 1x speed', () => {
      timer.setSpeed(1);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 1 } });

      mediaManager.addMediaElements(mockMediaElement, 0, mockMirror);

      expect(mockMediaElement.playbackRate).toBe(1);
    });

    it('should double playback rate at 2x speed', () => {
      timer.setSpeed(2);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 2 } });

      mediaManager.addMediaElements(mockMediaElement, 0, mockMirror);

      expect(mockMediaElement.playbackRate).toBe(2);
    });

    it('should quadruple playback rate at 4x speed', () => {
      timer.setSpeed(4);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 4 } });

      mediaManager.addMediaElements(mockMediaElement, 0, mockMirror);

      expect(mockMediaElement.playbackRate).toBe(4);
    });

    it('should octuple playback rate at 8x speed', () => {
      timer.setSpeed(8);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 8 } });

      mediaManager.addMediaElements(mockMediaElement, 0, mockMirror);

      expect(mockMediaElement.playbackRate).toBe(8);
    });

    it('should multiply custom playback rate by speed', () => {
      mockMirror.getMeta = vi.fn().mockReturnValue({
        attributes: {
          rr_mediaState: 'played',
          rr_mediaPlaybackRate: 1.5,
          rr_mediaCurrentTime: 0,
        },
      });

      timer.setSpeed(2);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 2 } });

      mediaManager.addMediaElements(mockMediaElement, 0, mockMirror);

      expect(mockMediaElement.playbackRate).toBe(3);
    });
  });

  describe('seek time calculation with speed', () => {
    beforeEach(() => {
      mediaManager.addMediaElements(mockMediaElement, 0, mockMirror);
    });

    it('should advance media time correctly at 1x speed', () => {
      timer.setSpeed(1);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 1 } });

      const mutation: mediaInteractionData = {
        type: MediaInteractions.Play,
        currentTime: 0,
      };
      mediaManager.mediaMutation({
        target: mockMediaElement,
        timeOffset: 0,
        mutation,
      });

      timer.setTime(2000);

      const startHandler = mockEmitter.on.mock.calls.find(
        (call: any[]) => call[0] === 'start',
      );
      if (startHandler) {
        startHandler[1]();
      }

      expect(mockMediaElement.currentTime).toBeCloseTo(2, 1);
    });

    it('should advance media time faster at 2x speed', () => {
      timer.setSpeed(2);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 2 } });

      const mutation: mediaInteractionData = {
        type: MediaInteractions.Play,
        currentTime: 0,
      };
      mediaManager.mediaMutation({
        target: mockMediaElement,
        timeOffset: 0,
        mutation,
      });

      timer.setTime(2000);

      const startHandler = mockEmitter.on.mock.calls.find(
        (call: any[]) => call[0] === 'start',
      );
      if (startHandler) {
        startHandler[1]();
      }

      expect(mockMediaElement.currentTime).toBeCloseTo(4, 1);
    });

    it('should advance media time at 4x speed', () => {
      timer.setSpeed(4);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 4 } });

      const mutation: mediaInteractionData = {
        type: MediaInteractions.Play,
        currentTime: 0,
      };
      mediaManager.mediaMutation({
        target: mockMediaElement,
        timeOffset: 0,
        mutation,
      });

      timer.setTime(1000);

      const startHandler = mockEmitter.on.mock.calls.find(
        (call: any[]) => call[0] === 'start',
      );
      if (startHandler) {
        startHandler[1]();
      }

      expect(mockMediaElement.currentTime).toBeCloseTo(4, 1);
    });

    it('should sync media when speed changes dynamically', () => {
      timer.setSpeed(1);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 1 } });

      const mutation: mediaInteractionData = {
        type: MediaInteractions.Play,
        currentTime: 0,
      };
      mediaManager.mediaMutation({
        target: mockMediaElement,
        timeOffset: 0,
        mutation,
      });

      timer.setTime(2000);
      const startHandler = mockEmitter.on.mock.calls.find(
        (call: any[]) => call[0] === 'start',
      );
      if (startHandler) {
        startHandler[1]();
      }

      expect(mockMediaElement.currentTime).toBeCloseTo(2, 1);
      expect(mockMediaElement.playbackRate).toBe(1);

      timer.setSpeed(2);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 2 } });

      const subscribeCallback = speedService.subscribe.mock?.calls?.[0]?.[0];
      if (subscribeCallback) {
        subscribeCallback();
      }

      expect(mockMediaElement.playbackRate).toBe(2);
    });
  });

  describe('speed service subscription', () => {
    it('should subscribe to speed service changes', () => {
      expect(speedService.subscribe).toHaveBeenCalled();
    });
  });

  describe('pause behavior at different speeds', () => {
    beforeEach(() => {
      mediaManager.addMediaElements(mockMediaElement, 0, mockMirror);

      const mutation: mediaInteractionData = {
        type: MediaInteractions.Play,
        currentTime: 0,
      };
      mediaManager.mediaMutation({
        target: mockMediaElement,
        timeOffset: 0,
        mutation,
      });
    });

    it('should pause media correctly at 2x speed', () => {
      timer.setSpeed(2);
      speedService.send({ type: 'SET_SPEED', payload: { speed: 2 } });

      timer.setTime(3000);

      const pauseHandler = mockEmitter.on.mock.calls.find(
        (call: any[]) => call[0] === 'pause',
      );
      if (pauseHandler) {
        pauseHandler[1]();
      }

      expect(mockMediaElement.pause).toHaveBeenCalled();
    });
  });
});
