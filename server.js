const express = require("express");
const fetch = require("node-fetch");

const app = express();

app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch user" });
    }

    const user = await response.json();
    res.json({
      username: user.username,
      id: user.id,
      avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
      created: new Date(user.id / 4194304 + 1420070400000).toDateString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = app;