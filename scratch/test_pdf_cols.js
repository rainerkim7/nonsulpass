const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gerdlhlsmzqnowatgjpb.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_nW9Cz9Fwz-uYFcUL5ajQTw_y1vse4VX'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testPdfColumns() {
  const { data, error } = await supabase.from('exams').select('id, pdf_url, pdf_name').limit(1)
  if (error) {
    console.error('Column check failed:', error.message)
  } else {
    console.log('Columns exist! Data:', data)
  }
}

testPdfColumns()
