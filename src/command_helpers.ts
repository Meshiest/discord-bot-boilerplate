import { Client, Guild, Interaction } from 'discord.js';
import { ChannelMap, Config } from './config';
import Database from './db';

/**
 * generic properties sent to the command to command handlers
 */
export interface BotMeta {
  client: Client;
  db: Database;
  guild: Guild;
  config: Config;
  channels: ChannelMap;
}

/** Every command implements this to handle events
 * return false to indicate that this command was not eaten
 */
export type InteractionHandler = ({}: {
  options: CommandOptions;
  event: Interaction;
} & BotMeta) => Promise<boolean | void>;

export type BotHook = (meta: BotMeta) => Promise<void>;

export type CommandOptions = { [name: string]: any };
