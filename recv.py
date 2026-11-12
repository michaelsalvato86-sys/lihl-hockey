import http.server,sys
class H(http.server.BaseHTTPRequestHandler):
    def _c(s):
        s.send_header('Access-Control-Allow-Origin','*');s.send_header('Access-Control-Allow-Headers','*');s.send_header('Access-Control-Allow-Private-Network','true')
    def do_OPTIONS(s): s.send_response(204);s._c();s.end_headers()
    def do_POST(s):
        b=s.rfile.read(int(s.headers['Content-Length']));open('data/roster_raw.json','wb').write(b)
        s.send_response(200);s._c();s.end_headers();s.wfile.write(b'ok');print('saved',len(b),flush=True)
http.server.HTTPServer(('127.0.0.1',8777),H).handle_request()
