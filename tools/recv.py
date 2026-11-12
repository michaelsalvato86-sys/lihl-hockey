import http.server, json, os
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('content-length', 0)); b = self.rfile.read(n).decode('utf-8')
        d = json.loads(b); os.makedirs('data/scrape', exist_ok=True)
        open('data/scrape/team%s.json' % d['id'], 'w', encoding='utf-8').write(b)
        self.send_response(200); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); self.wfile.write(b'ok')
    def do_GET(self):
        import urllib.parse
        q = urllib.parse.urlparse(self.path).query; b = urllib.parse.parse_qs(q).get('d', [''])[0]
        if b:
            os.makedirs('data/scrape', exist_ok=True)
            open('data/scrape/all.json', 'w', encoding='utf-8').write(b)
        self.send_response(200); self.send_header('Content-Type', 'text/html'); self.end_headers(); self.wfile.write(b'saved')
    def do_OPTIONS(self):
        self.send_response(200); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Private-Network', 'true'); self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(('127.0.0.1', 8097), H).serve_forever()
