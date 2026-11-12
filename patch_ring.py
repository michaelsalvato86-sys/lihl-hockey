import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
r = open('r3d.js', encoding='utf-8').read()

def rr(a, b):
    global r
    assert a in r, a[:70]
    r = r.replace(a, b, 1)

rr("R3.ring=new THREE.Mesh(new THREE.RingGeometry(2.9,3.6,28),new THREE.MeshBasicMaterial({color:0xffd166,side:THREE.DoubleSide}));",
   "R3.ring=new THREE.Mesh(new THREE.RingGeometry(3.3,4.4,32),new THREE.MeshBasicMaterial({color:0xffe27a,side:THREE.DoubleSide,transparent:true,opacity:.95}));"
   "const ag=new THREE.ConeGeometry(1.2,2.6,4);ag.rotateX(Math.PI);R3.arrow=new THREE.Mesh(ag,new THREE.MeshBasicMaterial({color:0xffe27a}));sc.add(R3.arrow);")
rr("if(p===ctl){R.ring.visible=true;R.ring.position.x=p.x-W/2;R.ring.position.z=p.y-H/2}",
   "if(p===ctl){const tt=performance.now()/1000;R.ring.visible=true;R.ring.position.x=p.x-W/2;R.ring.position.z=p.y-H/2;R.ring.scale.setScalar(1+.12*Math.sin(tt*6));R.arrow.visible=true;R.arrow.position.set(p.x-W/2,15.2+Math.sin(tt*5)*.6,p.y-H/2);R.arrow.rotation.y=tt*2}")
rr("if(!ctl)R.ring.visible=false;", "if(!ctl){R.ring.visible=false;R.arrow.visible=false}")
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
