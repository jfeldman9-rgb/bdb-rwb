#!/usr/bin/env python3
"""Pack original RGBA art + clothed silhouette stand-ins. Requires existing Pillow.
The _v1 archive contains the original, non-interpolated frames. Never read _old/.
Run from repository root: node tools/make-placeholders.mjs [art-root] [packet-public]
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, sys, shutil, math, subprocess

art = Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/bdb-art/sprites')
packet = Path(sys.argv[2] if len(sys.argv)>2 else '/workspace/bdb-packet/src/Claudia_Handoff/game/public/game')
out = Path('assets/chars'); out.mkdir(parents=True, exist_ok=True)
original = art/'_v1' if (art/'_v1').is_dir() else art
real = {'bob': ('bob', dict(idle=6,walk=6,shoot=4,hurt=3,knockdown=4,getup=4)),
        'yetti_walker': ('yetti1', dict(idle=6,walk=8,attack=4,hurt=3,knockdown=4)),
        'yetti_guard': ('yetti2', dict(idle=6,walk=8,attack=4,hurt=3,knockdown=4))}
standins = {
 'dad': dict(run=6,swat=4,cheer=3), 'claudia': {'idle-caged':4,'freed':4,'portrait':1},
 'yetti_hover':dict(fly=6,shoot=3,hurt=2,down=3),
 'yetti_charger':dict(walk=6,telegraph=2,rush=4,hurt=2,down=3),
 'yetti_choir':dict(sing=6,hurt=2,down=3),
 'yetti_lecturer':dict(walk=6,grab=3,hold=2,hurt=2,down=3),
 'wingman':dict(hover=6,ring=4,telegraph=2,dive=3,land=3,hurt=2,split=4),
 'papi_runners':{f'run{i}':8 for i in range(1,5)},
 'interventionist':dict(walk=6,grab=3,hold=2,hurt=2,down=3,slam=4),
 'choirmaster':dict(sing=6,hurt=2,down=3,ring=4)}

def silhouette(key, anim, i):
 im=Image.new('RGBA',(720,600)); d=ImageDraw.Draw(im)
 color={'dad':'#e7b65c','claudia':'#ed91bd','papi_runners':'#f3a75e','wingman':'#b3a1ed'}.get(key,'#a9cfdf')
 dx=round(math.sin(i*1.3)*14); x=360+dx
 if 'yetti' in key or key in ('wingman','interventionist','choirmaster'):
  d.ellipse((175,180,350,405),fill='#dfeafa'); d.ellipse((370,180,545,405),fill='#dfeafa')
  d.ellipse((x-55,90,x+55,116),outline='#ffe69c',width=9)
 d.ellipse((x-48,130,x+48,230),fill=color)
 d.rounded_rectangle((x-62,230,x+62,450),radius=25,fill=color)
 # Fully clothed adults: solid tunic/tracksuit, arms, trousers and shoes.
 d.line((x-55,255,x-105,400),fill=color,width=30); d.line((x+55,255,x+105,385),fill=color,width=30)
 d.line((x-30,420,x-52+dx,552),fill=color,width=38); d.line((x+30,420,x+50-dx,552),fill=color,width=38)
 d.rounded_rectangle((x-82+dx,535,x-20+dx,564),radius=10,fill='#24324b')
 d.rounded_rectangle((x+20-dx,535,x+85-dx,564),radius=10,fill='#24324b')
 if key=='dad':
  d.line((x+92,385,x+155,210),fill='#e6e4d7',width=14)
  d.rounded_rectangle((x+100,100,x+220,220),radius=15,outline='#fff0a5',width=8)
  for off in range(120,220,20): d.line((x+off,110,x+off,210),fill='#fff0a5',width=2)
  d.text((x+130,155),'BDB',fill='white',stroke_width=2)
 return im

def pack(key, counts, source=None):
 pages=[]; entries={}; frames=[]; anims=[]; x=y=row=0; W=H=0
 atlas=Image.new('RGBA',(2048,2048))
 def flush():
  nonlocal atlas, entries, x,y,row,W,H
  if not entries:return
  name=f'{key}-{len(pages)}'; pages.append(name)
  atlas.crop((0,0,W,H)).save(out/(name+'.webp'),quality=90,method=4)
  (out/(name+'.json')).write_text(json.dumps({'frames':entries,'meta':{'image':name+'.webp','size':{'w':W,'h':H},'scale':1}}))
  atlas=Image.new('RGBA',(2048,2048)); entries={}; x=y=row=W=H=0
 for anim,count in counts.items():
  a={'name':f'{key}_{anim}','frames':[],'pages':[],'holds':[],'loop':anim in ['idle','walk','fly','sing','hover','run','idle-caged'] or anim.startswith('run')}
  for i in range(1,count+1):
   name=f'{key}_{anim}_{i:02d}'
   im=Image.open(original/f'{source}_{anim}_{i:02d}.png').convert('RGBA') if source else silhouette(key,anim,i)
   if im.size!=(720,600): raise ValueError(f'{name}: expected 720x600')
   box=im.getchannel('A').getbbox(); crop=im.crop(box); w,h=crop.size
   if x+w+2>2048:x=0;y+=row+2;row=0
   if y+h+2>2048:flush()
   atlas.paste(crop,(x,y))
   entries[name]={'frame':dict(x=x,y=y,w=w,h=h),'rotated':False,'trimmed':True,'spriteSourceSize':dict(x=box[0],y=box[1],w=w,h=h),'sourceSize':dict(w=720,h=600)}
   a['frames'].append(name); a['pages'].append(len(pages)); a['holds'].append(120 if a['loop'] else 85)
   x+=w+2;row=max(row,h);W=max(W,x);H=max(H,y+h)
  anims.append(a)
 flush()
 meta={'canvas':[720,600],'baseline':570,'scale':1,'pages':pages,'anims':anims,'placeholder':not bool(source),'source':str(original) if source else 'local coloured silhouettes'}
 (out/(key+'.anims.json')).write_text(json.dumps(meta,indent=2))
 print(key, sum(counts.values()), 'frames', len(pages), 'pages')

for key,(source,counts) in real.items():pack(key,counts,source)
for key,counts in standins.items():pack(key,counts)
for path in ['assets/bg','assets/audio/voice','assets/cutscenes','docs/shots']:Path(path).mkdir(parents=True,exist_ok=True)
voices={'bdb-open':'bdb_open','bdb-produce':'bdb_produce','papacito-laugh':'bdb_laugh','claudia-open':'claudia_open','claudia-question':'claudia_question','claudia-leave':'claudia_leave','turn-back-papi':'yetti_turnback','papi-serious':'choir_serious','intervention':'lecturer_intervention','council-denies':'wingman_council'}
for src,dst in voices.items():shutil.copyfile(packet/'voices'/f'{src}.mp3',Path('assets/audio/voice')/f'{dst}.mp3')
shutil.copyfile(packet/'bdb-rise.mp3','assets/audio/bdb-rise.mp3')
for clip in ['opening','victory']:
 shutil.copyfile(packet/'cutscenes'/f'{clip}.mp4',Path('assets/cutscenes')/f'{clip}.mp4')
 if shutil.which('ffmpeg'):
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss','0.3','-i',f'assets/cutscenes/{clip}.mp4','-frames:v','1','-update','1',f'assets/cutscenes/{clip}.jpg'],check=True)
 else:
  Image.open(packet/'console'/'chapter1-boulevard.webp').convert('RGB').save(f'assets/cutscenes/{clip}.jpg')
for bg in ['chapter1-boulevard','chapter2-clouds','chapter3-castle','astra-keep']:
 Image.open(packet/'console'/f'{bg}.webp').resize((1280,720),Image.Resampling.LANCZOS).save(f'assets/bg/{bg}.webp',quality=90)
