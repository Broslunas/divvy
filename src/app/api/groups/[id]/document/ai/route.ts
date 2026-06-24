import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { prompt, mode, content } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key no configurada en el servidor.' }, { status: 500 });
    }

    const group = await repository.groups.getById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    if (!group.members.includes(user.id)) {
      return NextResponse.json({ error: 'No tienes acceso a este grupo.' }, { status: 403 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Falta la instrucción del prompt.' }, { status: 400 });
    }

    let systemInstructions = `Eres un asistente experto en redacción, organización de viajes y finanzas.
Devuelve tu respuesta ÚNICAMENTE en HTML semántico limpio y estructurado listo para ser insertado en un editor ProseMirror/Tiptap.
Usa etiquetas HTML estándar como: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <u>, <table>, <tr>, <th>, <td>.
NO incluyas bloques de código markdown como \`\`\`html ... \`\`\`, ni etiquetas generales de página como <html>, <head>, <body>. Devuelve solo el fragmento de HTML.`;

    let userPrompt = '';
    if (mode === 'fragment') {
      userPrompt = `Instrucción: "${prompt}"
Modifica, expande, resume o continúa el siguiente fragmento de texto según la instrucción anterior:
---
${content}
---`;
    } else {
      userPrompt = `Instrucción: "${prompt}"
Genera un documento completo e interesante basado en la instrucción anterior para el grupo de viaje o gastos llamado "${group.name}". Puedes incluir itinerarios, listas, tablas de organización, etc.`;
    }

    // Call Gemini API REST
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemInstructions },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error details:', errText);
      throw new Error('Error al conectar con la API de Gemini.');
    }

    const resData = await response.json();
    let responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Limpieza de bloques de código markdown si los genera
    responseText = responseText.trim();
    if (responseText.startsWith('```html')) {
      responseText = responseText.substring(7);
    } else if (responseText.startsWith('```')) {
      responseText = responseText.substring(3);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.substring(0, responseText.length - 3);
    }
    responseText = responseText.trim();

    return NextResponse.json({ content: responseText });
  } catch (e: unknown) {
    const err = e as Error;
    console.error('Error generating document content with AI:', err);
    return NextResponse.json({ 
      error: 'No se pudo generar contenido con IA.',
      details: err.message 
    }, { status: 500 });
  }
}
