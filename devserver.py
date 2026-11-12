import http.server, socketserver
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
socketserver.TCPServer.allow_reuse_address=True
with socketserver.ThreadingTCPServer(('0.0.0.0',8082),H) as s: s.serve_forever()
