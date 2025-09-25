import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const GUILD_ID = "1333004910513623112";

// --- Badge Mapping ---
const BADGES = {
  1 << 0: "Discord Staff",
  1 << 1: "Partner",
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
  1 << 25: "Active Developer"
};

// --- Cache roles so we don’t spam API ---
let roleCache = null;
async function fetchRoles() {
  if (roleCache) return roleCache;
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
  });
  if (!res.ok) return [];
  const roles = await res.json();
  roleCache = roles;
  return roles;
}

// Serve static
app.use(express.static("public"));

app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Basic profile
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
      { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
    );
    if (memberResponse.ok) {
      member = await memberResponse.json();
    }

    // Convert flags → badge names
    const badges = [];
    for (const [flagStr, name] of Object.entries(BADGES)) {
  const flag = Number(flagStr);
  if ((user.public_flags & flag) === flag) badges.push(name);
}
    }

    // Convert role IDs → role names
    let roleNames = [];
    if (member?.roles?.length) {
      const allRoles = await fetchRoles();
      roleNames = member.roles
        .map(rid => allRoles.find(r => r.id === rid)?.name)
        .filter(Boolean);
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
      nitro: user.premium_type > 0, // true/false
      badges,
      joined_at: member?.joined_at || null,
      roles: roleNames,
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Guild/server info
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