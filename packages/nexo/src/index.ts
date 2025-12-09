import type { UserConfig } from 'vite'

export interface NexoConfig extends UserConfig {

}

export function defineConfig(config: NexoConfig | (() => NexoConfig) | (() => Promise<NexoConfig>)): NexoConfig | (() => NexoConfig) | (() => Promise<NexoConfig>) {
  return config
}

export { loadNexoConfig } from './core/config'
export type { CommandContext, CommandModule } from './core/command-runner'