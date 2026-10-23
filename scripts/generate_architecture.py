"""Generate editable diagrams.net pages using only Python's standard library."""
from pathlib import Path
import html
import xml.etree.ElementTree as E

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'architecture'
PALETTE = {
    'app': ('#EFF6FF', '#2563EB'), 'data': ('#ECFDF5', '#059669'),
    'ai': ('#F5F3FF', '#7C3AED'), 'guard': ('#FFFBEB', '#D97706'),
    'fail': ('#FFF1F2', '#E11D48'), 'plain': ('#F8FAFC', '#94A3B8'),
}
FILE = E.Element('mxfile', host='app.diagrams.net', agent='SourceNote architecture generator', version='24.7.17', compressed='false')

def esc(s):
    return html.escape(str(s))

class Page:
    def __init__(self, key, name, subtitle, width=1600, height=1100):
        self.key, self.width, self.height = key, width, height
        self.diagram = E.SubElement(FILE, 'diagram', id=key, name=f'{key} | {name}')
        self.model = E.SubElement(self.diagram, 'mxGraphModel', dx=str(width), dy=str(height), grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth=str(width), pageHeight=str(height), math='0', shadow='0', background='#FFFFFF')
        self.root = E.SubElement(self.model, 'root')
        E.SubElement(self.root, 'mxCell', id='0')
        E.SubElement(self.root, 'mxCell', id='1', parent='0')
        self.n = 0
        self.box('brand', 'S O U R C E N O T E   /   ENGINEERING DESIGN', 40, 25, width-80, 25, text=True, size=13, color='#2563EB')
        self.box('title', f'{key[5:]}  {name}', 40, 65, width-80, 48, text=True, size=30, bold=True)
        self.box('subtitle', subtitle, 40, 120, width-80, 45, text=True, size=15, color='#475569')
        self.box('footer', f'{key}  /  Implementation architecture; live deployment pending  /  2026-10-23  /  MVP-01–11  /  ADR-07 updates baseline', 40, height-42, width-80, 25, text=True, size=12, color='#64748B')

    def box(self, id, value, x, y, w, h, kind='plain', text=False, size=15, bold=False, color='#0F172A', extra=''):
        fill, stroke = PALETTE[kind]
        style = (f'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;' if text else f'rounded=1;arcSize=8;html=1;whiteSpace=wrap;fillColor={fill};strokeColor={stroke};strokeWidth=1.5;align=left;verticalAlign=top;spacing=16;')
        style += f'fontFamily=Helvetica;fontSize={size};fontColor={color};fontStyle={1 if bold else 0};'+extra
        cell = E.SubElement(self.root, 'mxCell', id=id, value=value, style=style, vertex='1', parent='1')
        E.SubElement(cell, 'mxGeometry', x=str(x), y=str(y), width=str(w), height=str(h), attrib={'as':'geometry'})
        return id

    def card(self, id, title, lines, x,y,w,h, kind='app', size=15):
        value = f'<b>{esc(title)}</b><br><br>' + '<br>'.join(esc(s) for s in lines)
        return self.box(id,value,x,y,w,h,kind,size=size)

    def band(self,id,title,x,y,w,h):
        return self.box(id,esc(title),x,y,w,h,'plain',size=13,bold=True,extra='dashed=1;fillColor=#FAFCFF;verticalAlign=top;spacingTop=10;')

    def edge(self,s,t,label='',kind='app',start='right',end='left',points=None,dashed=False, extra=''):
        self.n+=1
        ports={'right':(1,.5),'left':(0,.5),'top':(.5,0),'bottom':(.5,1)}
        sx,sy=ports[start];tx,ty=ports[end]
        style=f'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endFill=1;strokeWidth=1.5;strokeColor={PALETTE[kind][1]};fontFamily=Helvetica;fontSize=12;fontColor=#334155;labelBackgroundColor=#FFFFFF;exitX={sx};exitY={sy};exitDx=0;exitDy=0;entryX={tx};entryY={ty};entryDx=0;entryDy=0;'
        if dashed: style+='dashed=1;'
        cell=E.SubElement(self.root,'mxCell',id=f'e{self.n}',value=esc(label).replace('\n','<br>'),style=style+extra,edge='1',parent='1',source=s,target=t)
        geo=E.SubElement(cell,'mxGeometry',relative='1',attrib={'as':'geometry'})
        if points:
            arr=E.SubElement(geo,'Array',attrib={'as':'points'})
            for x,y in points:E.SubElement(arr,'mxPoint',x=str(x),y=str(y))
        return cell

    def line(self,id,x1,y1,x2,y2,label='',kind='plain',dashed=False,arrow=True):
        cell=E.SubElement(self.root,'mxCell',id=id,value=esc(label),style=f'html=1;endArrow={"block" if arrow else "none"};endFill=1;strokeColor={PALETTE[kind][1]};strokeWidth=1.5;dashed={1 if dashed else 0};fontFamily=Helvetica;fontSize=13;fontColor=#334155;labelBackgroundColor=#FFFFFF;verticalAlign=bottom;',edge='1',parent='1')
        geo=E.SubElement(cell,'mxGeometry',relative='1',attrib={'as':'geometry'})
        E.SubElement(geo,'mxPoint',x=str(x1),y=str(y1),attrib={'as':'sourcePoint'})
        E.SubElement(geo,'mxPoint',x=str(x2),y=str(y2),attrib={'as':'targetPoint'})


