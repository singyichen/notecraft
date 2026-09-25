# 產生 Lab 1 實驗四的 KiCad 原理圖（lab1-exp4-bridge.kicad_sch）。
# 用法（在本目錄）：python3 gen_exp4.py lab1-exp4-bridge.kicad_sch
import uuid, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from kicad_sexp import lib, as_lib_symbol, dump
base='/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/'
LIBS={p:lib(base+p+'.kicad_sym') for p in ['Device','Diode','Simulation_SPICE','power']}
def U(): return '"%s"'%uuid.uuid4()
ROOT=U()
PROJECT='lab1-exp4-bridge'
def q(s): return '"'+s.replace('"','\\"')+'"'

def prop(name,val,x,y,rot=0,hide=False,justify=None,size=1.27):
    eff=['effects',['font',['size',str(size),str(size)]]]
    if justify: eff.append(['justify']+justify.split())
    if hide: eff.append(['hide','yes'])
    return ['property',q(name),q(val),['at',str(x),str(y),str(rot)],eff]

def sym(lib_id,ref,x,y,rot,pins,props,extra_props=(),exclude_sim=False,mirror=None):
    at=['at',str(x),str(y),str(rot)]
    s=['symbol',['lib_id',q(lib_id)],at]
    if mirror: s.append(['mirror',mirror])
    s+= [['unit','1'],['exclude_from_sim','yes' if exclude_sim else 'no'],['in_bom','yes'],['on_board','yes'],['dnp','no'],['uuid',U()]]
    s+=props
    s.append(prop('Footprint','',x,y,hide=True)); s.append(prop('Datasheet','~',x,y,hide=True)); s.append(prop('Description','',x,y,hide=True))
    for ep in extra_props: s.append(ep)
    for p in pins: s.append(['pin',q(p),['uuid',U()]])
    s.append(['instances',['project',q(PROJECT),['path','"/'+ROOT.strip('"')+'"',['reference',q(ref)],['unit','1']]]])
    return s
def wire(*pts):
    out=[]
    for (a,b) in zip(pts,pts[1:]):
        out.append(['wire',['pts',['xy',str(a[0]),str(a[1])],['xy',str(b[0]),str(b[1])]],['stroke',['width','0'],['type','default']],['uuid',U()]])
    return out
def junction(x,y): return ['junction',['at',str(x),str(y)],['diameter','0'],['color','0','0','0','0'],['uuid',U()]]
def text(s,x,y,size=1.27,justify='left bottom',rot=0):
    return ['text',q(s),['exclude_from_sim','no'],['at',str(x),str(y),str(rot)],['effects',['font',['size',str(size),str(size)]],['justify']+justify.split()],['uuid',U()]]

# ---- layout (mm, y down)。A5 橫式 210 x 148；標題欄在右下角（x>100、y>123）
# 橋式照講義第 25 頁的畫法：左右兩個分支各串兩顆二極體，交流源接上下兩個節點，
# 左分支中點是輸出負端 N（接地），右分支中點是輸出正端 P。
XV=50.8              # 交流源那一欄
XA=78.74             # 左分支（D2 上、D1 下）
XB=104.14            # 右分支（D3 上、D4 下）
XR=129.54            # 負載那一欄
YT=45.72             # 上節點 A
YM=60.96             # 兩個分支的中點
YB=76.2              # 下節點 B
YG=96.52             # 接地線
FS=1.5
V1=(XV,YM)           # 上 (XV,55.88)=A  下 (XV,66.04)=B
D2=(XA,53.34)        # rot 270：K 上 (XA,49.53)  A 下 (XA,57.15)
D1=(XA,68.58)        # rot 90 ：A 上 (XA,64.77)  K 下 (XA,72.39)
D3=(XB,53.34)        # rot 90 ：A 上 (XB,49.53)  K 下 (XB,57.15)
D4=(XB,68.58)        # rot 270：K 上 (XB,64.77)  A 下 (XB,72.39)
RL=(XR,72.39)        # 上 (XR,68.58)  下 (XR,76.2)
GND=(85.09,YG)
DP=dict(is_='is=90p rs=40m n=1.4 cjo=30p tt=5u bv=1000 ibv=5u')

def diode(ref,pos,rot,labx):
    return sym('Diode:1N4007',ref,*pos,rot,['1','2'],[
        prop('Reference',ref,labx,pos[1]-1.27,rot=90,justify='left',size=FS),
        prop('Value','1N4007',labx,pos[1]+1.27,rot=90,justify='left',size=FS),
        ],extra_props=[prop('Sim.Device','D',*pos,hide=True),prop('Sim.Pins','1=K 2=A',*pos,hide=True),
                       prop('Sim.Params',DP['is_'],*pos,hide=True)])

items=[]
items.append(sym('Simulation_SPICE:VSIN','V1',*V1,0,['1','2'],[
    prop('Reference','V1',XV-2.54,V1[1]-2.54,hide=True),
    prop('Value','SINE(0 2.5 60)',XV-2.54,V1[1]+2.54,hide=True),
    ]))
