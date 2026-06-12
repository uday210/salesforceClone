import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getKey(req: NextRequest): string | null {
  return (
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(req.url).searchParams.get("api_key")
  );
}

async function handle(req: NextRequest, resource: string, method: string, body: any) {
  const apiKey = getKey(req);
  if (!apiKey) return NextResponse.json({ error: "Missing API key (send x-api-key header)" }, { status: 401 });

  const supabase = createClient(url, anon, { auth: { persistSession: false } });

  // Validate key + load the REST class (SECURITY DEFINER, gated by key)
  const { data: cls, error: clsErr } = await supabase.rpc("sf_api_get_rest_class", { p_key: apiKey, p_name: resource });
  if (clsErr) return NextResponse.json({ error: clsErr.message }, { status: 401 });
  if (!cls || !cls.length) return NextResponse.json({ error: `REST resource '${resource}' not found` }, { status: 404 });

  const classBody = cls[0].body as string;

  // API surface available to the REST class body
  const query = async (object: string) => {
    const { data, error } = await supabase.rpc("sf_api_query", { p_key: apiKey, p_object: object });
    if (error) throw new Error(error.message);
    return data || [];
  };
  const insert = async (object: string, name: string, dataObj: Record<string, any>) => {
    const { data, error } = await supabase.rpc("sf_api_insert", { p_key: apiKey, p_object: object, p_name: name, p_data: dataObj });
    if (error) throw new Error(error.message);
    return data;
  };
  const logs: string[] = [];
  const System = { debug: (...a: any[]) => logs.push(a.map(String).join(" ")) };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      "ctx",
      `return (async () => { "use strict";
        const { query, insert, System } = ctx;
        ${classBody}
        const m = ctx.method;
        const h = m === 'GET' ? (typeof doGet==='function'?doGet:null)
                : m === 'POST' ? (typeof doPost==='function'?doPost:null)
                : m === 'PUT' ? (typeof doPut==='function'?doPut:null)
                : m === 'DELETE' ? (typeof doDelete==='function'?doDelete:null) : null;
        if (!h) return { __status: 405, error: 'Method ' + m + ' not implemented in ' + ${JSON.stringify(resource)} };
        return await h(ctx.req);
      })()`
    );
    const result = await fn({ query, insert, System, method, req: { method, body, headers: Object.fromEntries(req.headers) } });
    const status = result?.status || result?.__status || 200;
    if (result && typeof result === "object") delete (result as any).__status;
    return NextResponse.json(result ?? {}, { status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, logs }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  return handle(req, params.resource, "GET", null);
}
export async function POST(req: NextRequest, { params }: { params: { resource: string } }) {
  const body = await req.json().catch(() => ({}));
  return handle(req, params.resource, "POST", body);
}
export async function PUT(req: NextRequest, { params }: { params: { resource: string } }) {
  const body = await req.json().catch(() => ({}));
  return handle(req, params.resource, "PUT", body);
}
export async function DELETE(req: NextRequest, { params }: { params: { resource: string } }) {
  return handle(req, params.resource, "DELETE", null);
}
