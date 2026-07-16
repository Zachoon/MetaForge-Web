const relevant=/(news|event|organized|tournament|championship|strategy|interview|deck)/i;
export function discoverOfficialLinks(html,base,host){const found=new Set();for(const match of html.matchAll(/href=["']([^"'#]+)["']/gi)){try{const url=new URL(match[1],base);url.hash="";if(url.hostname===host&&relevant.test(url.pathname))found.add(url.toString())}catch{}}return [...found].slice(0,100)}
