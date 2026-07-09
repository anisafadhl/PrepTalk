import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Service Role Key is not set on server" }, { status: 500 });
    }

    // Initialize admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create user using admin API (bypasses rate limits and email confirmation)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });

    if (error) throw error;

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error("Admin registration error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
