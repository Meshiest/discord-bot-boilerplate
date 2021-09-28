import https from 'https';
import crypto from 'crypto';
import { Emote } from './config';
import { GuildEmoji, ReactionEmoji } from 'discord.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isUUID = (str: string) => !!str.match(UUID_PATTERN);

/**
 * get data at a url
 * @param url url to get
 * @returns body as a string
 */
export async function httpsGet(url: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    https
      .request(
        url,
        {
          headers: {
            'user-agent': 'cake/1.0.0',
          },
        },
        res => {
          res.setEncoding('utf8');
          if (res.statusCode !== 200)
            return reject(
              new Error(
                'unexpected status ' +
                  res.statusCode +
                  ' - ' +
                  res.statusMessage
              )
            );

          let body = '';
          res.on('data', data => {
            body += data.toString();
          });

          res.on('end', () => {
            resolve(body);
          });

          res.on('error', err => {
            reject(err);
          });
        }
      )
      .end();
  });
}

/**
 * generate a code for user verification
 * @returns random data
 */
export function genCode(): string {
  const buf = Buffer.alloc(32);
  return crypto.randomFillSync(buf).toString('hex');
}

export function handleClose(callback: Function) {
  process.on('SIGINT', async () => {
    await callback();
    process.exit(2);
  });

  process.on('uncaughtException', async e => {
    await callback();
    console.error('Uncaught Exception', e.stack);
    process.exit(99);
  });
}

/**
 * applys a function to the values of an object
 * @param obj source object
 * @param valueMapper map function
 * @returns mapped object
 */
export function mapValues<T extends object, V>(
  obj: T,
  valueMapper: (k: T[keyof T]) => V
) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, valueMapper(v)])
  ) as { [K in keyof T]: V };
}

/**
 * Helper function for extracting emote identifier from a config emote
 * @param e config emote
 * @returns the identifier of the given emote
 */
export const emoji = (e: Emote): string => ('id' in e ? e.id : e.emoji);

/**
 * Helper function for comparing reaction emotes to config emotes
 * @param react message reaction
 * @param e config emote
 * @returns true if the reaction emote equals the config emote
 */
export const emojiCompare = (react: ReactionEmoji | GuildEmoji, e: Emote) =>
  'id' in e ? e.id === react.id : e.emoji === react.name;
