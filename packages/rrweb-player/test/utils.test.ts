import { describe, it, expect } from 'vitest';
import { formatTime, getInactivePeriods, typeOf } from '../src/utils';
import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

describe('rrweb-player utils', () => {
  describe('formatTime', () => {
    it('should format 0 ms as 00:00', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    it('should format negative time as 00:00', () => {
      expect(formatTime(-1000)).toBe('00:00');
    });

    it('should format seconds correctly', () => {
      expect(formatTime(1000)).toBe('00:01');
      expect(formatTime(15000)).toBe('00:15');
      expect(formatTime(59000)).toBe('00:59');
    });

    it('should format minutes correctly', () => {
      expect(formatTime(60000)).toBe('01:00');
      expect(formatTime(125000)).toBe('02:05');
      expect(formatTime(3599000)).toBe('59:59');
    });

    it('should format hours correctly', () => {
      expect(formatTime(3600000)).toBe('01:00:00');
      expect(formatTime(3661000)).toBe('01:01:01');
      expect(formatTime(7320000)).toBe('02:02:00');
    });

    it('should pad with zeros correctly', () => {
      expect(formatTime(5000)).toBe('00:05');
      expect(formatTime(360000)).toBe('06:00');
    });
  });

  describe('typeOf', () => {
    it('should detect boolean', () => {
      expect(typeOf(true)).toBe('boolean');
      expect(typeOf(false)).toBe('boolean');
    });

    it('should detect number', () => {
      expect(typeOf(123)).toBe('number');
      expect(typeOf(0)).toBe('number');
      expect(typeOf(-1.5)).toBe('number');
    });

    it('should detect string', () => {
      expect(typeOf('hello')).toBe('string');
      expect(typeOf('')).toBe('string');
    });

    it('should detect array', () => {
      expect(typeOf([1, 2, 3])).toBe('array');
      expect(typeOf([])).toBe('array');
    });

    it('should detect object', () => {
      expect(typeOf({})).toBe('object');
      expect(typeOf({ key: 'value' })).toBe('object');
    });

    it('should detect undefined', () => {
      expect(typeOf(undefined)).toBe('undefined');
    });

    it('should detect null', () => {
      expect(typeOf(null)).toBe('null');
    });

    it('should detect function', () => {
      expect(typeOf(() => {})).toBe('function');
    });

    it('should detect date', () => {
      expect(typeOf(new Date())).toBe('date');
    });

    it('should detect RegExp', () => {
      expect(typeOf(/test/)).toBe('regExp');
    });
  });

  describe('getInactivePeriods', () => {
    const createEvents = (
      timestamps: number[],
      hasInteraction = true,
    ): eventWithTime[] => {
      return timestamps.map((ts, index) => {
        if (index === 0) {
          return {
            type: EventType.Meta,
            data: { width: 1024, height: 768 },
            timestamp: ts,
          } as eventWithTime;
        }
        if (hasInteraction) {
          return {
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.MouseInteraction,
              type: 0,
              id: 1,
              x: 0,
              y: 0,
            },
            timestamp: ts,
          } as eventWithTime;
        }
        return {
          type: EventType.IncrementalSnapshot,
          data: {
            source: IncrementalSource.Mutation,
            removes: [],
            adds: [],
            attributes: [],
            texts: [],
          },
          timestamp: ts,
        } as eventWithTime;
      });
    };

    it('should return empty array when no inactive periods', () => {
      const events = createEvents([0, 1000, 2000, 3000, 4000]);
      const threshold = 10 * 1000;
      const periods = getInactivePeriods(events, threshold);
      expect(periods).toEqual([]);
    });

    it('should detect inactive periods exceeding threshold', () => {
      const events = createEvents([0, 1000, 20000, 21000]);
      const threshold = 10 * 1000;
      const periods = getInactivePeriods(events, threshold);
      expect(periods).toEqual([[1000, 20000]]);
    });

    it('should detect multiple inactive periods', () => {
      const events = createEvents([0, 1000, 15000, 16000, 40000, 41000]);
      const threshold = 10 * 1000;
      const periods = getInactivePeriods(events, threshold);
      expect(periods).toEqual([
        [1000, 15000],
        [16000, 40000],
      ]);
    });

    it('should ignore non-interaction events', () => {
      const interactionEvents = createEvents([0, 1000, 20000, 21000], true);
      const mutationOnly = createEvents([0, 1000, 20000, 21000], false);
      const threshold = 10 * 1000;

      const withInteraction = getInactivePeriods(interactionEvents, threshold);
      const withoutInteraction = getInactivePeriods(mutationOnly, threshold);

      expect(withInteraction).toEqual([[1000, 20000]]);
      expect(withoutInteraction).toEqual([]);
    });

    it('should handle exact threshold boundary', () => {
      const events = createEvents([0, 1000, 11000, 12000]);
      const threshold = 10 * 1000;
      const periods = getInactivePeriods(events, threshold);
      expect(periods).toEqual([[1000, 11000]]);
    });

    it('should not include periods equal to threshold', () => {
      const events = createEvents([0, 1000, 10999, 12000]);
      const threshold = 10 * 1000;
      const periods = getInactivePeriods(events, threshold);
      expect(periods).toEqual([]);
    });
  });
});
