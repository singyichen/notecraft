import re, sys
def parse(s):
    tok = re.findall(r'"(?:[^"\\]|\\.)*"|[()]|[^\s()"]+', s)
    stack=[[]]
    for t in tok:
        if t=='(': stack.append([])
        elif t==')': x=stack.pop(); stack[-1].append(x)
        else: stack[-1].append(t)
    return stack[0]
def dump(x, ind=0):
    if isinstance(x,str): return x
    if all(isinstance(c,str) for c in x): return '('+' '.join(x)+')'
    out='('+' '.join(dump(c) for c in x if isinstance(c,str))
    for c in x:
        if not isinstance(c,str): out+='\n'+'  '*(ind+1)+dump(c,ind+1)
    return out+')'
def lib(path):
    return {c[1].strip('"'):c for c in parse(open(path).read())[0] if isinstance(c,list) and c and c[0]=='symbol'}
def flatten(L,name):
    sym=L[name]; ext=[c for c in sym if isinstance(c,list) and c[0]=='extends']
    if not ext: return sym
    parent=flatten(L,ext[0][1].strip('"'))
    props={c[1]:c for c in sym if isinstance(c,list) and c[0]=='property'}
    out=['symbol','"%s"'%name]
    for c in parent[2:]:
        if isinstance(c,list) and c[0]=='property':
            out.append(props.pop(c[1],c))
        elif isinstance(c,list) and c[0]=='symbol':
            sub=c[:]; sub[1]='"'+name+c[1].strip('"')[len(parent[1].strip('"')):]+'"'; out.append(sub)
        elif isinstance(c,list) and c[0]=='extends': pass
        else: out.append(c)
    out+=list(props.values())
    return out
def as_lib_symbol(L,name,prefix):
    s=flatten(L,name)[:]; s[1]='"%s:%s"'%(prefix,name); return s
if __name__=='__main__':
    base='/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/'
    want=[('Device','R'),('Device','Voltmeter_DC'),('Device','Ammeter_DC'),('Diode','1N4007'),('Simulation_SPICE','VDC'),('power','GND')]
    libs={}
    for p,n in want:
        libs.setdefault(p,lib(base+p+'.kicad_sym'))
        s=as_lib_symbol(libs[p],n,p)
        print(dump(s,1)); print()
