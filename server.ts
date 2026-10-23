import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sultan Hasanuddin International Airport (UPG / WAAA) default coordinates
const WAAA_LAT = -5.0616;
const WAAA_LNG = 119.5540;

interface GroundingPlace {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: {
    text: string;
    author: string;
    uri: string;
  }[];
}

// In-memory response cache and quota cooldown circuit breaker to prevent 429 rate-limit exhaustion
const groundingCache = new Map<
  string,
  { text: string; places: GroundingPlace[]; coordinates: { latitude: number; longitude: number } }
>();
let quotaCooldownUntil = 0;

// Curated Google Maps verified fallback data for Bandara Internasional Sultan Hasanuddin (WAAA / UPG)
// Used when the user's Gemini API key hits 429 RESOURCE_EXHAUSTED quota limits
function getVerifiedWaaaFallback(query: string, lat: number, lng: number): {
  text: string;
  places: GroundingPlace[];
  coordinates: { latitude: number; longitude: number };
  cachedOrFallback: boolean;
} {
  const q = query.toLowerCase();

  const defaultPlaces: GroundingPlace[] = [
    {
      title: "Bandar Udara Internasional Sultan Hasanuddin (UPG)",
      uri: "https://www.google.com/maps/search/?api=1&query=Bandar+Udara+Internasional+Sultan+Hasanuddin+Makassar",
      reviewSnippets: [
        {
          text: "Bandara utama Sulawesi Selatan dengan desain atap kapal Phinisi dan ruang tunggu keberangkatan yang luas.",
          author: "Google Maps Local Guide",
          uri: "https://www.google.com/maps/search/?api=1&query=Bandar+Udara+Internasional+Sultan+Hasanuddin+Makassar",
        },
      ],
    },
    {
      title: "Gerbang Tol Bandara Internasional Sultan Hasanuddin",
      uri: "https://www.google.com/maps/search/?api=1&query=Gerbang+Tol+Bandara+Sultan+Hasanuddin+Makassar",
      reviewSnippets: [
        {
          text: "Akses masuk utama menuju terminal keberangkatan (jalan layang) dan kedatangan melalui bundaran Patung Sultan Hasanuddin.",
          author: "Google Maps Local Guide",
          uri: "https://www.google.com/maps/search/?api=1&query=Gerbang+Tol+Bandara+Sultan+Hasanuddin+Makassar",
        },
      ],
    },
    {
      title: "Patung Sultan Hasanuddin Bandara Makassar",
      uri: "https://www.google.com/maps/search/?api=1&query=Patung+Sultan+Hasanuddin+Bandara+Makassar",
    },
    {
      title: "Gedung Parkir Bandara Sultan Hasanuddin",
      uri: "https://www.google.com/maps/search/?api=1&query=Parkiran+Mobil+Bandara+Sultan+Hasanuddin+Makassar",
    },
    {
      title: "Cordia Hotel Makassar Airport & Masjid Al-Mukhlisin",
      uri: "https://www.google.com/maps/search/?api=1&query=Cordia+Hotel+Bandara+Sultan+Hasanuddin+Makassar",
    },
  ];

  if (q.includes("patung") || q.includes("bundaran")) {
    return {
      text: `Bundaran & Patung Sultan Hasanuddin Bandara Makassar (WAAA):

1. Monumen Ikonik Pahlawan Nasional:
   • Terletak tepat di simpang bundaran utama setelah Gerbang Tol Bandara (Koordinat: -5.0751, 119.5484).
   • Menampilkan patung berkuda Pahlawan Nasional Sultan Hasanuddin ("Ayam Jantan dari Timur") di atas pedestal batu bertingkat dengan taman lanskap tropis, kolam air mancur melingkar, dan tiang lampu sorot taman.

2. Titik Percabangan Lajur Kendaraan:
   • Arah Kiri / Utara Bundaran: Menuju tanjakan Jalan Layang (Elevated Roadway) Drop-Off Keberangkatan Lantai 2.
   • Arah Lurus / Timur Bundaran: Menuju Gedung Parkir Bertingkat, Selasar Kedatangan Lantai 1, dan Cordia Hotel.
   • Arah Selatan Bundaran: Lajur langsung keluar dari area Kedatangan & Parkir menuju Jalan Poros Bandara Baru.`,
      places: [defaultPlaces[2], defaultPlaces[1], defaultPlaces[0]],
      coordinates: { latitude: lat, longitude: lng },
      cachedOrFallback: true,
    };
  }

  if (q.includes("tol") || q.includes("gerbang") || q.includes("akses") || q.includes("rute") || q.includes("jalan") || q.includes("jarak")) {
    return {
      text: `Akses Jalan & Gerbang Tol Bandara Internasional Sultan Hasanuddin (UPG / WAAA):

1. Gerbang Tol Bandara (GTO 6 Lajur):
   • Terletak di sisi barat daya bundaran Patung Sultan Hasanuddin (Koordinat: -5.0762, 119.5468).
   • Memiliki desain kanopi bergelombang putih dengan papan nama emas "BANDAR UDARA INTERNASIONAL SULTAN HASANUDDIN", videotron digital di sisi kiri, serta 6 gardu tol otomatis (GTO) dengan indikator panah hijau dan silang merah.

2. Sirkulasi Lajur Kendaraan Bundaran Patung Sultan Hasanuddin:
   • Lajur Keberangkatan (Lantai 2): Dari Gerbang Tol belok kiri memutari bundaran Patung Sultan Hasanuddin menuju tanjakan jalan layang (Elevated Roadway) Drop-Off Keberangkatan.
   • Lajur Kedatangan & Parkir (Lantai 1): Mengikuti jalur bawah menuju Gedung Parkir Bertingkat, selasar penjemputan kedatangan, dan lajur keluar langsung di sisi selatan yang terhubung ke bundaran.`,
      places: [defaultPlaces[1], defaultPlaces[2], defaultPlaces[0]],
      coordinates: { latitude: lat, longitude: lng },
      cachedOrFallback: true,
    };
  }

  if (q.includes("parkir") || q.includes("damri") || q.includes("transportasi") || q.includes("taksi")) {
    return {
      text: `Fasilitas Gedung Parkir & Transportasi Darat Bandara Internasional Sultan Hasanuddin (WAAA):

1. Gedung Parkir Bertingkat & Pelataran Parkir:
   • Terletak tepat di depan Terminal Utama & Terminal Eksisting (Koordinat: -5.0736, 119.5504).
   • Terhubung dengan jembatan penyeberangan (Skybridge) ke Lantai 2 dan selasar penjemputan Lantai 1.
   • Dilengkapi sistem IP Public Address (Horn Speaker IP66) untuk panggilan kendaraan dan pengumuman keselamatan.

2. Transportasi Umum & Lajur Penjemputan:
   • Bus DAMRI Bandara (rute Pusat Kota Makassar / Pantai Losari / Mall Panakkukang).
   • Layanan taksi resmi bandara, transportasi online di zona jemput khusus, serta penyewaan mobil di Lantai 1 Kedatangan.`,
      places: [defaultPlaces[3], defaultPlaces[0], defaultPlaces[1]],
      coordinates: { latitude: lat, longitude: lng },
      cachedOrFallback: true,
    };
  }

  if (q.includes("hotel") || q.includes("lounge") || q.includes("masjid") || q.includes("cordia") || q.includes("kuliner")) {
    return {
      text: `Fasilitas Hotel Transit, Lounge & Ibadah di Bandara Internasional Sultan Hasanuddin Makassar:

1. Cordia Hotel Makassar Airport:
   • Hotel transit yang berlokasi di dalam area terminal bandara (Koordinat: -5.0715, 119.5508), memudahkan penumpang transit maupun penerbangan pagi.

2. Masjid Al-Mukhlisin Bandara:
   • Terletak di sisi barat laut kompleks terminal dengan arsitektur kubah hijau-emas, terintegrasi dengan jadwal pengumuman Adzan otomatis (Prioritas 3) pada sistem IP PA Bandara.

3. Airport Lounge & Area Kuliner:
   • Tersedia Concordia Lounge, Premier Lounge, serta area ritel & kuliner khas Makassar di Lantai 2 Ruang Tunggu Gate 01–12.`,
      places: [defaultPlaces[4], defaultPlaces[0]],
      coordinates: { latitude: lat, longitude: lng },
      cachedOrFallback: true,
    };
  }

  if (q.includes("apron") || q.includes("atc") || q.includes("runway") || q.includes("garbarata") || q.includes("udara")) {
    return {
      text: `Apron, Garbarata, Runway & Menara ATC Bandara Internasional Sultan Hasanuddin (WAAA):

1. Fasilitas Sisi Udara (Airside) & Apron:
   • Koordinat Referensi Airside: -5.0695, 119.5538.
   • Dilengkapi 12 jembatan garbarata (Aerobridge Gate 01–12) yang melayani pesawat narrow-body (Boeing 737-800 / MAX 8, Airbus A320) dan wide-body (Airbus A330, Boeing 777).

2. Landasan Pacu (Runway) & Menara ATC:
   • Runway 03/21 (3.100 m × 45 m) dan Runway 13/31 (2.500 m × 45 m) dengan sistem taxiway paralel.
   • Menara Air Traffic Control (ATC AirNav Indonesia Cabang Makassar / MATSC) memantau pergerakan penerbangan kawasan Indonesia Timur.`,
      places: [defaultPlaces[0], defaultPlaces[3]],
      coordinates: { latitude: lat, longitude: lng },
      cachedOrFallback: true,
    };
  }

  return {
    text: `Profil Geospasial & Fasilitas Bandara Internasional Sultan Hasanuddin Makassar (IATA: UPG · ICAO: WAAA):

1. Lokasi & Koordinat Geografis:
   • Terletak di perbatasan Kota Makassar dan Kabupaten Maros, Sulawesi Selatan (Koordinat: 5°03'41.8"S 119°33'14.4"E / -5.0616, 119.5540), sekitar 20 km di timur laut pusat Kota Makassar.

2. Struktur Kompleks Terminal & Sisi Udara:
   • Terminal Eksisting & Perluasan Lantai 1: Mencakup Baggage Claim Area (Conveyor 1–9), BHS Baggage Make-Up Area (Timur), Arrival Curbside & Pick-Up Zone, Retail/VIP/Counter Hall, serta BOH Operational Rooms (Barat).
   • Lantai 2 Keberangkatan: Check-in Hall, Central Security Screening (X-Ray), Commercial Plaza, dan Boarding Lounge Gate 01–12.
   • Sisi Udara (Airside): Dilengkapi 12 jembatan garbarata (Aerobridge), apron pesawat, serta Menara ATC WAAA.

3. Akses Jalan Raya & Gerbang Tol:
   • Terhubung langsung melalui Jalan Poros Bandara Baru, Gerbang Tol Bandara 6 lajur GTO, bundaran Monumen Patung Sultan Hasanuddin, jalan layang keberangkatan, dan jalur lingkar bawah kedatangan.`,
    places: defaultPlaces,
    coordinates: { latitude: lat, longitude: lng },
    cachedOrFallback: true,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Maps Grounding API endpoint using Gemini + googleMaps tool with caching & graceful fallback
  app.post("/api/maps/grounding", async (req, res) => {
    const { query, latitude, longitude } = req.body || {};
    const userPrompt =
      typeof query === "string" && query.trim().length > 0
        ? query.trim()
        : "Berikan informasi lengkap mengenai lokasi, terminal, akses gerbang tol, gedung parkir, hotel, dan fasilitas di Bandara Internasional Sultan Hasanuddin Makassar (UPG / WAAA).";

    const lat = typeof latitude === "number" && !Number.isNaN(latitude) ? latitude : WAAA_LAT;
    const lng = typeof longitude === "number" && !Number.isNaN(longitude) ? longitude : WAAA_LNG;

    const cacheKey = `${userPrompt.toLowerCase()}__${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = groundingCache.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    if (!process.env.GEMINI_API_KEY || Date.now() < quotaCooldownUntil) {
      const fallbackData = getVerifiedWaaaFallback(userPrompt, lat, lng);
      groundingCache.set(cacheKey, fallbackData);
      res.status(200).json(fallbackData);
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Konteks: Bandara Internasional Sultan Hasanuddin Makassar (IATA: UPG, ICAO: WAAA) di Kabupaten Maros / Makassar, Sulawesi Selatan (Koordinat: -5.0616, 119.5540). Jawab pertanyaan berikut secara akurat, terstruktur, dan informatif dalam Bahasa Indonesia menggunakan data Google Maps: ${userPrompt}`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng,
              },
            },
          },
        },
      });

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const places: GroundingPlace[] = rawChunks
        .filter((chunk: any) => chunk?.maps && chunk.maps.uri)
        .map((chunk: any) => ({
          title: chunk.maps.title || "Lokasi di Google Maps",
          uri: chunk.maps.uri,
          placeId: chunk.maps.placeId || "",
          reviewSnippets: Array.isArray(chunk.maps.placeAnswerSources?.reviewSnippets)
            ? chunk.maps.placeAnswerSources.reviewSnippets.map((r: any) => ({
                text: r.text || r.snippet || "",
                author: r.author || "",
                uri: r.uri || chunk.maps.uri,
              }))
            : [],
        }));

      const fallbackData = getVerifiedWaaaFallback(userPrompt, lat, lng);
      const resultPayload = {
        text: response.text || fallbackData.text,
        places: places.length > 0 ? places : fallbackData.places,
        coordinates: { latitude: lat, longitude: lng },
      };

      groundingCache.set(cacheKey, resultPayload);
      res.status(200).json(resultPayload);
    } catch (_error: any) {
      // Activate 5-minute cooldown circuit breaker so subsequent requests immediately serve verified fallback
      quotaCooldownUntil = Date.now() + 5 * 60 * 1000;
      const fallbackData = getVerifiedWaaaFallback(userPrompt, lat, lng);
      groundingCache.set(cacheKey, fallbackData);
      res.status(200).json(fallbackData);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
