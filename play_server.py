#!/usr/bin/env python3
# ───────────────────────────────────────────────────────────────────────────
#  Life of Puiutu — multiplayer server (pure Python, uses `websockets`)
#  Serves the game files AND relays player positions + chat over one port.
#  Run:  python3 play_server.py      (then expose it with a cloudflared tunnel)
# ───────────────────────────────────────────────────────────────────────────
import asyncio, os, json, mimetypes
from websockets.asyncio.server import serve
from websockets.http11 import Response
from websockets.datastructures import Headers

ROOT  = os.path.dirname(os.path.abspath(__file__))
INDEX = 'life_of_puiutu_game.html'
PORT  = int(os.environ.get('PORT', '8080'))

clients = {}          # ws -> {id, name, last}
_next   = [1]

async def broadcast(msg, exc=None):
    for ws in list(clients.keys()):
        if ws is exc:
            continue
        try:
            await ws.send(msg)
        except Exception:
            clients.pop(ws, None)

async def handler(ws):
    cid = 'p' + str(_next[0]); _next[0] += 1
    clients[ws] = {'id': cid, 'name': 'Pisic', 'last': None}
    await ws.send(json.dumps({'type': 'welcome', 'id': cid}))
    # tell the newcomer who's already here
    for other, info in clients.items():
        if other is not ws and info['last']:
            await ws.send(json.dumps({'type': 'state', 'id': info['id'], 'name': info['name'], **info['last']}))
    try:
        async for raw in ws:
            try:
                m = json.loads(raw)
            except Exception:
                continue
            info = clients.get(ws)
            if not info:
                continue
            t = m.get('type')
            if t == 'hello':
                info['name'] = str(m.get('name', 'Pisic'))[:16]
            elif t == 'state':
                info['name'] = str(m.get('name', info['name']))[:16]
                info['last'] = {
                    'area': m.get('area'), 'x': m.get('x'), 'y': m.get('y'),
                    'facing': m.get('facing'), 'phase': m.get('phase'),
                    'moving': m.get('moving'), 'hat': m.get('hat'),
                }
                await broadcast(json.dumps({'type': 'state', 'id': info['id'], 'name': info['name'], **info['last']}), ws)
            elif t == 'chat':
                txt = str(m.get('text', ''))[:120]
                if txt.strip():
                    await broadcast(json.dumps({'type': 'chat', 'id': info['id'], 'name': info['name'], 'text': txt}), None)
    finally:
        info = clients.pop(ws, None)
        if info:
            await broadcast(json.dumps({'type': 'leave', 'id': info['id']}), ws)

def _file_response(connection, path):
    if path in ('/', ''):
        path = '/' + INDEX
    rel = os.path.normpath(path.lstrip('/'))
    if rel.startswith('..') or os.path.isabs(rel):
        return connection.respond(403, 'Forbidden')
    full = os.path.join(ROOT, rel)
    if not os.path.isfile(full):
        return connection.respond(404, 'Not found')
    with open(full, 'rb') as f:
        body = f.read()
    ctype = mimetypes.guess_type(full)[0] or 'application/octet-stream'
    headers = Headers()
    headers['Content-Type'] = ctype
    headers['Content-Length'] = str(len(body))
    headers['Cache-Control'] = 'no-cache'
    return Response(200, 'OK', headers, body)

async def process_request(connection, request):
    from urllib.parse import unquote
    path = unquote(request.path.split('?')[0])   # decode %20 etc. (e.g. "new park 2.jpg")
    if path == '/ws':
        return None            # let the WebSocket upgrade proceed
    return _file_response(connection, path)

async def main():
    async with serve(handler, '0.0.0.0', PORT, process_request=process_request):
        print(f'🐾 Life of Puiutu server running on http://localhost:{PORT}')
        print('   (expose it with:  cloudflared tunnel --url http://localhost:%d )' % PORT)
        await asyncio.Future()   # run forever

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nserver stopped')
