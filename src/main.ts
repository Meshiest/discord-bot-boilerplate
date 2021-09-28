import {
  ApplicationCommand,
  ApplicationCommandData,
  ApplicationCommandPermissionData,
  Client,
  Collection,
  Guild,
  GuildApplicationCommandPermissionData,
  Intents,
  Snowflake,
  TextChannel,
} from 'discord.js';
import * as dotenv from 'dotenv';
import { existsSync, readdirSync } from 'fs';
import * as path from 'path';
import 'source-map-support/register';
import { BotHook, BotMeta, InteractionHandler } from './command_helpers';
import * as cfg from './config';
import Database from './db';
import { handleClose, mapValues } from './util';

// load env from file if it exists
if (existsSync('.env')) {
  console.info('[init] loading env from .env');
  dotenv.config();
}

if (!process.env.TOKEN) {
  console.error('Expected bot TOKEN in ENV');
  process.exit(1);
}

// setup the client
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  ],
  partials: ['CHANNEL', 'REACTION', 'USER', 'MESSAGE'],
});

const config = cfg.read();
const db = new Database(config.data.db_file);

const interactionHandlers: InteractionHandler[] = [];
let guild: Guild, channels: cfg.ChannelMap;

client.once('ready', async () => {
  console.info('[init] setting up database');
  try {
    await db.init();
  } catch (err) {
    console.error('error initializing database', err);
    process.exit(1);
  }

  console.info('[init] detecting guild and channels');
  // guild and channels from config
  guild = client.guilds.cache.get(config.discord.guild_id);
  if (!guild) {
    console.error('error locating guild with id', config.discord.guild_id);
    process.exit(1);
  }

  channels = mapValues(
    config.channels,
    id => guild.channels.cache.get(id) as TextChannel
  );

  const commands = [];

  // read features from the features directory
  async function loadFeaturesFromDir(dir: string) {
    const dirPath = path.join(__dirname, dir);
    if (!existsSync(dirPath)) return;

    console.info('[init] loading', dir, 'modules');
    for (const module of readdirSync(dirPath)) {
      if (module.endsWith('.js')) {
        try {
          const {
            COMMANDS,
            handler,
            hook,
          }: {
            COMMANDS: ApplicationCommandData[];
            handler: InteractionHandler;
            hook: BotHook;
          } = require(path.join(dirPath, module));

          // let command modules load hooks
          if (typeof hook === 'function') {
            try {
              await hook(newBotMeta());
            } catch (err) {
              console.error('error loading hook from module', module, err);
            }
          }

          if (COMMANDS) {
            commands.push(...COMMANDS);
          }

          if (handler) {
            interactionHandlers.push(handler);
          }
        } catch (err) {
          console.error(
            'error loading features from',
            dir,
            'module',
            module,
            err
          );
        }
      }
    }
  }

  await loadFeaturesFromDir('features');
  await loadFeaturesFromDir('core_features');

  // update the commands for the bot
  console.info('[init] installing', commands.length, 'commands in discord');
  let appCommands: Collection<string, ApplicationCommand<{}>>;
  try {
    appCommands = await client.application.commands.set(
      commands,
      config.discord.guild_id
    );
  } catch (err) {
    console.error('error creating application commands', err);
    process.exit(1);
  }

  // build a list of admin-only permissions based on the commands
  const permissions: GuildApplicationCommandPermissionData[] = appCommands.map(
    (_cmd: ApplicationCommand, id: Snowflake) => ({
      id,
      permissions: [
        ...config.roles.admins.map((roleId: Snowflake) => ({
          type: 'ROLE',
          permission: true,
          id: roleId,
        })),
      ] as ApplicationCommandPermissionData[],
    })
  );

  // apply the permissions
  try {
    console.info('[init] updating command permissions in discord');
    await guild.commands.permissions.set({
      fullPermissions: permissions,
    });
  } catch (err) {
    console.error('error setting application permissions', err);
    process.exit(1);
  }

  console.info('[init] setting presence');

  if (config.discord.status) {
    const setStatus = () =>
      client.user.setPresence({
        activities: [config.discord.status],
        status: 'online',
      });
    setStatus();

    // set status every hour
    setInterval(setStatus, 60 * 60 * 1000);
  }

  console.info('[init] ready!');
});

/**
 * get global state for the bot
 * @returns metadata for operating the bot
 */
function newBotMeta(): BotMeta {
  return {
    client,
    db,
    guild,
    channels,
    config,
  };
}

client.on('interactionCreate', async event => {
  // options mapped as an object
  const options = event.isCommand()
    ? Object.fromEntries(
        event.options.data.map(({ name, value }) => [name, value])
      )
    : {};

  for (const handler of interactionHandlers) {
    try {
      const res = await handler({
        ...newBotMeta(),
        event,
        options,
      });
      if (typeof res !== 'undefined') {
        break;
      }
    } catch (err) {
      console.error('error handling command', err);
    }
  }
});

client.login(process.env.TOKEN);

handleClose(async () => {
  console.info('[info] closing db');
  try {
    await db.close();
    console.log('[info] saved and closed db');
  } catch (err) {
    console.error('error closing database', err);
  }
});
