async function getLastComment(key: string) {
  try {
    const res = await fetch(
      `${BASE_URL}/rest/api/3/issue/${key}/comment?maxResults=1&orderBy=-created`,
      { method: 'GET', headers: HEADERS(), cache: 'no-store' }
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || !text.startsWith('{')) return null;
    const data = JSON.parse(text);
    const c = data.comments?.[0];
    if (!c) return null;
    return {
      autor: c.author?.displayName ?? '—',
      data: new Date(c.created).toLocaleDateString('pt-BR'),
      texto: typeof c.body === 'string' ? c.body : (c.body?.content?.[0]?.content?.[0]?.text ?? '(sem texto)'),
    };
  } catch { return null; }
}