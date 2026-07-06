// 1. Bild von Deezer runterladen
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    // 2. + 3. RESIZE & QUANTISIERUNG IN EINEM RUTSCH
    // Wenn Sharp das Bild direkt bearbeitet und als PNG ausgibt, 
    // greifen die 64 Farben garantiert!
    const quantizedBuffer = await sharp(response.data)
      .resize(targetSize, targetSize, { fit: 'fill' })
      .png({ 
        palette: true, 
        colors: 64,  // Jetzt erzwingt er die vollen 64 Farben
        dither: 0.2  // Dein gewünschter Dithering-Wert
      })
      .toBuffer();

    // 4. Unkomprimierte Pixel-Daten auslesen (Bleibt gleich, liest jetzt aber die echten 64 Farben)
    const { data } = await sharp(quantizedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
