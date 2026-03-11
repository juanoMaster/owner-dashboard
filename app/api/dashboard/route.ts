export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const { data: link, error: linkError } = await supabaseAdmin
      .from("dashboard_links")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle();

    if (linkError) {
      console.error("Link error:", linkError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!link) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const { data: cabins, error } = await supabaseAdmin
      .from("cabins")
      .select("*")
      .eq("tenant_id", link.tenant_id);

    if (error) {
      console.error("Cabins error:", error);
      return NextResponse.json(
        { error: "Error loading cabins" },
        { status: 500 }
      );
    }

    return NextResponse.json({ cabins });

  } catch (err) {
    console.error("Fatal error:", err);
    return NextResponse.json(
      { error: "Server crash" },
      { status: 500 }
    );
  }
}