items.append(diode('D2',D2,270,XA-8.89))
items.append(diode('D1',D1,90,XA-8.89))
items.append(diode('D3',D3,90,XB+8.89))
items.append(diode('D4',D4,270,XB+8.89))
items.append(sym('Device:R','RL',*RL,0,['1','2'],[
    prop('Reference','RL',XR+2.54,RL[1]-1.27,justify='left',size=FS),
    prop('Value','10kΩ',XR+2.54,RL[1]+1.27,justify='left',size=FS),
    ]))
items.append(sym('power:GND','#PWR01',*GND,0,['1'],[
    prop('Reference','#PWR01',GND[0],GND[1]+6.35,hide=True),
    prop('Value','GND',GND[0],GND[1]+5.08,hide=False,size=FS),
    ]))
items.append(sym('power:PWR_FLAG','#FLG01',GND[0],YG,0,['1'],[
    prop('Reference','#FLG01',GND[0],YG-3.81,hide=True),
    prop('Value','PWR_FLAG',GND[0],YG-3.81,hide=True),
    ]))
# wires
items+=wire((XV,55.88),(XV,YT),(XA,YT))          # V1 上 → 上節點 A
items+=wire((XA,YT),(XB,YT))                     # 上節點橫線
items+=wire((XA,YT),(XA,49.53))                  # → D2 陰極
items+=wire((XB,YT),(XB,49.53))                  # → D3 陽極
items+=wire((XA,57.15),(XA,YM))                  # D2 陽極 → 左中點 N
items+=wire((XA,YM),(XA,64.77))                  # 左中點 → D1 陽極
items+=wire((XB,57.15),(XB,YM))                  # D3 陰極 → 右中點 P
items+=wire((XB,YM),(XB,64.77))                  # 右中點 → D4 陰極
items+=wire((XA,72.39),(XA,YB))                  # D1 陰極 → 下節點 B
items+=wire((XA,YB),(XB,YB))                     # 下節點橫線
items+=wire((XB,72.39),(XB,YB))                  # D4 陽極 → 下節點 B
items+=wire((XV,66.04),(XV,YB),(XA,YB))          # V1 下 → 下節點 B
items+=wire((XA,YM),(66.04,YM),(66.04,YG),(GND[0],YG))   # N → 接地（與 V1 下那條只是交叉）
items+=wire((XB,YM),(XR,YM),(XR,68.58))          # P → 負載上端
items+=wire((XR,76.2),(XR,YG),(GND[0],YG))       # 負載下端 → 接地
items+=[junction(XA,YT),junction(XA,YB),junction(XA,YM),junction(XB,YM),junction(GND[0],YG)]
# labels
items.append(text('V_{in}',XV-3.81,V1[1]+0.635,size=FS,justify='right bottom'))
items.append(text('正弦 60 Hz、5 Vpp',XV-3.81,V1[1]+3.175,size=1.27,justify='right bottom'))
items.append(text('A',XA-2.54,YT-1.27,size=FS,justify='right bottom'))
items.append(text('B',XA-2.54,YB+3.81,size=FS,justify='right bottom'))
items.append(text('N（輸出 −）',67.31,YM-1.27,size=1.27,justify='left bottom'))
items.append(text('P（輸出 +）',XB+5.08,YM-1.27,size=1.27,justify='left bottom'))
items.append(text('V_{out}',XR+2.54,YM+3.175,size=FS,justify='left bottom'))
items.append(text('Lab 1 實驗四：全波橋式整流器量測電路',20.32,25.4,size=2.5,justify='left bottom'))
items.append(text('正半週 A→D3→P→R_{L}→N→D2→B；負半週 B→D4→P→R_{L}→N→D1→A',20.32,110,size=FS,justify='left bottom'))
items.append(text('V_{out,peak} ≈ V_{in,peak} − 2V_{D,on}',20.32,114,size=FS,justify='left bottom'))
items.append(text('第 26 頁在 R_{L} 兩端並聯 C 1 µF；第 27 頁改並聯齊納，陰極朝 P（輸出 +）那側',20.32,118,size=1.27,justify='left bottom'))
items.append(text('輸入與輸出沒有共同節點：示波器兩支地夾不可同時接 B 與 N，見筆記的接地陷阱',20.32,122,size=1.27,justify='left bottom'))

libsyms=['lib_symbols']+[as_lib_symbol(LIBS[p],n,p) for p,n in [('Simulation_SPICE','VSIN'),('Diode','1N4007'),('Device','R'),('power','GND'),('power','PWR_FLAG')]]
doc=['kicad_sch',['version','20250114'],['generator','"eeschema"'],['generator_version','"9.0"'],['uuid',ROOT],
     ['paper','"A5"'],
     ['title_block',['title',q('Lab 1 實驗四：全波橋式整流器')],['date','"2026-09-25"'],['rev','"1"'],['company',q('NoteCraft 電子學實作系列')]],
     libsyms]+items+[['sheet_instances',['path','"/"',['page','"1"']]],['embedded_fonts','no']]
out=sys.argv[1]
open(out,'w').write(dump(doc)+'\n')
print('wrote',out)
