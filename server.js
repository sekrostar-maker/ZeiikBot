const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

app.get("/", (req, res) => res.json({ status: "ZeiikBet API OK" }));

app.post("/analyze", async (req, res) => {
  const { home, away, comp, group, type } = req.body;
  if (!home || !away) return res.status(400).json({ error: "Données manquantes" });

  const prompt = `Tu es un expert en paris sportifs football. Analyse ce match avec précision.

Match: ${home} vs ${away}
Compétition: ${comp} — ${group}
Type: ${type === "wc" ? "Coupe du Monde 2026 (enjeux maximaux)" : "Match amical (intensité réduite)"}

Identifie les VALUE BETS réels. Sois rigoureux sur les taux de confiance.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "bets": [
    {"id":"over15","label":"Over 1.5","emoji":"⚽","prediction":"OUI","confidence":82,"isValue":true,"valueReason":"raison courte"},
    {"id":"over25","label":"Over 2.5","emoji":"🔥","prediction":"OUI","confidence":64,"isValue":false,"valueReason":""},
    {"id":"btts","label":"BTTS","emoji":"🎯","prediction":"OUI","confidence":69,"isValue":false,"valueReason":""},
    {"id":"result","label":"Résultat","emoji":"🏆","prediction":"Victoire ${home}","confidence":58,"isValue":false,"valueReason":""},
    {"id":"dnb","label":"Double chance","emoji":"🛡️","prediction":"${home} ou Nul","confidence":74,"isValue":true,"valueReason":"raison courte"}
  ],
  "bestBet": {"label":"Over 1.5","confidence":82},
  "globalConfidence": 76,
  "riskLevel": "FAIBLE",
  "summary": "Analyse en une phrase"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const txt = data.content?.map(b => b.text || "").join("").trim();
    const start = txt.indexOf("{");
    const end = txt.lastIndexOf("}");
    const result = JSON.parse(txt.slice(start, end + 1));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ZeiikBet API running on port ${PORT}`));
