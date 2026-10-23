"""Structural validation for the delivered native draw.io artifacts."""
from pathlib import Path
import xml.etree.ElementTree as E

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'docs'/'architecture'

def validate_model(model, label):
    assert model is not None and model.tag=='mxGraphModel', label
    root=model.find('root'); assert root is not None, label
    cells=root.findall('mxCell'); ids=[c.get('id') for c in cells]
    assert len(ids)==len(set(ids)) and None not in ids, f'{label}: duplicate/missing IDs'
    by_id={c.get('id'):c for c in cells}
    assert '0' in by_id and by_id['1'].get('parent')=='0', f'{label}: root structure'
    w=float(model.get('pageWidth'));h=float(model.get('pageHeight'))
    for c in cells:
        cid=c.get('id')
        if cid=='0':continue
        assert c.get('parent') in by_id, f'{label}/{cid}: parent'
        # Every parent path must terminate at root, without cycles.
        seen={cid};parent=c.get('parent')
        while parent!='0':
            assert parent not in seen, f'{label}/{cid}: parent cycle'
            seen.add(parent);parent=by_id[parent].get('parent')
            assert parent in by_id, f'{label}/{cid}: broken ancestor'
        g=c.find('mxGeometry')
        if c.get('vertex')=='1':
            assert g is not None, f'{label}/{cid}: no geometry'
            x,y,cw,ch=[float(g.get(a,'0')) for a in ('x','y','width','height')]
            assert cw>0 and ch>0, f'{label}/{cid}: nonpositive size'
            assert x>=0 and y>=0 and x+cw<=w and y+ch<=h, f'{label}/{cid}: outside page'
        if c.get('edge')=='1':
            assert g is not None and g.get('relative')=='1', f'{label}/{cid}: edge geometry'
            for name in ('source','target'):
                ref=c.get(name)
                if ref:assert ref in by_id and by_id[ref].get('vertex')=='1',f'{label}/{cid}: invalid {name}'
                else:assert g.find(f"mxPoint[@as='{name}Point']") is not None,f'{label}/{cid}: no {name}'
        assert 'stencil(' not in c.get('style',''), f'{label}/{cid}: external stencil'
    return len([c for c in cells if c.get('vertex')=='1']),len([c for c in cells if c.get('edge')=='1'])

def main():
    file=E.parse(DIR/'notebooklm-clone.drawio').getroot()
    assert file.tag=='mxfile' and file.get('compressed')=='false'
    pages=file.findall('diagram')
    assert [p.get('id') for p in pages]==[f'ARCH-0{i}' for i in range(1,5)]
    assert len({p.get('name') for p in pages})==4
    for p in pages:
        name=p.get('id');model=p.find('mxGraphModel')
        v,e=validate_model(model,name)
        standalone=E.parse(DIR/'pages'/f'{name}.xml').getroot()
        validate_model(standalone,name+' standalone')
        # Whitespace indentation is not semantically meaningful.
        assert E.canonicalize(E.tostring(model,encoding='unicode'),strip_text=True)==E.canonicalize(E.tostring(standalone,encoding='unicode'),strip_text=True)
        print(f'{name}: PASS — {v} vertices, {e} edges; standalone matches')
    print('PASS: four complete native pages, IDs, roots, parent chains, edge endpoints, geometry, bounds and standalone equivalence')

if __name__=='__main__':main()
