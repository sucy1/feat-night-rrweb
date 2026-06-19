import type { eventWithTime } from '@rrweb/types';
import type { Replayer, playerConfig } from '@rrweb/replay';
import type { Mirror } from 'rrweb-snapshot';

export type PlaybackSpeed = 1 | 2 | 4 | 8;

export type CustomEventTag = {
  name: string;
  background: string;
  position: string;
};

export type InactivePeriod = {
  name: string;
  background: string;
  position: string;
  width: string;
};

export type SpeedControlProps = {
  speed: number;
  speedOption: number[];
  speedState: 'normal' | 'skipping';
  disabled?: boolean;
  onChange: (speed: number) => void;
};

export type TimelineProps = {
  currentTime: number;
  totalTime: number;
  percentage: string;
  inactivePeriods: InactivePeriod[];
  customEvents: CustomEventTag[];
  disabled?: boolean;
  onSeek: (timeOffset: number) => void;
  onStepBackward?: (seconds?: number) => void;
  onStepForward?: (seconds?: number) => void;
};

export type RRwebPlayerOptions = {
  target: HTMLElement;
  props: {
    /**
     * The events to replay.
     * @default `[]`
     */
    events: eventWithTime[];
    /**
     * The width of the replayer
     * @defaultValue `1024`
     */
    width?: number;
    /**
     * The height of the replayer
     * @defaultValue `576`
     */
    height?: number;
    /**
     * The maximum scale of the replayer (1 = 100%). Set to 0 for unlimited
     * @defaultValue `1`
     */
    maxScale?: number;
    /**
     * Whether to autoplay
     * @defaultValue `true`
     */
    autoPlay?: boolean;
    /**
     * The default speed to play at
     * @defaultValue `1`
     */
    speed?: number;
    /**
     * Speed options in UI
     * @defaultValue `[1, 2, 4, 8]`
     */
    speedOption?: number[];
    /**
     * Whether to show the controller UI
     * @defaultValue `true`
     */
    showController?: boolean;
    /**
     * Customize the custom events style with a key-value map
     * @defaultValue `{}`
     */
    tags?: Record<string, string>;
    /**
     * Customize the color of inactive periods indicator in the progress bar with a valid CSS color string.
     * @defaultValue `#D4D4D4`
     */
    inactiveColor?: string;
    /**
     * Whether to show the fast forward speed control buttons
     * @defaultValue `true`
     */
    showSpeedControl?: boolean;
    /**
     * Step size (in seconds) for timeline keyboard navigation
     * @defaultValue `5`
     */
    timelineStep?: number;
  } & Partial<playerConfig>;
};

export type RRwebPlayerExpose = {
  addEventListener: (
    event: string,
    handler: (params: unknown) => unknown,
  ) => void;
  addEvent: (event: eventWithTime) => void;
  getMetaData: Replayer['getMetaData'];
  getReplayer: () => Replayer;
  getMirror: () => Mirror;
  // getSilly: () => void;
  toggle: () => void;
  setSpeed: (speed: number) => void;
  toggleSkipInactive: () => void;
  toggleFullscreen: () => void;
  triggerResize: () => void;
  $set: (options: { width: number; height: number }) => void;
  play: () => void;
  pause: () => void;
  goto: (timeOffset: number, play?: boolean) => void;
  playRange: (
    timeOffset: number,
    endTimeOffset: number,
    startLooping?: boolean,
    afterHook?: undefined | (() => void),
  ) => void;
  /**
   * Step backward by the specified number of seconds
   * @param seconds - Number of seconds to step backward, defaults to 5
   */
  stepBackward: (seconds?: number) => void;
  /**
   * Step forward by the specified number of seconds
   * @param seconds - Number of seconds to step forward, defaults to 5
   */
  stepForward: (seconds?: number) => void;
  /**
   * Get the current playback speed
   */
  getSpeed: () => number;
};
