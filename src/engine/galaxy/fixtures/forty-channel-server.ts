/**
 * A larger server (~40 channels across several categories) — the "capital"
 * case from docs/08-geography.md, and big enough to exercise the per-body
 * zone cap ("Huge server (200+ channels)" edge case still applies at any
 * size once a single category crosses the cap).
 */
import type { CategoryFixture, ChannelFixture, GuildFixture } from '../types';

const categories: CategoryFixture[] = [
  { id: '200000000000000001', name: 'Welcome' },
  { id: '200000000000000002', name: 'Mining Ops' },
  { id: '200000000000000003', name: 'Trade & Market' },
  { id: '200000000000000004', name: 'Development' },
  { id: '200000000000000005', name: 'Staff' },
];

const channels: ChannelFixture[] = [
  // Welcome (4 channels)
  { id: '200000000000001001', name: 'welcome', categoryId: categories[0]!.id },
  { id: '200000000000001002', name: 'rules', categoryId: categories[0]!.id },
  { id: '200000000000001003', name: 'general', categoryId: categories[0]!.id },
  { id: '200000000000001004', name: 'lounge', categoryId: categories[0]!.id },

  // Mining Ops (9 channels — one over the default 8-per-body cap)
  { id: '200000000000002001', name: 'mining-talk', categoryId: categories[1]!.id },
  { id: '200000000000002002', name: 'ore-prices', categoryId: categories[1]!.id },
  { id: '200000000000002003', name: 'mining-fleet-1', categoryId: categories[1]!.id },
  { id: '200000000000002004', name: 'mining-fleet-2', categoryId: categories[1]!.id },
  { id: '200000000000002005', name: 'mining-fleet-3', categoryId: categories[1]!.id },
  { id: '200000000000002006', name: 'salvage', categoryId: categories[1]!.id },
  { id: '200000000000002007', name: 'refinery-status', categoryId: categories[1]!.id },
  { id: '200000000000002008', name: 'ore-market', categoryId: categories[1]!.id },
  { id: '200000000000002009', name: 'deep-core-mining', categoryId: categories[1]!.id },

  // Trade & Market (8 channels)
  { id: '200000000000003001', name: 'market', categoryId: categories[2]!.id },
  { id: '200000000000003002', name: 'trade-routes', categoryId: categories[2]!.id },
  { id: '200000000000003003', name: 'shop-front', categoryId: categories[2]!.id },
  { id: '200000000000003004', name: 'haggling', categoryId: categories[2]!.id },
  { id: '200000000000003005', name: 'contracts', categoryId: categories[2]!.id },
  { id: '200000000000003006', name: 'price-checks', categoryId: categories[2]!.id },
  { id: '200000000000003007', name: 'bulk-orders', categoryId: categories[2]!.id },
  { id: '200000000000003008', name: 'the-bar', categoryId: categories[2]!.id },

  // Development (7 channels)
  { id: '200000000000004001', name: 'dev-general', categoryId: categories[3]!.id },
  { id: '200000000000004002', name: 'build-logs', categoryId: categories[3]!.id },
  { id: '200000000000004003', name: 'bug-reports', categoryId: categories[3]!.id },
  { id: '200000000000004004', name: 'feature-requests', categoryId: categories[3]!.id },
  { id: '200000000000004005', name: 'dev-voice', categoryId: categories[3]!.id, kind: 'voice' },
  { id: '200000000000004006', name: 'changelog', categoryId: categories[3]!.id },
  { id: '200000000000004007', name: 'dev-forum', categoryId: categories[3]!.id, kind: 'forum' },

  // Staff (6 channels, several locked down — no-signal)
  { id: '200000000000005001', name: 'mod-chat', categoryId: categories[4]!.id, botCanSend: false },
  { id: '200000000000005002', name: 'admin-only', categoryId: categories[4]!.id, botCanSend: false },
  { id: '200000000000005003', name: 'staff-announcements', categoryId: categories[4]!.id },
  { id: '200000000000005004', name: 'ban-log', categoryId: categories[4]!.id, botCanSend: false },
  { id: '200000000000005005', name: 'staff-voice', categoryId: categories[4]!.id, kind: 'voice' },
  { id: '200000000000005006', name: 'staff-threads', categoryId: categories[4]!.id, kind: 'thread' },

  // Uncategorized -> deep-space body (6 channels)
  { id: '200000000000006001', name: 'off-topic' },
  { id: '200000000000006002', name: 'memes' },
  { id: '200000000000006003', name: 'introductions' },
  { id: '200000000000006004', name: 'suggestions' },
  { id: '200000000000006005', name: 'archive-2025' },
  { id: '200000000000006006', name: 'announcements' },
];

export const fortyChannelServer: GuildFixture = {
  guildId: '200000000000000000',
  name: 'The Rustbelt Collective',
  categories,
  channels,
};
