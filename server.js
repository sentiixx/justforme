import express from 'express';
import sharp from 'sharp';
import axios from 'axios';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Der perfekte 48-Farben-Server läuft!');
});

// Diese Funktion extrahiert die 48 qualitativ besten und abwechslungsreichsten Farben
function getPerfect48Palette(rgbBuffer) {
  const colorCounts = {};
  
  // 1. Farben leicht runden, um extrem ähnliche Nuancen zusammenzufassen (Unterdrückt graue Rausch-Pixel)
  for (let i = 0; i < rgbBuffer.length; i += 4) {
    // Wir runden die RGB-Werte auf 8er-Schritte ab (sorgt für klare Farbgruppen)
    const r = Math.round(rgbBuffer[i] / 8) * 8;
    const g = Math.round(rgbBuffer[i+1] / 8) * 8;
    const b = Math.round(rgbBuffer[i+2] / 8) * 8;
    
    const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    colorCounts[hex] = (colorCounts[hex] || 0) + 1;
  }

  // 2. In Array umwandeln und nach Häufigkeit sortieren
  let sortedColors = Object.keys(colorCounts).map(hex => ({
    hex, 
    count: colorCounts[hex]
  })).sort((a, b) => b.count - a.count);

  // 3. Diversitäts-Filter: Verhindern, dass die Palette nur aus 48 fast identischen Grautönen besteht
  const finalPalette = [];
  const minColorDistance = 30; // Mindestabstand zwischen Farben, damit sie sich sichtlich unterscheiden

  for (const item of sortedColors) {
    if (finalPalette.length >= 48) break;

    // Prüfen, ob die Farbe einer bereits gewählten Farbe zu ähnlich ist
    const r1 = parseInt(item.hex.slice(0,2), 16);
    const g1 = parseInt(item.hex.slice(2,4), 16);
    const b1 = parseInt(item.hex.slice(4,6), 16);

    let isTooSimilar = false;
    for (const chosen of finalPalette) {
      const r2 = parseInt(chosen.slice(0,2), 16);
      const g2 = parseInt(chosen.slice(2,4), 16);
      const b2 = parseInt(chosen.slice(4,6), 16);

      const distance = Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
      if (distance < minColorDistance) {
        isTooSimilar = true;
        break;
      }
    }

    // Wenn sie einzigartig genug ist, ab in die Palette!
    if (!isTooSimilar) {
      finalPalette.push(item.hex);
    }
  }

  // Falls wir durch den Filter weniger als 48 Farben haben, füllen wir den Rest mit den nächstbesten auf
  let fillIndex = 0;
  while (finalPalette.length < 48 && fillIndex < sortedColors.length) {
    if (!finalPalette.includes(sortedColors[fillIndex].hex)) {
      finalPalette.push(sortedColors[fillIndex].hex);
    }
    fillIndex++;
  }

  return finalPalette;
}

app.post('/pixel', async (req, res) => {
  try {
    const { url, size } = req.body;
    if (!url) return res.status(400).json({ error: 'Keine URL übergeben.' });

    const targetSize = parseInt(size) || 360;

    // 1. Bild von Deezer im Vollfarbmodus laden
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    // 2. Skalieren ohne PNG-Zerstörung (Wir holen die echten, unkomprimierten Rohdaten)
    const rawBuffer = await sharp(response.data)
      .resize(targetSize, targetSize, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const data = rawBuffer.data;

    // 3. Berechne die perfekte, abwechslungsreiche 48-Farben-Palette
    const palette = getPerfect48Palette(data);
    
    // Erstelle schnelle RGB-Objekte für das Mapping
    const paletteRGB = palette.map(hex => ({
      hex,
      r: parseInt(hex.slice(0,2), 16),
      g: parseInt(hex.slice(2,4), 16),
      b: parseInt(hex.slice(4,6), 16)
    }));

    // 4. Jedes Pixel seiner am besten passenden Palette-Farbe zuordnen
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i];
      const pg = data[i+1];
      const pb = data[i+2];

      let closestHex = palette[0];
      let minDistance = Infinity;

      // Mathematisch nächsten Nachbarn aus der 48er-Palette finden
      for (const color of paletteRGB) {
        const dist = (pr - color.r)**2 + (pg - color.g)**2 + (pb - color.b)**2;
        if (dist < minDistance) {
          minDistance = dist;
          closestHex = color.hex;
        }
      }
      pixels.push(`#${closestHex}`);
    }

    // 5. Pixel-Array zurückschicken
    res.status(200).json({ pixels });

  } catch (error) {
    res.status(500).json({ error: 'Farb-Fehler: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server fliegt auf Port ${PORT}`));