p=Page('ARCH-01','System context & deployment containers','One deployable application. Durable private data. One explicit boundary where selected evidence leaves the application.',1600,1100)
p.band('host','FREE REVIEW DEPLOYMENT  /  Vercel Hobby + Neon Free  /  accounts required',390,190,780,650)
p.card('browser','Reviewer · browser',['German UI · isolated guest workspace','Notebooks → Sources / Chat / Studio','Responsive tabs on narrow screens','No provider keys or direct DB access'],40,230,280,200)
p.card('web','SourceNote · Next.js / TypeScript',['Node.js function runtime · HTTPS route handlers','Static shell + interactive React workspace','Session / notebook / ingestion / evidence / outputs','Zod validation · parameterized SQL · no shared cache'],440,250,680,160)
p.card('control','Server-owned execution',['Owner + notebook guard on every operation','DB-backed quotas, leases and idempotency','PDF.js in bounded child process; no job queue','Request-triggered expiry + stale-lease recovery'],440,465,680,145,'guard')
p.card('db','Neon Free · PostgreSQL',['Owners, notebooks, source/chunk text','Operations, evidence, entries, citations','Transactions + composite foreign keys','TLS SQL connection; bounded pool'],440,680,320,135,'data',14)
p.card('files','Private originals · logical DB storage',['source_blob bytea in the SAME database','4 MiB/file; global storage cap','Authorized download through application','Atomic blob deletion; no paid disk'],800,680,320,135,'data',14)
p.card('provider','Free AI · Groq (default)',['GPT-OSS 120B · strict JSON schema','Receives question + selected evidence','Server-held GROQ_API_KEY','Cloudflare Qwen adapter also available','No automatic fallback or paid upgrade'],1240,235,320,190,'ai')
p.card('review','SourceNote project scope',['NotebookLM-inspired; independent project','MVP: text PDF / text → chat → citations','Grounded summary + persistence','No OCR, audio, web import or sharing'],40,600,280,175,'plain',14)
p.card('delivery','Delivery path',['Local tests → GitHub Actions → build','Migrations → Vercel Hobby deploy','Health check: no AI call','Real-provider smoke test before Loom'],1240,600,320,175,'plain',14)
p.edge('browser','web','HTTPS\ncookie + JSON\n/ upload')
p.edge('web','provider','HTTPS\nbounded input','ai')
p.edge('web','control','in-process calls','guard','bottom','top')
p.edge('control','db','SQL / TLS','data','bottom','top',[(600,645)])
p.edge('control','files','SQL / bytea','data','bottom','top',[(960,645)])
p.card('boundary','Trust & privacy boundary',['Browser and documents are untrusted. Neon stores originals and text; Groq receives only the selected text, titles and question.','Secure / HttpOnly / SameSite=Lax guest cookie; check Origin + CSRF token on mutations. Render Markdown without raw HTML.','Session lifetime: 7 days; expiry denies access immediately. Physical cleanup runs on later workspace access. Provider retention is separate.'],40,875,1030,140,'guard',14)
p.card('limits','Free-tier trade-off',['Short evidence selections: at most 4k tokens.','Quotas may pause AI; cold starts possible.','Local dev: durable embedded PostgreSQL.','Free accounts only; no paid upgrade action.'],1110,875,450,140,'plain',14)

