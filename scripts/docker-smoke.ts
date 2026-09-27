const base = process.env.ORIO_BASE_URL ?? 'http://127.0.0.1:8080';

async function assertOk(path: string): Promise<void> {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  console.log(`OK ${path}`);
}

async function main(): Promise<void> {
  await assertOk('/');
  await assertOk('/api/health');
  console.log('Docker smoke test passed.');
}

void main();
