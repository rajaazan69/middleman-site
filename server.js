import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const GUILD_ID = "1333004910513623112";

// --- IDs to fetch (admins + middlemen) ---
const TARGET_USER_IDS = [
  "1132462148208050366","760321679619915827","808807957051605032","1187446885267542157",
  "1356149794040446998","975029249905946644","946167011875127398","994652555126771844",
  "844269330996920331","574303922597134376","730684374055518209","1148546295519248404"
];

// --- Badge mapping placeholder ---
const BADGES = {}; // add manually if you want

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

// --- Cache members ---
let memberCache = {}; // { userId: member data }

// --- Fetch and cache only target users ---
async function cacheTargetMembers() {
  for (const id of TARGET_USER_IDS) {
    try {
      const memberResponse = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${id}`,
        { headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
      );
      if (!memberResponse.ok) {
        console.warn(`Failed to fetch member ${id}`);
        continue;
      }
      const member = await memberResponse.json();
      memberCache[id] = member;
    } catch (err) {
      console.error(`Error fetching member ${id}:`, err);
    }
  }
  console.log(`Cached ${Object.keys(memberCache).length} target members`);
}

// Serve static files
app.use(express.static("public"));

// --- Fetch guild member info ---
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

  const allRoles = await fetchRoles();
  const roleNames = member.roles
    .map(rid => allRoles.find(r => r.id === rid)?.name)
    .filter(Boolean);

  res.json({
    id: member.user.id,
    username: member.user.username,
    discriminator: member.user.discriminator,
    avatar: member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
      : "https://cdn.discordapp.com/embed/avatars/0.png",
    badges: BADGES[id] || [], // use manual badges if added
    nitro: false,
    joined_at: member.joined_at || null,
    roles: roleNames,
  });
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

// --- Cache members on startup ---
cacheTargetMembers().then(() => {
  console.log("Member caching complete");
});

// --- Start Express ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});