p=Page('ARCH-02','Source ingestion & grounded answering','Bounded full-context evidence for small review documents. Every path preserves owner, notebook and selected-source scope.',1600,1250)
p.box('alabel','A  /  INGESTION — request-bound; ready only after a durable transaction',40,185,1500,30,text=True,size=18,bold=True)
cards=[('validate','1  Validate & reserve',['Session + notebook ownership','PDF signature / UTF-8 / size','Source quota + idempotency key'],40,'guard'),('original','2  Store privately',['Source + original in one SQL tx','Private source_blob bytea','Temporary disk only for parsing'],420,'data'),('extract','3  Extract & split',['Claim processing lease','PDF.js child process ≤ 20 s','Page-local chunks + offsets'],800,'app'),('ready','4  Commit ready',['Replace chunks transactionally','Check lease + deletion state','ready only after all writes'],1180,'data')]
for id,title,lines,x,kind in cards:p.card(id,title,lines,x,245,340,145,kind)
for a,b in [('validate','original'),('original','extract'),('extract','ready')]:p.edge(a,b)
p.card('failure','Failed ingestion / interrupted request',['Empty, encrypted, scanned, malformed, over-limit → safe error code.','Expired processing lease → failed; user retry claims a new attempt.','One unique source attempt; stale workers cannot commit chunks.'],800,445,720,135,'fail',14)
p.card('states','Source lifecycle',['pending → processing → ready | failed; failed → processing on retry.','Any active state → deleted tombstone; text + blob purged atomically.','Request-triggered sweep reclaims expired processing leases.'],40,445,680,135,'plain',14)
p.edge('extract','failure','error / timeout','fail','bottom','top')
p.box('blabel','B  /  ANSWERING & SUMMARIES — the same evidence and citation contract',40,625,1500,30,text=True,size=18,bold=True)
for id,title,lines,x,kind in [
('scope','1  Authorize & snapshot',['Intersect supplied source IDs','owner + notebook + ready','Reject any missing / stale ID','Reserve operation + spend cap'],40,'guard'),
('evidence','2  Build bounded evidence',['All chunks of selected sources','≤ 4k evidence tokens total','Over budget? Ask to select less','Persist stable evidence IDs'],420,'data'),
('generate','3  Ask model',['Question + evidence only','No earlier answer as evidence','Structured answer blocks + IDs','Documents are untrusted data'],800,'ai'),
('verify','4  Validate & commit',['Schema + evidence allow-list','Resolve excerpts from DB','Recheck source versions / scope','Persist answer + citations'],1180,'guard')]:p.card(id,title,lines,x,685,340,175,kind,14)
for a,b in [('scope','evidence'),('evidence','generate'),('generate','verify')]:p.edge(a,b,kind='ai' if a=='evidence' else 'app')
p.card('noanswer','Explicit limitation, not a fabricated answer',['No ready selection → request sources. Over budget → narrow selection.','Model reports insufficient evidence → persist a limitation, no citations.','Invalid citation / refusal / timeout → safe failure; no partial answer shown.'],40,925,720,150,'fail',14)
p.card('viewer','5  Inspect the supporting excerpt',['Return validated final text only; streaming deferred.','Citation click → authorize again → stored chunk text + reliable location.','Deleted source → unavailable; never serve stale text.','A valid ID proves provenance, not semantic support: evaluate claims.'],800,925,720,150,'data',14)
p.edge('verify','viewer','valid result','data','bottom','top',[(1350,895),(1160,895)])
p.edge('generate','noanswer','insufficient / failed','fail','bottom','top',[(970,895),(400,895)])
p.card('caps','Implemented demo limits · free-tier defaults',['4 MiB/file · 50 PDF pages · 100k extracted characters/source · 10 sources/notebook · 3 notebooks/session · 500k stored characters/session.','≤ 4k evidence tokens · ≤ 2k completion tokens · 1 generation/session and 3/service · 30/session/day · provider quotas still apply.'],40,1100,1480,100,'plain',13)

