import express from "express";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;
const GUILD_ID = "1333004910513623112";

// --- Discord client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
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

    // Fetch member from cache or API
    const member = await guild.members.fetch(id).catch(() => null);
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

    const roleNames = member.roles.cache.map(r => r.name).filter(Boolean);

    res.json({
      id: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      avatar: member.user.avatar
        ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`,
      badges: [], // cannot fetch reliably
      nitro: false, // cannot fetch reliably
      joined_at: member.joinedAt || null,
      roles: roleNames,
    });

  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Start bot and server ---
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Cache all members for the guild to prevent unknowns
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    await guild.members.fetch();
    console.log("All members cached");
  } else {
    console.warn("Guild not found on ready event");
  }

  // Start Express server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

client.login(process.env.BOT_TOKEN);