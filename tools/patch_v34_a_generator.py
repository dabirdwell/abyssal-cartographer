"""v3.4, part A: the generator tells the truth about doors and passages. No random draw is added, removed or moved."""
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from patchlib import Patch
p = Patch(sys.argv[1])

# 1. which wall a door is on, from where it is drawn
p.before("  /* entrance */\n", """  /* the wall a door stands in, read from where it is drawn: the door square and the first square of its passage */
  const WALL=(d,o)=>o[1]<d[1]?"north":o[1]>d[1]?"south":o[0]>d[0]?"east":"west";
  const wallA=e=>WALL(e.da,e.path[0]), wallB=e=>WALL(e.db,e.path[e.path.length-1]);
""")

# 2. passages with no room in common no longer share floor
p.after("  for(const[i,j]of SH(rng,pairs)){if(loops>=RI(rng,2,4))break;if(connect(rooms[i],rooms[j]))loops++;}\n", """  /* ---- passages with no room in common must not share floor ----
     On the map a shared square reads as a junction, and the key knows of none. Any such passage is laid again
     around the others: the shortest way with the fewest turns. No random number is drawn, so the same code still
     builds the same rooms, doors, creatures and treasure; only the line of a passage moves. */
  (function untangle(){
    const rel=(i,j)=>{const a=edges[i],b=edges[j];return a.a===b.a||a.a===b.b||a.b===b.a||a.b===b.b;};
    let own=new Map();
    const index=()=>{own=new Map();edges.forEach((e,i)=>e.path.forEach(([x,y])=>{const k=K(x,y),o=own.get(k);if(o)o.push(i);else own.set(k,[i]);}));};
    const foreign=(i,k)=>{const o=own.get(k);return !!o&&o.some(j=>j!==i&&!rel(i,j));};
    const clash=i=>edges[i].path.some(([x,y])=>foreign(i,K(x,y)));
    const DX=[1,0,-1,0],DY=[0,1,0,-1];
    function relay(i){
      const e=edges[i],s=e.path[0],g=e.path[e.path.length-1];
      if(s[0]===g[0]&&s[1]===g[1])return null;
      const shut=(x,y)=>x<0||y<0||x>=GW||y>=GH||occ.has(K(x,y))||(!(x===g[0]&&y===g[1])&&foreign(i,K(x,y)));
      const best=new Map(),from=new Map(),buckets=[];
      const push=(c,x,y,d,prev)=>{const id=(y*GW+x)*4+d;if(best.has(id)&&best.get(id)<=c)return;best.set(id,c);from.set(id,prev);(buckets[c]||(buckets[c]=[])).push(id);};
      for(let d=0;d<4;d++)push(0,s[0],s[1],d,-1);
      let end=-1;
      for(let c=0;c<buckets.length&&end<0;c++){const b=buckets[c];if(!b)continue;
        for(let n=0;n<b.length;n++){const id=b[n];if(best.get(id)!==c)continue;
          const d=id&3,cell=id>>2,x=cell%GW,y=(cell-x)/GW;
          if(x===g[0]&&y===g[1]){end=id;break;}
          for(let nd=0;nd<4;nd++){if(((nd+2)&3)===d)continue;
            const nx=x+DX[nd],ny=y+DY[nd];if(shut(nx,ny))continue;
            push(c+2+(nd===d?0:3),nx,ny,nd,id);}}}
      if(end<0)return null;
      const out=[];for(let id=end;id!==-1;id=from.get(id)){const cell=id>>2,x=cell%GW;out.push([x,(cell-x)/GW]);}
      return out.reverse();
    }
    index();
    for(let pass=0;pass<4;pass++){let moved=false;
      for(let i=0;i<edges.length;i++){if(!clash(i))continue;const np=relay(i);if(np){edges[i].path=np;index();moved=true;}}
      if(!moved)break;}
    /* where the stone leaves no other way, the key says so rather than hide it */
    for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){if(rel(i,j))continue;
      if(edges[i].path.some(([x,y])=>{const o=own.get(K(x,y));return !!o&&o.includes(j);})){
        (edges[i].meets=edges[i].meets||[]).push(j);(edges[j].meets=edges[j].meets||[]).push(i);}}
  })();
""")

