export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. When given a topic, return exactly the top 3 items as a JSON array. Each item must have "rank" (e.g. "#1 Name") and "reason" (one short sentence). Return ONLY valid JSON, no markdown.',
        },
        {
          role: 'user',
          content: `Top 3 for: ${topic}`,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(502).json({ error: err });
  }

  const data = await response.json();
  const text = data.choices[0].message.content.trim();

  try {
    const results = JSON.parse(text);
    res.status(200).json({ results });
  } catch {
    res.status(200).json({ raw: text });
  }
}
