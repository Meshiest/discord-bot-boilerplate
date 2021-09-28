import { ActivitiesOptions, Snowflake, TextChannel } from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import * as toml from 'toml';

export type Emote =
  | {
      id: Snowflake;
    }
  | {
      emoji: string;
    };

export type ChannelMap = {
  [name in keyof Config['channels']]: TextChannel;
};

export interface Config {
  discord: {
    client_id: Snowflake;
    guild_id: Snowflake;
    status?: ActivitiesOptions;
  };
  channels: Record<string, Snowflake>;
  roles: {
    admins: Snowflake[];
    [name: string]: Snowflake | Snowflake[];
  };
  reactions: Record<string, Emote>;
  features: Record<string, Record<string, any>>;
  data: {
    db_file: string;
  };
}

/**
 * read and parse a config file
 * @param file config file path
 * @returns config object
 */
function readConfigFile(file): Config {
  if (!existsSync) throw new Error(`Config file '${file}' does not exist`);

  try {
    return toml.parse(readFileSync(file, 'utf-8'));
  } catch (err) {
    throw err;
  }
}

/**
 * Read and validate the config file into an object
 * @returns Config object from 'config.toml'
 */
export function read(): Config {
  return readConfigFile('config.toml');
}
