import express from "express";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;
const GUILD_ID = "1333004910513623112";

// --- Discord client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // needed for fetching members
  ],
  partials: [Partials.GuildMember],
});

// --- Serve static files ---
app.use(express.static("public"));

// --- Cache roles to avoid multiple API calls ---
let roleCache = null;
async function fetchRoles(guild) {
  if (roleCache) return roleCache;
  roleCache = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
  return roleCache;
}

// --- Fetch guild member info ---
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return res.status(500).json({ error: "Guild not found" });

    // Try to fetch from cache or API
    let member = guild.members.cache.get(id);
    if (!member) {
      try {
        member = await guild.members.fetch(id);
      } catch {
        member = null;
      }
    }

    if (!member) {
      return res.json({
        username: "Unknown",
        discriminator: "0000",
        id,
        avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
        badges: [],
        nitro: false,
        joined_at: null,
        roles: [],
        banner: null,
        guild_avatar: null,
        guild_banner: null,
        guild_color: null,
      });
    }

    // Fetch full user for flags & banner
    const fullUser = await member.user.fetch(true);
    const badges = fullUser.flags?.toArray() || [];

    const avatar = member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
      : "https://cdn.discordapp.com/embed/avatars/0.png";

    const banner = fullUser.banner
      ? `https://cdn.discordapp.com/banners/${fullUser.id}/${fullUser.banner}.png?size=1024`
      : null;

    const guildAvatar = member.avatar
      ? `https://cdn.discordapp.com/guilds/${guild.id}/users/${member.id}/avatars/${member.avatar}.png`
      : null;

    const guildBanner = member.banner
      ? `https://cdn.discordapp.com/guilds/${guild.id}/users/${member.id}/banners/${member.banner}.png`
      : null;

    res.json({
      id: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      avatar,
      banner,
      badges,
      nitro: !!member.premiumSince, // rough Nitro detection
      joined_at: member.joinedAt || null,
      roles: member.roles.cache.map(r => r.name).filter(Boolean),
      guild_avatar: guildAvatar,
      guild_banner: guildBanner,
      guild_color: member.hexAccentColor || null,
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Fetch guild/server info ---
app.get("/api/server/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const guild = client.guilds.cache.get(id);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : "https://cdn.discordapp.com/embed/avatars/1.png",
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Start bot and server ---
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    try {
      console.log("⏳ Fetching all members...");
      await guild.members.fetch(); // pulls all ~3000 members
      console.log(`✅ Cached ${guild.members.cache.size} members`);
    } catch (err) {
      console.error("❌ Failed to fetch members:", err);
    }
  } else {
    console.warn("⚠️ Guild not found on ready event");
  }

  // Start Express server
  app.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
  });
});

client.login(process.env.BOT_TOKEN);