/**
 * A tiny 2-person server: no categories, a couple of default channels. This
 * is the "lonely outpost" case from docs/08-geography.md ("Small servers
 * are small sectors") — everything lands in the sector's deep-space body.
 */
import type { GuildFixture } from '../types';

export const twoPersonServer: GuildFixture = {
  guildId: '100000000000000001',
  name: 'Just Me and You',
  channels: [
    { id: '100000000000000010', name: 'general' },
    { id: '100000000000000011', name: 'mod-chat', botCanSend: true },
  ],
};