# 3. the key's name for a locked door's wall
p.sub(r"le\.keyIn=kr\.id;le\.keySide=DIRNAME\(\s*rooms\[le\.b\]\.bbox\.x-rooms\[le\.a\]\.bbox\.x, rooms\[le\.b\]\.bbox\.y-rooms\[le\.a\]\.bbox\.y\);",
      "le.keyIn=kr.id;le.keySide=wallA(le);")

# 4. secret doors: the wall they are really in
p.sub(r"""  for\(const e of edges\)\{if\(e\.type==="secret"\)\{\s*const dn=DIRNAME\(rooms\[e\.b\]\.bbox\.x-rooms\[e\.a\]\.bbox\.x,rooms\[e\.b\]\.bbox\.y-rooms\[e\.a\]\.bbox\.y\);\s*rooms\[e\.a\]\.secretNote=.*?from this side\)\.";\}\}""",
"""  for(const e of edges){if(e.type==="secret"){
    const note=(r,w,tail)=>{r.secretNote=r.secretNote?r.secretNote+" Another hides in the "+w+" wall.":"A secret door hides in the "+w+" wall ("+tail+").";};
    note(rooms[e.a],wallA(e),"DC 12 WIS to notice the draft");
    note(rooms[e.b],wallB(e),"DC 12 WIS from this side");}}""")

# 5. the exits: direction from the drawn wall, a side for each barred door, and which is which when a wall has two
p.sub(r"""  for\(const e of edges\)\{\s*const dn=DIRNAME\(rooms\[e\.b\]\.bbox\.x-rooms\[e\.a\]\.bbox\.x,rooms\[e\.b\]\.bbox\.y-rooms\[e\.a\]\.bbox\.y\);\s*const back=.*?rooms\.forEach\(r=>r\.exits\.sort\(\(a,b\)=>a\.dir\.localeCompare\(b\.dir\)\)\);""",
"""  for(const e of edges){
    const t=e.type;
    let la=t==="open"?"open passage":t==="door"?"wooden door":t==="stuck"?"stuck door (DC 12 STR)":t==="locked"?"locked iron door":t==="barred"?"":"secret door", lb=la;
    if(t==="barred"){ /* the bar sits on the side farther from the entrance, so the door is a way back and never a dead wall */
      const d=bfs(0,x=>x===e), far=d[e.a]<0?e.a:d[e.b]<0?e.b:(d[e.a]>d[e.b]?e.a:e.b);
      e.barIn=far;
      const held="barred door (the bar is on this side; lift it)", shut="door barred from the other side (DC 15 STR to force it, and it is loud)";
      la=far===e.a?held:shut; lb=far===e.b?held:shut;}
    const meet=e.meets?"it meets the passage between rooms "+e.meets.map(j=>num(edges[j].a)+" and "+num(edges[j].b)).join(", and the one between rooms ")+" on the way, and a party can turn there":"";
    rooms[e.a].exits.push({dir:wallA(e),to:num(e.b),label:la,secret:t==="secret",at:e.da,note:meet});
    rooms[e.b].exits.push({dir:wallB(e),to:num(e.a),label:lb,secret:t==="secret",at:e.db,note:meet});
  }
  /* two doors in one wall: say which is which, reading the wall the way the map is drawn */
  rooms.forEach(r=>{
    const ORD={north:0,east:1,south:2,west:3}, along=x=>(x.dir==="north"||x.dir==="south")?x.at[0]:x.at[1];
    r.exits.sort((a,b)=>ORD[a.dir]-ORD[b.dir]||along(a)-along(b)||a.to-b.to);
    for(const w of ["north","east","south","west"]){
      const g=r.exits.filter(x=>x.dir===w&&!x.secret); if(g.length<2)continue;
      const spots=[...new Set(g.map(along))], ends=(w==="north"||w==="south")?["west","east"]:["north","south"];
      g.forEach(x=>{const i=spots.indexOf(along(x)), many=g.filter(y=>along(y)===along(x)).length>1;
        const where=spots.length<2?"":i===0?ends[0]+" end":i===spots.length-1?ends[1]+" end":spots.length===3?"middle":"doorway "+(i+1)+" from the "+ends[0];
        const side=[where,many?"shared doorway":""].filter(Boolean).join(", "); if(side)x.side=side;});}
    r.exits.forEach(x=>{delete x.at; if(!x.note)delete x.note;});});""")
p.save()
