import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getLesson } from '@/db/queries';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { audio, text, lessonId, processType } = await req.json();

    if (!lessonId || (!audio && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get lesson context
    const lesson = await getLesson(lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Step 1: Speech to Text
    if (processType === 'transcribe' && audio) {
      // Convert base64 to blob
      const audioBuffer = Buffer.from(audio, 'base64');
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

      const transcription = await elevenlabs.speechToText.convert({
        file: audioBlob,
        modelId: "scribe_v1_experimental",
        tagAudioEvents: false,
        languageCode: "eng",
        diarize: false,
      });

      return NextResponse.json({
        userText: transcription.text,
      });
    }

    // Step 2: Process Text and Generate Response
    if (processType === 'respond' && text) {
      // Get AI response using OpenAI Chat
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a language learning assistant helping with a lesson about "${lesson.title}". 
                     Respond conversationally and naturally, but keep responses concise (max 2-3 sentences).
                     If you notice any language errors, provide gentle corrections.
                     Stay focused on the lesson topic.`
          },
          {
            role: 'user',
            content: text
          }
        ],
      });

      const aiResponse = completion.choices[0].message.content;

      if (!aiResponse) {
        throw new Error('Failed to generate AI response');
      }

      // Convert AI response to speech using ElevenLabs API
      const voiceResponse = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB',
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          },
          body: JSON.stringify({
            text: aiResponse,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          }),
        }
      );

      if (!voiceResponse.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioData = await voiceResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioData).toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

      return NextResponse.json({
        text: aiResponse,
        audioUrl,
      });
    }

    return NextResponse.json(
      { error: 'Invalid process type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in voice chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 