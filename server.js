import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Your guild (server) ID where you want to fetch join date & roles
const GUILD_ID = "YOUR_SERVER_ID"; // <- replace with your Discord server ID

// Serve static files (index.html, css, etc.)
app.use(express.static("public"));

// Route to fetch extended user info from Discord API
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Basic user profile
    const userResponse = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });

    if (!userResponse.ok) {
      return res.status(userResponse.status).json({ error: "Failed to fetch user" });
    }

    const user = await userResponse.json();

    // Guild member info (join date, roles)
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
      nitro: user.premium_type, // Nitro status
      badges: user.public_flags, // Discord badges bitfield
      joined_at: member?.joined_at || null,
      roles: member?.roles || [],
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to fetch server info
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
  console.log(`Server running on http://localhost:${PORT}`);
});