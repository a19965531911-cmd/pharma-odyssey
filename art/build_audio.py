"""Original quiet game foley and environment loops, standard-library synthesis only."""
import math, random, struct, wave, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/audio';OUT.mkdir(parents=True,exist_ok=True)
RATE=22050
random.seed(3103)
TAU=2*math.pi

def save(name,samples,loop=False):
    peak=max(abs(x) for x in samples) or 1
    assert peak<=1, (name,peak)
    with wave.open(str(OUT/(name+'.wav')),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE)
        f.writeframes(b''.join(struct.pack('<h',int(max(-1,min(1,x))*32767)) for x in samples))
    return {'file':name+'.wav','seconds':round(len(samples)/RATE,3),'loop':loop,'peak':round(peak,4),'sampleRate':RATE,'channels':1}

def bell(t,f,decay=4):
    return sum(a*math.sin(TAU*f*k*t)*math.exp(-decay*d*t) for k,a,d in [(1,.55,1),(2.01,.22,1.8),(3.9,.09,3),(5.4,.04,4)])

def noise(n):
    # Soft low-pass filtered noise; no sharp high-frequency hiss.
    v=0;result=[]
    for i in range(n):v=.92*v+.08*random.uniform(-1,1);result.append(v)
    return result

manifest=[]
n=int(RATE*.22);ns=noise(n)
manifest.append(save('footstep',[.29*math.exp(-24*i/RATE)*(math.sin(TAU*115*i/RATE)*.34+ns[i])*(1-math.exp(-350*i/RATE)) for i in range(n)]))
n=int(RATE*.48);ns=noise(n)
manifest.append(save('page',[.35*ns[i]*math.sin(math.pi*i/n)**2*(.7+.3*math.sin(TAU*7*i/RATE)) for i in range(n)]))
manifest.append(save('brass',[.16*bell(i/RATE,660,5)*(1-math.exp(-160*i/RATE)) for i in range(int(RATE*1.3))]))
manifest.append(save('transition',[.13*sum(math.sin(TAU*f*i/RATE) for f in [261.63,329.63,392])/3*math.sin(math.pi*i/(RATE*1.5))**2 for i in range(int(RATE*1.5))]))

# Loops are constructed from exactly periodic sinusoids and wrapped foley events,
# so the last-to-first boundary has no non-periodic noise jump.
duration=8;n=RATE*duration
rain=[0.0]*n;river=[0.0]*n;chimes=[0.0]*n
for k in range(35,360):
    phase=random.random()*TAU;f=k/duration;amplitude=.0035/(1+(f/65)**2)
    for i in range(n):
        t=i/RATE;rain[i]+=amplitude*math.sin(TAU*f*t+phase)
for k in range(12,160):
    phase=random.random()*TAU;f=k/duration;amplitude=.004/(1+(f/24)**2)
    for i in range(n):river[i]+=amplitude*math.sin(TAU*f*i/RATE+phase)
for event in range(45):
    start=random.randrange(n);f=random.uniform(500,1100);amp=random.uniform(.015,.035)
    for j in range(int(RATE*.16)):
        t=j/RATE;rain[(start+j)%n]+=amp*math.sin(TAU*f*t)*math.exp(-50*t)*(1-math.exp(-300*t))
for event in range(28):
    start=random.randrange(n);f=random.uniform(160,370);amp=random.uniform(.015,.035)
    for j in range(int(RATE*.35)):
        t=j/RATE;river[(start+j)%n]+=amp*math.sin(TAU*(f*t+50*t*t))*math.exp(-15*t)*math.sin(math.pi*j/(RATE*.35))**2
for start,f in [(0.7,784),(2.8,1046.5),(4.3,880),(6.6,1174.7)]:
    for j in range(int(RATE*2.5)):
        t=j/RATE;chimes[(int(start*RATE)+j)%n]+=.09*bell(t,f,3.5)*(1-math.exp(-120*t))
manifest.extend([save('harbor-rain',rain,True),save('valley-water',river,True),save('forest-chimes',chimes,True)])
(OUT/'audio-manifest.json').write_text(json.dumps({'license':'Original procedural synthesis by the Pharma Odyssey project. No sampled third-party audio.','format':'PCM signed 16-bit mono WAV','playback':'Keep ambient volume around 0.30–0.55 and transient foley around 0.35–0.65. All files are intentionally quiet; respect mute and reduced motion preferences.','assets':manifest},indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
