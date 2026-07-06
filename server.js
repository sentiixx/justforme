import express from 'express';
import sharp from 'sharp';
import axios from 'axios';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Turbo-Sharp-Server läuft und ist bereit für Roblox!');
});

app.post('/pixel', async (req, res) => {
  try {
    const { url, size } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Keine URL übergeben.' });
    }

    const targetSize = parseInt(size) || 360;

    // 1. Bild von Deezer herunterladen
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    // 2. Mit Sharp verarbeiten: Skalieren + auf 48 Farben limitieren
    const { data } = await sharp(response.data)
      .resize(targetSize, targetSize, { fit: 'fill' })
      .palette(48) // <- HIER PASSIERT DIE MAGIE: Reduziert das Bild auf maximal 48 Farben!
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 3. RGB-Buffer in Hex-Werte für Roblox umwandeln
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i].toString(16).padStart(2, '0').toUpperCase();
      const g = data[i+1].toString(16).padStart(2, '0').toUpperCase();
      const b = data[i+2].toString(16).padStart(2, '0').toUpperCase();
      pixels.push(`#${r}${g}${b}`);
    }

    res.status(200).json({ pixels });

  } catch (error) {
    res.status(500).json({ error: 'Sharp-Fehler: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server fliegt auf Port ${PORT}`));
