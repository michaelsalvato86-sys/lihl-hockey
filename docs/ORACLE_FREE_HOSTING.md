# LIHL on Oracle Cloud Always Free (permanent, no sleep)

Oracle needs a card for identity check only. Always Free resources are not charged. Use a Pay As You Go upgrade only if you want to; stay on the free account.

## 1. Create the VM (you, in the browser, about 15 minutes)
1. Sign up at cloud.oracle.com, pick a home region close to New York (US East Ashburn). The home region cannot be changed later.
2. Compute > Instances > Create instance. Image: Ubuntu 22.04. Shape: Ampere A1 (VM.Standard.A1.Flex) 1 OCPU and 6 GB RAM is plenty. If it says "out of capacity", retry later or try shape VM.Standard.E2.1.Micro (also Always Free).
3. Networking: keep the default VCN and give it a public IP. Download the SSH private key when asked.
4. In the VCN security list, add ingress rules for TCP 80 and TCP 443 from 0.0.0.0/0.

## 2. Free domain with HTTPS
Create a free name at duckdns.org (for example lihl-hockey.duckdns.org) pointing to the VM public IP. Caddy fetches the certificate itself.

## 3. Install (copy and paste)
From your PC (Git Bash), with the key file and the VM IP:
```
scp -i KEY.key -r C:/Users/Quantum/rec-hockey/deploy ubuntu@VM_IP:~/lihl
ssh -i KEY.key ubuntu@VM_IP "bash ~/lihl/oracle_setup.sh lihl-hockey.duckdns.org"
```
Then open https://lihl-hockey.duckdns.org. The game is served by the same server, so multiplayer works with no other change.

## 4. Update later
Re-run the two commands. The container restarts on reboot by itself.

## Notes
- The Dockerfile is the same one Fly uses, and node:20-alpine runs on the ARM shape.
- Server tick cost is about 0.16 ms, so one small VM handles many rooms.
- Keep the Fly app as a backup; leave it stopped.
