const relevant=/(news|event|organized|tournament|championship|strategy|interview|deck|rules|faq|errata|patch)/i;
export function discoverOfficialLinks(html,base,host){const found=new Set();for(const match of html.matchAll(/href=["']([^"'#]+)["']/gi)){try{const url=new URL(match[1],base);url.hash="";if(url.hostname===host&&relevant.test(url.pathname))found.add(url.toString())}catch{}}return [...found].slice(0,100)}

const decode=(value)=>String(value||"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
export function extractSourceMetadata(html,url){
  const title=html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]||html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]||url;
  const published=html.match(/["']datePublished["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/i)?.[1]||html.match(/<meta[^>]+(?:article:published_time|date)[^>]+content=["'](\d{4}-\d{2}-\d{2})/i)?.[1]||null;
  const text=decode(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")).slice(0,16000);
  return {title:decode(title).slice(0,300),published,text};
}
