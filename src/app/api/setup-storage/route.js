import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Service Role Key is not set on server" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Ensure public 'avatars' bucket exists
    const { error } = await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 2097152 // 2MB limit
    });
    
    if (error && error.message !== 'Bucket already exists') {
      throw error;
    }
    
    return NextResponse.json({ success: true, message: "Storage bucket 'avatars' setup completed successfully!" });
  } catch (e) {
    console.error("Storage setup error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
