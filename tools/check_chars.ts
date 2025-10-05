const txt = await Deno.readTextFile('./test.dsx');
let found = false;
for (let i=0;i<txt.length;i++){
  const ch = txt[i];
  if (ch === '>') { console.log('Found > at index', i); found = true; }
}
if (!found) console.log('No > found');
console.log('First 200 chars:');
console.log(txt.slice(0,200));
