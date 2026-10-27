export const drugs={
 norepinephrine:{a1:1,a2:.8,b1:.5,b2:0,d1:0},epinephrine:{a1:.7,a2:.3,b1:.8,b2:.6,d1:0},isoprenaline:{a1:0,a2:0,b1:1,b2:1,d1:0},dopamine:{a1:.2,a2:0,b1:.6,b2:0,d1:.7},dobutamine:{a1:.05,a2:0,b1:.85,b2:.05,d1:0},salbutamol:{a1:0,a2:0,b1:.05,b2:1,d1:0}
};
// Dimensionless receptor model; these are educational trends, not dose-response predictions.
export function adrenergic(drug='epinephrine',block='none',strength=1){
 const r={...(drugs[drug]||drugs.epinephrine)};
 for(const k of Object.keys(r))r[k]*=strength;
 if(block==='alpha'){r.a1=0;r.a2=0;}
 if(block==='propranolol'){r.b1=0;r.b2=0;}
 if(block==='metoprolol')r.b1*=.1;
 const resistance=30*r.a1-22*r.b2-5*r.d1;
 return {...r,resistance,hr:Math.round(72+30*r.b1-.65*Math.max(0,resistance)),sbp:Math.round(118+resistance+24*r.b1),dbp:Math.round(76+resistance),airway:1+.65*r.b2,contractility:1+.7*r.b1,map:Math.round(90+resistance+5*r.b1),feedback:1-.6*r.a2};
}
export function enzyme(mode){return {normal:{activity:1,ach:12},neo:{activity:.25,ach:35},op:{activity:.02,ach:56},pam:{activity:.8,ach:18},age:{activity:.02,ach:56}}[mode]||{activity:1,ach:12};}
export function muscle(mode,t){if(mode==='sux'||mode==='suxneo')return t<2?Math.sin(t*35)*.22:0;if(mode==='tubo')return 0;return Math.sin(t*3)*.4;}
