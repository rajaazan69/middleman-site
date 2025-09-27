
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const GUILD_ID = "1333004910513623112";

// --- Badge mapping is now ignored, since we can't fetch arbitrary badges ---
const BADGES = {}; // left empty, Discord API no longer allows fetching for other users

// --- Cache roles to avoid multiple API calls ---
let roleCache = null;
async function fetchRoles() {
  if (roleCache) return roleCache;
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
  });
  if (!res.ok) return [];
  const roles = await res.json();
  roleCache = roles;
  return roles;
}

// Serve static files
app.use(express.static("public"));

// --- Fetch guild member info only ---
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return res.status(500).json({ error: "Guild not found" });

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
        : "https://cdn.discordapp.com/embed/avatars/0.png",
      badges: [],
      nitro: false,
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
    const response = await fetch(`https://discord.com/api/v10/guilds/${id}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch server" });
    }

    const guild = await response.json();
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});