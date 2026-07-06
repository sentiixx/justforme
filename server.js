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
    
    // 2. Bild leicht im Kontrast anpassen, um Kanten hervorzuheben
    const preparedBuffer = await sharp(response.data)
      .resize(targetSize, targetSize, { fit: 'fill' })
      .modulate({ brightness: 1.05, contrast: 1.2 }) // Erhöht den Kontrast für klare Farbgrenzen
      .toBuffer();

    // 3. PNG-Generierung OHNE DITHERING (dither: 0.0)
    // Das erzwingt harte, glatte Farbflächen wie in Bild 1!
    const quantizedBuffer = await sharp(preparedBuffer)
      .png({ 
        palette: true, 
        colors: 48, 
        dither: 0.0 // 0.0 schaltet das grieselige Punkt-Raster komplett aus!
      })
      .toBuffer();

    // 4. Unkomprimierte Pixel-Daten auslesen
    const { data } = await sharp(quantizedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 5. RGB-Buffer in Hex-Werte umwandeln
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
