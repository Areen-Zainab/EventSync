const normalize = (value) => String(value || '').trim().toLowerCase();

const parseMentionTokens = (message) => {
  if (!message) return [];
  const matches = String(message).match(/@([a-zA-Z0-9._-]+)/g) || [];
  return [...new Set(matches.map((item) => item.slice(1).toLowerCase()))];
};

const resolveMentionedUsers = (tokens, members) => {
  if (!tokens.length || !members.length) return [];

  const tokenSet = new Set(tokens.map(normalize));
  return members.filter((member) => {
    const nameTokens = String(member.name || '')
      .split(/\s+/)
      .map(normalize)
      .filter(Boolean);
    const emailHandle = normalize(String(member.email || '').split('@')[0]);
    return nameTokens.some((part) => tokenSet.has(part)) || tokenSet.has(emailHandle);
  });
};

module.exports = { parseMentionTokens, resolveMentionedUsers };
