#!/usr/bin/env python3
"""สร้าง sw.js จาก tools_sw_template.js: ใส่เวอร์ชัน + ลายนิ้วมือ SHA-1 ของทุกไฟล์ที่เก็บในเครื่อง
ใช้: python3 build_sw.py 124   (รันหลังแก้ไฟล์อื่นเสร็จ และหลังเปลี่ยน ?v= ใน html)"""
import hashlib, json, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
VER = sys.argv[1]
FILES = ['money.html', 'split.html', 'vault.html', 'hk.html', 'hk.js', 'jod.png', 'manifest.json', 'style.css', 'hub.js', 'mcore.js', 'money.js', 'owe.js', 'scat.js', 'qrcode.js', 'vault.js', 'icon-192.png', 'icon-512.png', 'icon-180.png']
h = {f: hashlib.sha1(open(f, 'rb').read()).hexdigest()[:12] for f in FILES}
t = open('tools_sw_template.js').read().replace('__VER__', VER).replace('__HASH__', json.dumps(h, indent=1))
open('sw.js', 'w').write(t)
json.dump({'ver': VER, 'hash': h}, open('/tmp/sw_hash.json', 'w'))
print('sw.js v' + VER, len(h), 'files')
