import {drugs} from './data.js';
const clamp=(v,min=.2,max=2.2)=>Math.max(min,Math.min(max,v));
const base={heartRate:1,bloodVolume:1,contractility:1,vascularResistance:1,venousTone:1,coronaryTone:1,renin:1,aceActivity:1,at1Availability:1,aldosteroneReceptor:1,remodeling:1,naSpeed:1,avSpeed:1,refractory:1,qt:1,plateletActivity:1,coagulation:1,fibrinolysis:.2,bleedingRisk:1};
export const presets={normal:{},tachycardia:{heartRate:1.6,avSpeed:1.3},angina:{heartRate:1.45,contractility:1.2,coronaryTone:1.5,vascularResistance:1.15},hypertension:{vascularResistance:1.45,renin:1.5,bloodVolume:1.1},heartFailure:{contractility:.55,bloodVolume:1.5,renin:1.55,vascularResistance:1.2,heartRate:1.15},raas:{renin:1.7,bloodVolume:1.15},thrombosis:{plateletActivity:1.5,coagulation:1.6}};
export class CirculationSimulation {
 constructor(saved){this.reset();if(saved&&Object.hasOwn(presets,saved.preset)){this.preset=saved.preset;this.inputs={};for(const [k,v] of Object.entries(saved.inputs||{}))if(Object.hasOwn(base,k)&&Number.isFinite(v))this.inputs[k]=clamp(v,.1,2.2);this.drug=Object.hasOwn(drugs,saved.drug)?saved.drug:null;}}
 reset(preset='normal'){this.preset=presets[preset]?preset:'normal';this.inputs={};this.drug=null;return this.read();}
 setInput(key,value){if(key in base&&Number.isFinite(value))this.inputs[key]=clamp(value,.2,2.2);return this.read();}
 apply(id){if(!Object.hasOwn(drugs,id))throw new Error('Unknown pharmacology mechanism');this.drug=id;return this.read();}
 serialize(){return {preset:this.preset,inputs:{...this.inputs},drug:this.drug};}
 read(){
  const b={...base,...presets[this.preset],...this.inputs},v={...b};
  if(this.drug)for(const [key,multiplier] of Object.entries(drugs[this.drug].effects))v[key]=clamp(v[key]*multiplier,.1,3);
  const angiotensinII=v.renin*v.aceActivity,at1Signal=angiotensinII*v.at1Availability;
  const aldosterone=at1Signal*v.aldosteroneReceptor,bradykinin=clamp(1/v.aceActivity,1,2.5);
  // Normalize RAAS changes against the scenario, so resetting preserves its baseline.
  const referenceAng=b.renin*b.aceActivity*b.at1Availability;
  const resistance=clamp(v.vascularResistance*(.7+.3*at1Signal/referenceAng));
  const volume=clamp(v.bloodVolume*(.92+.08*aldosterone/referenceAng));
  const preload=clamp(volume*v.venousTone),afterload=resistance;
  const filling=clamp(1-Math.max(0,v.heartRate-1.15)*.22,.65,1);
  const strokeVolume=clamp(v.contractility*(.55+.45*preload)*filling/(.7+.3*afterload),.2,2);
  const cardiacOutput=v.heartRate*strokeVolume,meanArterialPressure=cardiacOutput*resistance;
  const wallTension=preload*afterload;
  const oxygenDemand=v.heartRate*v.contractility*(.55+.45*wallTension);
  const oxygenSupply=clamp(meanArterialPressure/(.7+.3*v.coronaryTone)*filling,.15,2.5);
  return {heartRate:v.heartRate,strokeVolume,cardiacOutput,vascularResistance:resistance,meanArterialPressure,bloodVolume:volume,contractility:v.contractility,preload,afterload,wallTension,oxygenSupply,oxygenDemand,renin:v.renin,angiotensinII,at1Signal,aldosterone,bradykinin,remodeling:v.remodeling,plateletActivity:v.plateletActivity,coagulation:v.coagulation,fibrinolysis:v.fibrinolysis,bleedingRisk:v.bleedingRisk,clotFormation:v.plateletActivity*v.coagulation,clotClearance:v.fibrinolysis,conductionState:{saRate:v.heartRate,avSpeed:v.avSpeed,naSpeed:v.naSpeed,refractoryPeriod:v.refractory,qt:v.qt}};
 }
}
export function ecgAt(phase,state){
 const x=((phase%1)+1)%1,gauss=(c,w,a)=>a*Math.exp(-(((x-c)/w)**2)),c=state.conductionState;
 const delay=(1-c.avSpeed)*.07,width=.015/c.naSpeed;
 return gauss(.15,.035,.15)-gauss(.29+delay,width,.18)+gauss(.32+delay,width,1)-gauss(.35+delay,width,.25)+gauss(.59+delay,.07*c.qt,.3);
}
