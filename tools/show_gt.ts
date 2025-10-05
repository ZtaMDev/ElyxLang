const txt = await Deno.readTextFile('./test.dsx');
const lines = txt.split('\n');
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  if (line.includes('>')) {
    console.log(`${i+1}: ${line}`);
  }
}
