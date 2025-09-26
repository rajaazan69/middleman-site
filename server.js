import express from "express";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;
const GUILD_ID = "1333004910513623112";

// Serve static files
app.use(express.static("public"));

// --- Discord client setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

// --- Caches ---
let memberCache = {}; // { userId: GuildMember }
let roleCache = null; // cached roles

// --- Helper: fetch roles once ---
async function fetchRoles(guild) {
  if (roleCache) return roleCache;
  const roles = await guild.roles.fetch();
  roleCache = Array.from(roles.values());
  return roleCache;
}

// --- Load members into cache at startup ---
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch(); // fetch all members
    guild.members.cache.forEach(member => {
      memberCache[member.id] = member;
    });
    console.log(`Cached ${Object.keys(memberCache).length} members`);

    // fetch roles
    await fetchRoles(guild);
  } catch (err) {
    console.error("Failed to fetch members at startup:", err);
  }
});

// --- Update cache on member join/leave ---
client.on("guildMemberAdd", member => {
  if (member.guild.id === GUILD_ID) memberCache[member.id] = member;
});
client.on("guildMemberRemove", member => {
  if (member.guild.id === GUILD_ID) delete memberCache[member.id];
});

// --- API route: get user info ---
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;
  const member = memberCache[id];

  if (!member) {
    return res.json({
      username: "Unknown",
      discriminator: "0000",
      id,
      avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
      badges: [],
      nitro: false,
      joined_at: null,
      roles: []
    });
  }

  const allRoles = await fetchRoles(member.guild);
  const roleNames = member.roles.cache
    .map(r => allRoles.find(ar => ar.id === r.id)?.name)
    .filter(Boolean);

  res.json({
    id: member.user.id,
    username: member.user.username,
    discriminator: member.user.discriminator,
    avatar: member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
      : "https://cdn.discordapp.com/embed/avatars/0.png",
    badges: [],
    nitro: false,
    joined_at: member.joinedAt ? member.joinedAt.toISOString() : null,
    roles: roleNames,
  });
});

// --- API route: get server info ---
app.get("/api/server/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const guild = await client.guilds.fetch(id);
    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : "https://cdn.discordapp.com/embed/avatars/1.png",
    });
  } catch (err) {
    console.error("Failed to fetch server:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Start Express ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// --- Login Discord bot ---
client.login(process.env.BOT_TOKEN);