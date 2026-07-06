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

    // 1. Bild von Deezer runterladen
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    // 2. HOCHWERTIGE 48-FARBEN-QUANTISIERUNG DIRECT IN SHARP
    // Wir wandeln das Bild erst in ein indiziertes PNG mit 48 Farben um.
    // Sharp sorgt hierbei automatisch dafür, dass die Farben das Bild bestmöglich darstellen!
    const quantizedBuffer = await sharp(response.data)
      .resize(targetSize, targetSize, { fit: 'fill' })
      .png({ 
        palette: true, 
        colors: 48,       // Zwingt Sharp auf exakt 48 Farben
        dither: 1.0       // Aktiviert perfektes Dithering, damit Farbverläufe nicht matschig/grau werden
      })
      .toBuffer();

    // 3. Unkomprimierte Pixel-Daten aus dem 48-Farben-Bild auslesen
    const { data } = await sharp(quantizedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 4. RGB-Buffer in Hex-Werte umwandeln
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i].toString(16).padStart(2, '0').toUpperCase();
      const g = data[i+1].toString(16).padStart(2, '0').toUpperCase();
      const b = data[i+2].toString(16).padStart(2, '0').toUpperCase();
      pixels.push(`#${r}${g}${b}`);
    }

    // 5. Die perfekt vorbereiteten Pixel zurück an Roblox schicken
    res.status(200).json({ pixels });

  } catch (error) {
    res.status(500).json({ error: 'Sharp-Fehler: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server fliegt auf Port ${PORT}`));
