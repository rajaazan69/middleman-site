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

// --- Badge map (Discord flags → icons) ---
const BADGE_MAP = {
  Staff: "https://cdn.discordapp.com/badge-icons/4f3d53b1e85b1b846e42f2be1c6c4b6e.png",
  Partner: "https://cdn.discordapp.com/badge-icons/9dff6ab65e0d5f688d04d11f45abf9da.png",
  BugHunterLevel1: "https://cdn.discordapp.com/badge-icons/8f744b6e8f5a2c9a4d01cbdde46b4405.png",
  BugHunterLevel2: "https://cdn.discordapp.com/badge-icons/da15f03c13c5a2b74e3c7b9051f0c43e.png",
  HypeSquadOnlineHouse1: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61e442e483c1d.png", // Bravery
  HypeSquadOnlineHouse2: "https://cdn.discordapp.com/badge-icons/9e4eb4eb8f1a2e7d18e9f73e6e0c3df9.png", // Brilliance
  HypeSquadOnlineHouse3: "https://cdn.discordapp.com/badge-icons/0e4080e2ab4e2b0f3a566d8e97d5fdbd.png", // Balance
  Hypesquad: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61e442e483c1d.png",
  EarlySupporter: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d04baa.png",
  CertifiedModerator: "https://cdn.discordapp.com/badge-icons/9f6af7d8b5a2ff7e7a2b0f91c1b4c25a.png",
  ActiveDeveloper: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png",
};

// --- Fetch guild member info ---
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return res.status(500).json({ error: "Guild not found" });

    // Try to fetch member
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
        banner: null,
      });
    }

    // Fetch full user object for badges & banner
    const fullUser = await member.user.fetch(true);

    // Convert flags to badge objects with icons
    const badges = (fullUser.flags?.toArray() || []).map(flag => ({
      id: flag,
      name: flag,
      icon: BADGE_MAP[flag] || null,
    }));

    const avatar = member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=1024`
      : "https://cdn.discordapp.com/embed/avatars/0.png";

    const banner = fullUser.banner
      ? `https://cdn.discordapp.com/banners/${fullUser.id}/${fullUser.banner}.png?size=1024`
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
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=1024`
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