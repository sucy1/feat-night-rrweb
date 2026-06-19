<script lang="ts">
  import { onMount } from 'svelte';
  import { formatTime } from '../utils';
  import type { TimelineProps } from '../types';

  export let currentTime: TimelineProps['currentTime'];
  export let totalTime: TimelineProps['totalTime'];
  export let percentage: TimelineProps['percentage'];
  export let inactivePeriods: TimelineProps['inactivePeriods'];
  export let customEvents: TimelineProps['customEvents'];
  export let disabled: TimelineProps['disabled'] = false;
  export let onSeek: TimelineProps['onSeek'];
  export let onStepBackward: TimelineProps['onStepBackward'] = undefined;
  export let onStepForward: TimelineProps['onStepForward'] = undefined;
  export let stepSeconds = 5;

  let progress: HTMLElement;
  let isDragging = false;

  const getTimeOffsetFromEvent = (event: MouseEvent | TouchEvent): number => {
    if (!progress) return 0;
    const progressRect = progress.getBoundingClientRect();
    let clientX: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
    } else if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
    } else {
      return 0;
    }

    const x = clientX - progressRect.left;
    let percent = x / progressRect.width;
    percent = Math.max(0, Math.min(1, percent));
    return totalTime * percent;
  };

  const handleProgressClick = (event: MouseEvent) => {
    if (disabled) return;
    const timeOffset = getTimeOffsetFromEvent(event);
    onSeek(timeOffset);
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (disabled) return;
    isDragging = true;
    const timeOffset = getTimeOffsetFromEvent(event);
    onSeek(timeOffset);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging || disabled) return;
    event.preventDefault();
    const timeOffset = getTimeOffsetFromEvent(event);
    onSeek(timeOffset);
  };

  const handleMouseUp = () => {
    isDragging = false;
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (disabled) return;
    isDragging = true;
    const timeOffset = getTimeOffsetFromEvent(event);
    onSeek(timeOffset);
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isDragging || disabled) return;
    event.preventDefault();
    const timeOffset = getTimeOffsetFromEvent(event);
    onSeek(timeOffset);
  };

  const handleTouchEnd = () => {
    isDragging = false;
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (onStepBackward) {
        onStepBackward(stepSeconds);
      } else {
        const newTime = Math.max(0, currentTime - stepSeconds * 1000);
        onSeek(newTime);
      }
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (onStepForward) {
        onStepForward(stepSeconds);
      } else {
        const newTime = Math.min(totalTime, currentTime + stepSeconds * 1000);
        onSeek(newTime);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      onSeek(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      onSeek(totalTime);
    }
  };

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      }
    };
  });
</script>

<style>
  .rr-timeline {
    width: 100%;
    display: flex;
    align-items: center;
  }

  .rr-timeline__time {
    display: inline-block;
    width: 100px;
    text-align: center;
    color: #11103e;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }

  .rr-progress-wrapper {
    flex: 1;
    padding: 8px 0;
    cursor: pointer;
  }

  .rr-progress {
    height: 12px;
    background: #eee;
    position: relative;
    border-radius: 3px;
    box-sizing: border-box;
    border-top: solid 4px #fff;
    border-bottom: solid 4px #fff;
    transition: height 0.2s;
  }

  .rr-progress-wrapper:hover .rr-progress {
    height: 14px;
  }

  .rr-progress.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .rr-progress__step {
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #e0e1fe;
    border-radius: 3px;
    transition: background-color 0.2s;
  }

  .rr-progress-wrapper:hover .rr-progress__step {
    background: #c4c6ff;
  }

  .rr-progress__handler {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    background: rgb(73, 80, 246);
    box-shadow: 0 2px 6px rgba(73, 80, 246, 0.4);
    transition: width 0.2s, height 0.2s, box-shadow 0.2s;
    z-index: 2;
  }

  .rr-progress-wrapper:hover .rr-progress__handler,
  .dragging .rr-progress__handler {
    width: 24px;
    height: 24px;
    box-shadow: 0 4px 12px rgba(73, 80, 246, 0.5);
  }
</style>

<div class="rr-timeline">
  <span class="rr-timeline__time" title="Current time">{formatTime(currentTime)}</span>
  <div
    class="rr-progress-wrapper"
    class:dragging={isDragging}
    tabindex={disabled ? -1 : 0}
    role="slider"
    aria-label="Playback progress"
    aria-valuemin={0}
    aria-valuemax={totalTime}
    aria-valuenow={Math.round(currentTime)}
    on:keydown={handleKeydown}
  >
    <div
      class="rr-progress"
      class:disabled={disabled}
      bind:this={progress}
      on:click={handleProgressClick}
      on:mousedown={handleMouseDown}
      on:touchstart|passive={handleTouchStart}
    >
      <div class="rr-progress__step" style="width: {percentage}" />
      {#each inactivePeriods as period}
        <div
          title={period.name}
          style="width: {period.width};height: 4px;position: absolute;background: {period.background};left: {period.position};"
        />
      {/each}
      {#each customEvents as event}
        <div
          title={event.name}
          style="width: 10px;height: 5px;position: absolute;top: 2px;transform: translate(-50%, -50%);background: {event.background};left: {event.position};"
        />
      {/each}
      <div class="rr-progress__handler" style="left: {percentage}" role="presentation" />
    </div>
  </div>
  <span class="rr-timeline__time" title="Total duration">{formatTime(totalTime)}</span>
</div>
