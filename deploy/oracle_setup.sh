#!/bin/bash
# LIHL Hockey on an Oracle Cloud Always Free Ubuntu VM. Run on the VM as the ubuntu user:
#   bash oracle_setup.sh yourname.duckdns.org
# Needs: the deploy/ folder copied to ~/lihl (see docs/ORACLE_FREE_HOSTING.md).
set -e
DOMAIN="$1"; [ -z "$DOMAIN" ] && { echo "usage: bash oracle_setup.sh yourname.duckdns.org"; exit 1; }
sudo apt-get update -y && sudo apt-get install -y docker.io caddy
sudo systemctl enable --now docker
cd ~/lihl
sudo docker build -t lihl .
sudo docker rm -f lihl 2>/dev/null || true
sudo docker run -d --name lihl --restart unless-stopped -p 127.0.0.1:8080:8080 \
  -e GRACE_MS=45000 -e MAX_ROOMS=40 lihl
# Caddy gives free HTTPS and passes websockets through
printf '%s {\n  reverse_proxy 127.0.0.1:8080\n}\n' "$DOMAIN" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo systemctl restart caddy
# Ubuntu images on Oracle block ports in iptables as well as in the cloud firewall
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo sh -c 'iptables-save > /etc/iptables/rules.v4' 2>/dev/null || true
sleep 3; curl -s "http://127.0.0.1:8080/health"; echo
echo "Done. Open https://$DOMAIN"
