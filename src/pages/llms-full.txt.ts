import { buildLlmsFullTxt } from '../utils/llms';

export async function GET() {
  return new Response(await buildLlmsFullTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
