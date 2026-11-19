"""Serve Spore locally without caching development files."""
import argparse
import base64
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/__capture':
            self.send_error(404)
            return
        size = int(self.headers.get('Content-Length', 0))
        if size > 16000000:
            self.send_error(413)
            return
        data = json.loads(self.rfile.read(size))
        image = base64.b64decode(data['image'].split(',')[-1])
        if not image.startswith(b'\x89PNG\r\n\x1a\n'):
            self.send_error(400)
            return
        path = Path(self.directory) / 'exports' / 'capture.png'
        path.write_bytes(image)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'saved')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8016)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=Path(__file__).resolve().parent.parent))
    print(f'Spore: http://localhost:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
