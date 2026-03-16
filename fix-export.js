const fs = require('fs');
const files = [
  'src/app/[locale]/about/page.tsx',
  'src/app/[locale]/admin-secret/agents/page.tsx',
  'src/app/[locale]/admin-secret/analytics/page.tsx',
  'src/app/[locale]/admin-secret/broadcast/page.tsx',
  'src/app/[locale]/admin-secret/page.tsx',
  'src/app/[locale]/agents/[id]/page.tsx',
  'src/app/[locale]/agents/[id]/properties/page.tsx',
  'src/app/[locale]/auth/callback/route.ts',
  'src/app/[locale]/auth/forgot-password/page.tsx',
  'src/app/[locale]/auth/reset-password/page.tsx',
  'src/app/[locale]/contact/page.tsx',
  'src/app/[locale]/dashboard/edit/[id]/page.tsx',
  'src/app/[locale]/dashboard/leads/page.tsx',
  'src/app/[locale]/dashboard/page.tsx',
  'src/app/[locale]/dashboard/presale/page.tsx',
  'src/app/[locale]/dashboard/settings/page.tsx',
  'src/app/[locale]/developers/[id]/page.tsx',
  'src/app/[locale]/developers/page.tsx',
  'src/app/[locale]/favorites/page.tsx',
  'src/app/[locale]/list-property/page.tsx',
  'src/app/[locale]/login/page.tsx',
  'src/app/[locale]/lp/post-property/page.tsx',
  'src/app/[locale]/mypage/page.tsx',
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'src/app/[locale]/properties/[id]/page.tsx',
  'src/app/[locale]/properties/page.tsx',
  'src/app/[locale]/register/page.tsx'
];

files.forEach(f => {
  try {
    let content = fs.readFileSync(f, 'utf8');
    
    // Check if it has use client (single or double quotes)
    const hasUseClient = /['"]use client['"];?/.test(content);
    
    // Remove all previous edge runtime strings to cleanly re-inject
    content = content.replace(/export const runtime = ['"]edge['"];?\s*/g, '');
    
    if (hasUseClient) {
      // Remove all occurrences of use client
      content = content.replace(/['"]use client['"];?\s*/g, '');
      
      // Prepend use client AND edge runtime
      let newContent = '"use client";\nexport const runtime = \'edge\';\n' + content;
      fs.writeFileSync(f, newContent, 'utf8');
    } else {
      let newContent = 'export const runtime = \'edge\';\n' + content;
      fs.writeFileSync(f, newContent, 'utf8');
    }
  } catch (e) {
    console.error('Failed on ' + f + ': ' + e.message);
  }
});
console.log('Fixed use client positions');
