import { NextRequest, NextResponse } from 'next/server';
const BASE_URL  = process.env.JIRA_BASE_URL!;
const EMAIL     = process.env.JIRA_EMAIL!;
const API_TOKEN = process.env.JIRA_API_TOKEN!;
const HEADERS = () => ({
  'Authorization': `Basic ${Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64')}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
});
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  if (action === 'me') {
    const res = await fetch(`${BASE_URL}/rest/api/3/myself`, { headers: HEADERS() });
    return NextResponse.json(await res.json());
  }
  return NextResponse.json({ ok: true, base: BASE_URL, email: EMAIL });
}