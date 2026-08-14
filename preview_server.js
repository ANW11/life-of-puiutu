const http=require('http'),fs=require('fs'),path=require('path');
const DIR=__dirname, PORT=process.argv[2]||4567;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/') p='/life_of_puiutu_game.html';
  const fp=path.join(DIR,p);
  fs.readFile(fp,(err,data)=>{
    if(err){ res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});
    res.end(data);
  });
}).listen(PORT,()=>console.log('listening on',PORT));
