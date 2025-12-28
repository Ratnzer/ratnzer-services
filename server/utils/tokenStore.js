const prisma = require('../config/db');

const TOKEN_SETTING_KEY = 'fcm_tokens_v1';

const normalizeArray = (val) => (Array.isArray(val) ? val : []);

const readTokens = async () => {
  const setting = await prisma.setting.findUnique({ where: { key: TOKEN_SETTING_KEY } });
  return normalizeArray(setting?.value);
};

const writeTokens = async (tokens) => {
  await prisma.setting.upsert({
    where: { key: TOKEN_SETTING_KEY },
    update: { value: tokens },
    create: { key: TOKEN_SETTING_KEY, value: tokens },
  });
};

const upsertToken = async ({ token, platform = 'android', userId = null }) => {
  const tokens = await readTokens();
  const filtered = tokens.filter((t) => t.token !== token);
  filtered.push({
    token,
    platform,
    userId,
    updatedAt: new Date().toISOString(),
  });
  await writeTokens(filtered);
  return filtered;
};

const getTokensForUsers = async (userIds) => {
  const tokens = await readTokens();
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  return tokens.filter((t) => t.userId && userIds.includes(t.userId));
};

module.exports = {
  readTokens,
  upsertToken,
  getTokensForUsers,
};