p=Page('ARCH-03','Data model / ERD','One relational ownership chain. Arrows show parent → child (1 : many unless labeled); all foreign-key details are in the schema notes.',1800,1430)
tables=[
('owner','workspace_owner',['PK id: uuid','token_hash: text UNIQUE','created_at, expires_at: timestamptz'],40,220,310,150),
('notebook','notebook',['PK id: uuid','FK owner_id: uuid','title: text; created_at: timestamptz','UNIQUE(owner_id, id)'],440,220,330,150),
('source','source',['PK id: uuid; FK notebook_id: uuid','status: text + CHECK; version: int','storage_key: text?; title: text','mime: text; bytes: int','error_code: text?; deleted_at: time?','UNIQUE(notebook_id, id)'],880,220,360,215),
('chunk','chunk',['PK id: uuid; FK source_id: uuid','notebook_id: uuid; ordinal: int','text: text; tokens: int','page_no: int?; char_start/end: int','UNIQUE(source_id, ordinal)','UNIQUE(notebook_id, source_id, id)'],1370,220,380,215),
('blob','source_blob',['PK / FK source_id: uuid','data: bytea NOT NULL','One original per source','Deleted atomically with source text','4 MiB/file; no public object URL'],40,540,310,200),
('operation','operation',['PK id: uuid; FK notebook_id: uuid','kind: ingest | answer | summary | quiz','state: running | succeeded | failed','idempotency_key, request_hash: text','lease_until: time; attempt: int','model, prompt_version: text?','usage: jsonb; error_code: text?','UNIQUE(notebook_id, kind, idem_key)','UNIQUE(notebook_id, id)'],440,505,330,285),
('selection','operation_source',['PK(operation_id, source_id)','FK notebook_id, operation_id','FK notebook_id, source_id','source_version: int','Input-selection snapshot','One source for ingestion operations'],880,535,360,205),
('evidence','evidence',['PK id: uuid; notebook_id: uuid','FK operation_id, source_id, chunk_id','ordinal: int; unavailable_at: time?','Immutable membership, no copied text','chunk_id NULL after source purge','UNIQUE(notebook_id, operation_id, id)'],1370,535,380,205),
('entry','entry',['PK id: uuid; FK notebook_id: uuid','FK operation_id: uuid?; parent_id: uuid?','kind: question/answer/summary/note/quiz','body: jsonb?; unavailable_at: time?','UNIQUE(notebook_id, operation_id, id)','UNIQUE(notebook_id, id)','One chat thread per notebook'],440,875,330,235),
('citation','citation',['PK(entry_id, block_no, ordinal)','FK notebook_id, operation_id, entry_id','FK notebook_id, operation_id, evidence_id','No model-provided quote / page stored','Quote and location resolved on read'],1030,885,570,200),
]
for id,title,lines,x,y,w,h in tables:p.card(id,title,lines,x,y,w,h,'data' if id not in ('operation','quota') else 'guard',14)
p.edge('owner','notebook','1 : 0..*','data')
p.edge('notebook','source','1 : 0..*','data')
p.edge('source','chunk','1 : 0..*','data')
p.edge('notebook','operation','1 : 0..*','data','bottom','top')
p.edge('operation','selection','1 : 0..*','data')
p.edge('source','selection','1 : 0..*','data','bottom','top')
p.edge('selection','evidence','1 : 0..*','data')
p.edge('chunk','evidence','0..1 : 0..*','data','bottom','top')
p.edge('operation','entry','1 : 0..*','data','bottom','top')
p.edge('entry','citation','1 : 0..*','data')
p.edge('evidence','citation','1 : 0..*','data','bottom','top',[(1560,815),(1315,815)])
p.card('qnote','quota_bucket',['PK key: text (scope + time window)','tokens: bigint; requests: int','updated_at: timestamptz','Atomic global/session reservations','No direct owner FK; no source text'],40,875,310,200,'guard',14)
p.card('constraints','Integrity & indexes',['All notebook-scoped FKs include notebook_id. Citation FKs also include operation_id: another operation’s evidence cannot be attached.','Evidence references operation_source + matching chunk source. Entry parent FK includes notebook_id; note-copy logic preserves operation provenance.','Index: notebook(owner_id, updated_at); source(notebook_id, status); chunk(source_id, ordinal); entry(notebook_id, created_at); operation(state, lease_until).','CHECK: nonnegative source bytes / text length, valid offset end, allowed states. Nullable fields shown with ?. Executable schema: migrations/001_initial.sql.'],40,1170,1710,165,'guard',14)

