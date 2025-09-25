import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Your guild (server) ID
const GUILD_ID = "1333004910513623112"; // replace with your server ID

// Serve static files (index.html, css, etc.)
app.use(express.static("public"));

// --- Badge Decoder ---
function decodeBadges(flags) {
  const badges = [];
  if (!flags) return badges;

  const badgeMap = {
    1 << 0: "Discord Staff",
    1 << 1: "Partnered Server Owner",
    1 << 2: "HypeSquad Events",
    1 << 3: "Bug Hunter Level 1",
    1 << 6: "HypeSquad Bravery",
    1 << 7: "HypeSquad Brilliance",
    1 << 8: "HypeSquad Balance",
    1 << 9: "Early Supporter",
    1 << 14: "Bug Hunter Level 2",
    1 << 17: "Verified Bot",
    1 << 18: "Early Verified Bot Developer",
    1 << 22: "Certified Moderator",
    1 << 24: "Active Developer",
  };

  for (const [bit, name] of Object.entries(badgeMap)) {
    if (flags & bit) badges.push(name);
  }
  return badges;
}

// Cache guild roles
let guildRoles = {};
async function fetchGuildRoles() {
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });
    if (res.ok) {
      const roles = await res.json();
      guildRoles = Object.fromEntries(roles.map(r => [r.id, r.name]));
      console.log("✅ Fetched guild roles");
    } else {
      console.error("Failed to fetch guild roles:", res.status);
    }
  } catch (err) {
    console.error("Error fetching guild roles:", err);
  }
}
fetchGuildRoles();

// --- Route: User Info ---
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // User profile
    const userResponse = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });

    if (!userResponse.ok) {
      return res.status(userResponse.status).json({ error: "Failed to fetch user" });
    }
    const user = await userResponse.json();

    // Member info
    let member = null;
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${id}`,
      {
        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
      }
    );
    if (memberResponse.ok) {
      member = await memberResponse.json();
    }

    res.json({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : "https://cdn.discordapp.com/embed/avatars/0.png",
      banner: user.banner
        ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png`
        : null,
      nitro: user.premium_type || 0,
      badges: decodeBadges(user.public_flags), // fixed
      joined_at: member?.joined_at || null,
      roles: member?.roles?.map(r => guildRoles[r] || r) || [], // fixed
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Route: Server Info ---
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});