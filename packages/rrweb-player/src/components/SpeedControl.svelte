<script lang="ts">
  import { beforeUpdate, afterUpdate } from 'svelte';
  import type { SpeedControlProps } from '../types';

  export let speed: SpeedControlProps['speed'];
  export let speedOption: SpeedControlProps['speedOption'];
  export let speedState: SpeedControlProps['speedState'];
  export let disabled: SpeedControlProps['disabled'] = false;
  export let onChange: SpeedControlProps['onChange'];

  let prevSpeed = speed;
  let isAnimating = false;

  beforeUpdate(() => {
    prevSpeed = speed;
  });

  afterUpdate(() => {
    if (prevSpeed !== speed && speedState !== 'skipping') {
      isAnimating = true;
      setTimeout(() => {
        isAnimating = false;
      }, 300);
    }
  });

  const isActive = (s: number) => s === speed && speedState !== 'skipping';

  const handleClick = (s: number) => {
    if (disabled || speedState === 'skipping') {
      return;
    }
    onChange(s);
  };
</script>

<style>
  .rr-speed-control {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .rr-speed-control button {
    width: 32px;
    height: 32px;
    display: flex;
    padding: 0;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition:
      background-color 0.25s ease,
      color 0.25s ease,
      transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.25s ease,
      width 0.25s ease,
      height 0.25s ease,
      opacity 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .rr-speed-control button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(73, 80, 246, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.4s ease, height 0.4s ease;
    pointer-events: none;
  }

  .rr-speed-control button:hover:not(:disabled):not(.active) {
    background: #f0f1ff;
    transform: scale(1.05);
  }

  .rr-speed-control button:hover:not(:disabled):not(.active)::before {
    width: 100%;
    height: 100%;
  }

  .rr-speed-control button:active:not(:disabled):not(.active) {
    background: #e0e1fe;
    transform: scale(0.95);
  }

  .rr-speed-control button.active {
    color: #fff;
    background: rgb(73, 80, 246);
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(73, 80, 246, 0.4);
    animation: speedPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .rr-speed-control button.active:hover {
    transform: scale(1.15);
    box-shadow: 0 4px 12px rgba(73, 80, 246, 0.5);
  }

  .rr-speed-control button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    transform: scale(1);
  }

  @keyframes speedPop {
    0% {
      transform: scale(1);
      box-shadow: 0 2px 8px rgba(73, 80, 246, 0.4);
    }
    50% {
      transform: scale(1.2);
      box-shadow: 0 6px 16px rgba(73, 80, 246, 0.6);
    }
    100% {
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(73, 80, 246, 0.4);
    }
  }

  .rr-speed-control__label {
    margin-right: 8px;
    color: #666;
    font-size: 12px;
    transition: color 0.2s ease;
  }

  .rr-speed-control:hover .rr-speed-control__label {
    color: #4950f6;
  }
</style>

<div class="rr-speed-control">
  <span class="rr-speed-control__label">倍速:</span>
  {#each speedOption as s}
    <button
      class:active={isActive(s)}
      class:animating={isAnimating && isActive(s)}
      on:click={() => handleClick(s)}
      disabled={disabled || speedState === 'skipping'}
      aria-label={`Play at ${s}x speed`}
      aria-pressed={isActive(s)}
    >
      {s}x
    </button>
  {/each}
</div>