p=Page('ARCH-04','Question-to-citation sequence','Answer, limitation and provider failure are separate outcomes. No unchecked model text reaches the browser.',1600,1630)
actors=[('Reviewer UI',160,'app'),('API / session guard',470,'guard'),('Evidence + generation',800,'app'),('PostgreSQL',1120,'data'),('AI provider',1440,'ai')]
for i,(name,x,k) in enumerate(actors):
    p.box(f'actor{i}',f'<b>{esc(name)}</b>',x-120,195,240,60,k,size=15,extra='align=center;verticalAlign=middle;spacing=8;')
    p.line(f'life{i}',x,255,x,1450,dashed=True,arrow=False)
def msg(n,a,b,y,label,kind='app',reply=False):
    p.line(f'm{n}',actors[a][1],y,actors[b][1],y,f'{n:02d}  {label}',kind,reply)
msg(1,0,1,300,'POST question + selected IDs + idempotency key')
msg(2,1,3,355,'Authorize session / notebook; reserve operation & quotas','guard')
msg(3,3,1,410,'Existing result → reuse; hash mismatch → 409','data',True)
msg(4,1,2,465,'Authorized owner, notebook, exact selected set')
msg(5,2,3,520,'Load ready chunks; persist selection + evidence IDs','data')
msg(6,3,2,575,'Scoped evidence + versions; reject stale IDs','data',True)
p.box('early','EARLY EXIT  /  no evidence, oversized context or exhausted quota → useful 4xx; no provider request',60,605,1480,40,'guard',size=14,extra='verticalAlign=middle;spacing=10;')
msg(7,2,4,690,'Question + bounded evidence; structured schema; 45 s deadline','ai')
msg(8,4,2,745,'Answer blocks + evidence IDs OR insufficient evidence','ai',True)
p.box('altok','A  /  VALID ANSWER OR HONEST LIMITATION',60,780,1480,35,'data',size=14,bold=True,extra='verticalAlign=middle;spacing=8;')
msg(9,2,2,850,'Validate schema / cited IDs; no unchecked quotes','guard')
# Explicit self-call geometry so the message remains visible.
selfcell=p.root.find("mxCell[@id='m9']")
selfgeo=selfcell.find('mxGeometry')
selfpts=E.SubElement(selfgeo,'Array',attrib={'as':'points'})
E.SubElement(selfpts,'mxPoint',x='940',y='850');E.SubElement(selfpts,'mxPoint',x='940',y='880')
selfgeo.find("mxPoint[@as='targetPoint']").set('y','880')
msg(10,2,3,925,'Lock notebook; recheck versions; commit entry + citations + usage','data')
msg(11,2,0,980,'Validated answer OR limitation without citations',reply=True)
p.box('alterror','B  /  TIMEOUT, REFUSAL, INVALID REFERENCES OR SOURCE DELETED DURING GENERATION',60,1015,1480,35,'fail',size=14,bold=True,extra='verticalAlign=middle;spacing=8;')
msg(12,2,3,1090,'Mark operation failed; reconcile usage reservation','fail')
msg(13,2,0,1145,'Safe error + explicit retry; no partial output','fail',True)
p.box('inspect','C  /  LATER: OPEN A CITATION FROM A SUCCESSFUL ANSWER',60,1185,1480,35,'app',size=14,bold=True,extra='verticalAlign=middle;spacing=8;')
msg(14,0,1,1260,'GET citation for entry / block / ordinal')
msg(15,1,3,1315,'Authorize owner; join entry → evidence → live chunk','data')
msg(16,3,1,1370,'Stored excerpt + page/offset OR source unavailable','data',True)
msg(17,1,0,1425,'Open source viewer; show exact supporting passage',reply=True)
p.card('seqnote','Recovery semantics',['Completed idempotency key returns the existing result; running key returns 202 + operation ID. Reload polls operation status.','No automatic provider retry after ambiguous timeout. Unknown spend stays reserved until reconciled; explicit retry uses a new key.','A refreshed page may recover a committed answer. Stale lease holders cannot commit. Provider execution is not claimed to be exactly-once.'],60,1460,1480,120,'plain',13)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    E.indent(FILE,space='  ')
    E.ElementTree(FILE).write(OUT/'notebooklm-clone.drawio',encoding='utf-8',xml_declaration=True)
    pages=OUT/'pages';pages.mkdir(exist_ok=True)
    for diagram in FILE.findall('diagram'):
        E.ElementTree(diagram.find('mxGraphModel')).write(pages/f"{diagram.get('id')}.xml",encoding='utf-8',xml_declaration=True)
    print(f'Generated {len(FILE.findall("diagram"))} editable pages in {OUT}')

if __name__=='__main__':main()
