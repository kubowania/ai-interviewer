// app/api/score/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { transcript } = await req.json();
  const text = transcript
    .filter((line) => line.final)
    .map((line) => `${line.role}: ${line.text}`)
    .join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Grade this mock developer interview. Reply with JSON only: ' +
            '{"score": 0-100, "feedback": "two sentences"}. ' +
            'Only use what the candidate actually said. Never invent anything.',
        },
        { role: 'user', content: text },
      ],
    }),
  });

  const data = await res.json();
  return NextResponse.json(JSON.parse(data.choices[0].message.content));
}