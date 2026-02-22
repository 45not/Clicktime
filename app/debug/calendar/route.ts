import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('calendar_blocks')
            .select('*')
            .limit(1)

        return NextResponse.json({ data, error })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}
