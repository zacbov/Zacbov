// Static broad phase for the mushroom canopy. Each cell stores only caps whose
// expanded footprint overlaps it. The GPU then checks those few shapes exactly.
export function createCapGrid(layouts, {size=12,cellSize=.55,padding=.025}={}) {
  const origin=-size*cellSize/2;
  const cells=Array.from({length:size*size},()=>[]);
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const x0=origin+x*cellSize,z0=origin+z*cellSize;
    layouts.forEach((m,index)=>{
      const cx=m.x+m.bend,cz=m.z;
      const dx=Math.max(x0-cx,0,cx-x0-cellSize);
      const dz=Math.max(z0-cz,0,cz-z0-cellSize);
      if(dx*dx+dz*dz<(m.r*1.20+padding)**2)cells[z*size+x].push(index);
    });
  }
  const stride=Math.max(4,Math.ceil(Math.max(...cells.map(cell=>cell.length))/4)*4);
  return {size,cellSize,origin,stride,counts:cells.map(cell=>cell.length),
    indices:cells.flatMap(cell=>Array.from({length:stride},(_,i)=>cell[i]??0))};
}

export function createEmitterTable(layouts, size=256) {
  const total=layouts.reduce((sum,m)=>sum+m.r*m.r,0);
  // Reserve a shared baseline for the small mushrooms; the remaining budget
  // scales with gill area. Every cap keeps a visible continuous population.
  const weights=layouts.map(m=>.35/layouts.length+.65*m.r*m.r/total);
  return Array.from({length:size},(_,i)=>{
    const area=(i+.5)/size;let sum=0;
    for(let j=0;j<layouts.length;j++){sum+=weights[j];if(sum>=area)return j;}
    return layouts.length-1;
  });
}
