<script lang="ts">
  import type { SpeedControlProps } from '../types';

  export let speed: SpeedControlProps['speed'];
  export let speedOption: SpeedControlProps['speedOption'];
  export let speedState: SpeedControlProps['speedState'];
  export let disabled: SpeedControlProps['disabled'] = false;
  export let onChange: SpeedControlProps['onChange'];

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
    transition: background-color 0.2s, color 0.2s;
  }

  .rr-speed-control button:hover:not(:disabled):not(.active) {
    background: #f0f1ff;
  }

  .rr-speed-control button:active:not(:disabled):not(.active) {
    background: #e0e1fe;
  }

  .rr-speed-control button.active {
    color: #fff;
    background: rgb(73, 80, 246);
  }

  .rr-speed-control button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .rr-speed-control__label {
    margin-right: 8px;
    color: #666;
    font-size: 12px;
  }
</style>

<div class="rr-speed-control">
  <span class="rr-speed-control__label">倍速:</span>
  {#each speedOption as s}
    <button
      class:active={isActive(s)}
      on:click={() => handleClick(s)}
      disabled={disabled || speedState === 'skipping'}
      aria-label={`Play at ${s}x speed`}
      aria-pressed={isActive(s)}
    >
      {s}x
    </button>
  {/each}
</div>
