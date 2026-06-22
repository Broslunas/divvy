import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { text, image, mimeType, isBonoCultural } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key no configurada en el servidor.' }, { status: 500 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let prompt = '';
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    const isBono = !!isBonoCultural;
    const categoriesList = isBono
      ? `'Artes en vivo, patrimonio y audiovisual', 'Soporte físico', 'Consumo digital'`
      : `'Comida', 'Transporte', 'Alojamiento', 'Supermercado', 'Entretenimiento', 'Otros'`;

    if (image) {
      // Image analysis (Receipt scanning)
      prompt = `Analiza esta imagen de recibo o ticket y extrae la información en formato JSON.
Devuelve ÚNICAMENTE el objeto JSON sin formato markdown ni texto adicional.
Esquema JSON obligatorio:
{
  "title": "Nombre del establecimiento o concepto limpio (ej: 'Mercadona', 'Restaurante Tagliatella')",
  "amount": 0.00 (importe total en número decimal),
  "category": "Una de estas: ${categoriesList}",
  "date": "YYYY-MM-DD (fecha del ticket, si no es visible usa hoy: '${todayStr}')",
  "items": [
    {
      "name": "Nombre del producto/servicio",
      "amount": 0.00 (precio individual de este artículo)
    }
  ]
}`;
      
      // Extract clean base64 data
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const imageMime = mimeType || 'image/jpeg';

      parts.push({
        inlineData: {
          mimeType: imageMime,
          data: base64Data
        }
      });
    } else if (text) {
      // Text NLP analysis
      prompt = `Analiza este texto que describe un gasto y extrae la información en formato JSON.
El usuario describe un gasto en lenguaje natural. Hoy es ${todayStr}. Calcula fechas relativas como "ayer" o "hace dos días" en base a hoy.
Devuelve ÚNICAMENTE el objeto JSON sin formato markdown ni texto adicional.
Esquema JSON obligatorio:
{
  "title": "Concepto limpio resumido (ej: 'Cena con amigos', 'Taxi al aeropuerto')",
  "amount": 0.00 (importe total detectado en número decimal),
  "category": "Una de estas: ${categoriesList}",
  "date": "YYYY-MM-DD (fecha calculada del gasto)"
}`;
      
      parts.push({ text: `Texto del gasto: "${text}"` });
    } else {
      return NextResponse.json({ error: 'Debes proporcionar texto o una imagen.' }, { status: 400 });
    }

    parts.push({ text: prompt });

    // Call Gemini API REST
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error details:', errText);
      throw new Error('Error al conectar con la API de Gemini.');
    }

    const resData = await response.json();
    const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse response
    const parsedData = JSON.parse(responseText.trim());
    return NextResponse.json(parsedData);

  } catch (e: unknown) {
    const err = e as Error;
    console.error('Error in AI parse API route:', err);
    return NextResponse.json({ 
      error: 'No se pudo procesar la solicitud con IA.',
      details: err.message 
    }, { status: 500 });
  }
}
