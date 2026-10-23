"""Approximate layout previews, NOT the diagrams.net renderer. Requires Pillow.

Native XML remains the deliverable. This checks label fit and provides local
visual inspection when browser automation cannot open the actual editor.
"""
from pathlib import Path
from html import unescape
import re
import math
import xml.etree.ElementTree as E
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'docs'/'architecture'
FONTS=Path('C:/Windows/Fonts')

def style(c):
    return dict(p.split('=',1) for p in c.get('style','').split(';') if '=' in p)

def plain(value):
    return unescape(re.sub('<[^>]*>','',re.sub(r'<br\s*/?>','\n',value)))

def font(size,bold=False):
    return ImageFont.truetype(str(FONTS/('arialbd.ttf' if bold else 'arial.ttf')),size)

def wrap(text, f, width):
    result=[]
    for paragraph in text.split('\n'):
        if not paragraph:result.append('');continue
        line=''
        for word in paragraph.split():
            proposed=(line+' '+word).strip()
            if f.getlength(proposed)>width and line:result.append(line);line=word
            else:line=proposed
        result.append(line)
    return result

def main():
    output=DIR/'previews';output.mkdir(exist_ok=True)
    for diagram in E.parse(DIR/'notebooklm-clone.drawio').getroot().findall('diagram'):
        model=diagram.find('mxGraphModel');w,h=int(model.get('pageWidth')),int(model.get('pageHeight'))
        im=Image.new('RGB',(w,h),'white');d=ImageDraw.Draw(im)
        cells=model.find('root').findall('mxCell');by_id={c.get('id'):c for c in cells}
        warnings=[]
        def bounds(c):
            g=c.find('mxGeometry');return tuple(float(g.get(k,'0')) for k in ('x','y','width','height'))
        # Native z-order is approximated: vertices first, connectors over them.
        for c in cells:
            if c.get('vertex')!='1':continue
            s=style(c);x,y,cw,ch=bounds(c);istext=s.get('fillColor')=='none'
            if not istext:
                d.rounded_rectangle((x,y,x+cw,y+ch),radius=8,fill=s.get('fillColor','#fff'),outline=s.get('strokeColor','#94A3B8'),width=2)
            size=int(s.get('fontSize','15'));f=font(size,s.get('fontStyle')=='1')
            pad=0 if istext else int(s.get('spacing','16'))
            lines=wrap(plain(c.get('value','')),f,cw-2*pad)
            lineh=round(size*1.2);total=len(lines)*lineh
            if total>ch-2*pad+4:warnings.append(f"{c.get('id')}: text needs {total}px, available {ch-2*pad}px")
            ty=y+pad if s.get('verticalAlign')!='middle' else y+(ch-total)/2
            for i,line in enumerate(lines):
                ff=font(size,True) if i==0 and c.get('value','').startswith('<b>') else f
                tx=x+pad if s.get('align')!='center' else x+(cw-ff.getlength(line))/2
                d.text((tx,ty+i*lineh),line,font=ff,fill=s.get('fontColor','#0F172A'))
        for c in cells:
            if c.get('edge')!='1':continue
            s=style(c);g=c.find('mxGeometry')
            def endpoint(name):
                if c.get(name):
                    x,y,cw,ch=bounds(by_id[c.get(name)])
                    prefix='exit' if name=='source' else 'entry'
                    return (x+cw*float(s.get(prefix+'X','.5')),y+ch*float(s.get(prefix+'Y','.5')))
                p=g.find(f"mxPoint[@as='{name}Point']");return(float(p.get('x')),float(p.get('y')))
            a,b=endpoint('source'),endpoint('target');points=[a]
            arr=g.find("Array[@as='points']")
            if arr is not None:points += [(float(p.get('x')),float(p.get('y'))) for p in arr]
            elif a[0]!=b[0] and a[1]!=b[1]:
                if s.get('exitY')=='1':points += [(a[0],(a[1]+b[1])/2),(b[0],(a[1]+b[1])/2)]
                else:points += [((a[0]+b[0])/2,a[1]),((a[0]+b[0])/2,b[1])]
            points.append(b);color=s.get('strokeColor','#94A3B8')
            if s.get('dashed')=='1':
                for aa,bb in zip(points,points[1:]):
                    length=math.dist(aa,bb)
                    if not length:continue
                    for t in range(0,int(length),10):
                        q=min(t+5,length)
                        d.line([(aa[0]+(bb[0]-aa[0])*t/length,aa[1]+(bb[1]-aa[1])*t/length),(aa[0]+(bb[0]-aa[0])*q/length,aa[1]+(bb[1]-aa[1])*q/length)],fill=color,width=2)
            else:d.line(points,fill=color,width=2)
            if s.get('endArrow')!='none':
                prev=next((v for v in reversed(points[:-1]) if v!=b),a)
                angle=math.atan2(b[1]-prev[1],b[0]-prev[0])
                d.polygon([b,(b[0]-9*math.cos(angle-.45),b[1]-9*math.sin(angle-.45)),(b[0]-9*math.cos(angle+.45),b[1]-9*math.sin(angle+.45))],fill=color)
            label=plain(c.get('value',''))
            if label:
                size=int(s.get('fontSize','12'));f=font(size);lh=size+3
                # Midpoint of the longest segment provides an approximate edge label placement.
                aa,bb=max(zip(points,points[1:]),key=lambda pair:math.dist(*pair))
                mx,my=(aa[0]+bb[0])/2,(aa[1]+bb[1])/2
                lines=label.split('\n');tw=max(f.getlength(v) for v in lines);th=len(lines)*lh
                if c.get('id','').startswith('m'):my-=th/2+5
                d.rectangle((mx-tw/2-3,my-th/2-2,mx+tw/2+3,my+th/2+2),fill='white')
                for i,line in enumerate(lines):d.text((mx-f.getlength(line)/2,my-th/2+i*lh),line,font=f,fill='#334155')
        d.text((40,h-17),'APPROXIMATE LOCAL LAYOUT PREVIEW — native editor rendering not verified',font=font(10),fill='#64748B')
        im.save(output/f"{diagram.get('id')}.png")
        print(diagram.get('id')+': '+('; '.join(warnings) if warnings else 'label-fit check passed'))

if __name__=='__main__':main()
