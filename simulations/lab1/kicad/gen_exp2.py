# 產生 Lab 1 實驗二的 KiCad 原理圖（lab1-exp2-reverse.kicad_sch）：與實驗一同拓樸，D1 反接（陰極朝電源正端）。
# 用法（在本目錄）：python3 gen_exp2.py lab1-exp2-reverse.kicad_sch
import uuid, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from kicad_sexp import lib, as_lib_symbol, dump
base='/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/'
LIBS={p:lib(base+p+'.kicad_sym') for p in ['Device','Diode','Simulation_SPICE','power']}
def U(): return '"%s"'%uuid.uuid4()
ROOT=U()
PROJECT='lab1-exp2-reverse'
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

# ---- layout (mm, y down). 紙張 A5 橫式 210 x 148；標題欄在右下角（約 x>100、y>123），電路放在左上的空白區
TOP=38.1; BOT=88.9
XL=53.34  # 電源那一欄
XR=104.14 # D1 / R1 / 電流表那一欄
XM=124.46 # 電壓表那一欄
V1=(XL,63.5)       # + (XL,58.42)  - (XL,68.58)
D1=(XR,48.26)      # rot 270: K top (XR,44.45) A bottom (XR,52.07) —— 反接
R1=(XR,63.5)       # pins (XR,59.69) (XR,67.31)
A1=(XR,78.74)      # + (XR,73.66)  - (XR,83.82)
VM=(XM,48.26)      # + (XM,43.18)  - (XM,53.34)
GND=(78.74,BOT)
FS=1.5             # 一般字級

items=[]
items.append(sym('Simulation_SPICE:VDC','V1',*V1,0,['1','2'],[
    prop('Reference','V1',XL-2.54,V1[1]-2.54,hide=True),
    prop('Value','1',XL-2.54,V1[1]+2.54,hide=True),
    ]))
items.append(sym('Diode:1N4007','D1',*D1,270,['1','2'],[
    prop('Reference','D1',XR-3.81,D1[1]-1.27,rot=90,justify='left',size=FS),
    prop('Value','1N4007',XR-3.81,D1[1]+1.27,rot=90,justify='left',size=FS),
    ],extra_props=[prop('Sim.Device','D',*D1,hide=True),prop('Sim.Pins','1=K 2=A',*D1,hide=True),
                   prop('Sim.Params','is=90p rs=40m n=1.4 cjo=30p tt=5u bv=1000 ibv=5u',*D1,hide=True)]))
items.append(sym('Device:R','R1',*R1,0,['1','2'],[
    prop('Reference','R1',XR-2.54,R1[1]-1.27,justify='right',size=FS),
    prop('Value','1kΩ',XR-2.54,R1[1]+1.27,justify='right',size=FS),
    ]))
items.append(sym('Device:Ammeter_DC','MES2',*A1,0,['1','2'],[
    prop('Reference','MES2',XR-5.08,A1[1]-1.27,hide=True),
    prop('Value','I',XR-4.445,A1[1],justify='right',size=FS),
    ],extra_props=[prop('Sim.Device','V',*A1,hide=True),prop('Sim.Type','DC',*A1,hide=True),
                   prop('Sim.Pins','2=+ 1=-',*A1,hide=True),prop('Sim.Params','dc=0',*A1,hide=True)]))
items.append(sym('Device:Voltmeter_DC','MES1',*VM,0,['1','2'],[
    prop('Reference','MES1',XM+5.08,VM[1]-1.27,hide=True),
    prop('Value','V_{D}',XM+4.445,VM[1],justify='left',size=FS),
    ],exclude_sim=True))
items.append(sym('power:GND','#PWR01',*GND,0,['1'],[
    prop('Reference','#PWR01',GND[0],GND[1]+6.35,hide=True),
    prop('Value','GND',GND[0],GND[1]+5.08,hide=False,size=FS),
    ]))
items.append(sym('power:PWR_FLAG','#FLG01',GND[0],BOT,0,['1'],[
    prop('Reference','#FLG01',GND[0],BOT-3.81,hide=True),
    prop('Value','PWR_FLAG',GND[0],BOT-3.81,hide=True),
    ]))
# wires
items+=wire((XL,58.42),(XL,TOP),(XM,TOP),(XM,43.18))
items+=wire((XR,TOP),(XR,44.45))
items+=wire((XR,52.07),(XR,59.69))
items+=wire((XM,53.34),(XM,55.88),(XR,55.88))
items+=wire((XR,67.31),(XR,73.66))
items+=wire((XR,83.82),(XR,BOT))
items+=wire((XR,BOT),(GND[0],BOT))
items+=wire((GND[0],BOT),(XL,BOT),(XL,68.58))
items+=[junction(XR,TOP),junction(XR,55.88),junction(GND[0],BOT)]
# labels
items.append(text('V_{s}',XL-3.81,V1[1]+0.635,size=FS,justify='right bottom'))
items.append(text('0–20 V',XL-3.81,V1[1]+3.175,size=1.27,justify='right bottom'))
items.append(text('+',XM+1.27,43.18-0.635,size=FS))
items.append(text('−',XM+1.27,53.34+2.54,size=FS))
items.append(text('Lab 1 實驗二：逆偏漏電流量測電路（D1 反接）',20.32,25.4,size=2.5,justify='left bottom'))
items.append(text('V_{s} = V_{D} + I·1 kΩ；逆偏 I ≈ 0，V_{D} ≈ V_{s}，電流表用 µA 檔',20.32,105,size=FS,justify='left bottom'))

libsyms=['lib_symbols']+[as_lib_symbol(LIBS[p],n,p) for p,n in [('Simulation_SPICE','VDC'),('Diode','1N4007'),('Device','R'),('Device','Ammeter_DC'),('Device','Voltmeter_DC'),('power','GND'),('power','PWR_FLAG')]]
doc=['kicad_sch',['version','20250114'],['generator','"eeschema"'],['generator_version','"9.0"'],['uuid',ROOT],
     ['paper','"A5"'],
     ['title_block',['title',q('Lab 1 實驗二：逆偏漏電流')],['date','"2026-09-19"'],['rev','"1"'],['company',q('NoteCraft 電子學實作系列')]],
     libsyms]+items+[['sheet_instances',['path','"/"',['page','"1"']]],['embedded_fonts','no']]
out=sys.argv[1]
open(out,'w').write(dump(doc)+'\n')
print('wrote',out)
