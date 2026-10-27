export const scenes={harbor:['雨夜码头','RAIN HARBOR','末班渡船'],hall:['起源学院','ORIGIN ACADEMY','登记簿里的空白'],pd:['药效机制塔','MECHANISM TOWER','曲线不会说谎，标签会'],pk:['药动河谷','KINETIC VALLEY','河谷的时间表'],factors:['个体差异森林','VARIATION FOREST','谁是标准患者？'],boss:['总论守护者','THE FINAL GUARDIAN','无页码档案'],ending:['塔顶航灯','THE FIRST SEA CHART','灯塔上的第一张航线']};
export const chapters=[['起源岛','来源之光'],['神经城','失去标记的信使'],['脉流群岛','被统一的心跳'],['潮息港','相似的病历'],['时序庭院','被抹去的时间'],['微生物边境','未署名的记录'],['细胞穹顶','最后的注释'],['终焉灯塔','重建航图']];
export const lessonIds=['direction','curve','receptor','safety','adme','half','adapt','interaction'];
export const lessonProps={instrument:'direction',curve:'curve',receptor:'receptor',safety:'safety',adme:'adme',half:'half',adapt:'adapt',interaction:'interaction'};
const passed=(s,ids)=>ids.every(id=>s.learning?.[id]?.complete);
const flags=(s,ids)=>ids.every(id=>s.storyFlags?.[id]);
export function canEnter(s,id){return ({harbor:true,hall:flags(s,['metLumi','notice']),pd:passed(s,['direction']),pk:passed(s,['curve','receptor','safety'])&&flags(s,['label','conditions']),factors:passed(s,['adme','half'])&&flags(s,['timetable']),boss:passed(s,lessonIds)&&flags(s,['caseReviewed']),ending:!!s.done?.boss,nerve:!!(s.storyFlags?.neuralCityUnlocked||s.done?.boss)})[id]??false;}
export function canStudy(s,id){if(id==='direction')return flags(s,['talk_lan','talk_bai','talk_lumi','register','table','cabinet']);if(['curve','receptor','safety'].includes(id))return flags(s,['label','conditions']);if(['adme','half'].includes(id))return flags(s,['timetable']);if(['adapt','interaction'].includes(id))return flags(s,['clue_body','clue_pathogen','caseReviewed']);return false;}
export const evidence={notice:['无来源警告','覆盖的标语下仍能看见：“所有结论都需要来源。”'],register:['纸质登记单','原始编号和电子记录不同；先保留纸质记录，不能直接补造缺失内容。'],table:['校对便条','木桌上的便条：“检查原始记录，写清适用条件。”'],cabinet:['旧档案索引','四份旧档案均缺了来源栏。Intro → PD → PK → Factors。'],label:['错误曲线标签','“右移就一定降低最大效应”与图形不符。需要区分效价与效能。'],conditions:['刮去的实验前提','这份记录遗漏了“可逆、可克服”的实验条件。先恢复前提，再讨论曲线。'],timetable:['删去时间条件的记录','运输时间表把药动过程画成严格串行。ADME 可以重叠发生；半衰期依赖选定模型。'],clue_body:['线索 A · 观察对象','第一份记录：同一机体在重复暴露后反应下降。记录没有涉及病原体敏感性。'],clue_pathogen:['线索 B · 被合并的页码','另一份记录：病原体对相关治疗药物敏感性下降。两份记录曾有不同页码。'],index:['无出处的索引记录','灰白徽记旁没有来源，也没有适用条件。页边写着：“找到删去注释的人。”']};
export function completeEvidence(s,id){s.storyFlags[id]=true;const item=evidence[id];if(item&&!s.inventory.some(x=>x.id===id))s.inventory.push({id,title:item[0],text:item[1],chapter:1});}
export function questFor(s,scene){let title=scenes[scene]?.[2]||'起源岛',text='',items=[];
if(scene==='harbor'){text='与 Lumi 相识，查看被覆盖的警告，再穿过学院拱门。';items=[['认识 Lumi',!!s.storyFlags.metLumi],['调查警告牌',!!s.storyFlags.notice]];}
if(scene==='hall'){text=passed(s,['direction'])?'双向铜环已点亮。前往药效机制塔。':'核对原始记录，与三位伙伴交谈，再修复双向航图仪。';items=[['与岚舟、白榆、Lumi 交谈',flags(s,['talk_lan','talk_bai','talk_lumi'])],['登记簿、木桌、档案柜',flags(s,['register','table','cabinet'])],['双向航图仪七步教学',passed(s,['direction'])]];}
if(scene==='pd'){text='检查曲线标签和实验前提，完成三台机制装置。';items=[['两份环境证据',flags(s,['label','conditions'])],['曲线 · 受体 · 安全之桥',passed(s,['curve','receptor','safety'])]];}
if(scene==='pk'){text='找回时间表的条件，再疏通河道与校准时间沙漏。';items=[['时间条件',!!s.storyFlags.timetable],['ADME · 半衰期',passed(s,['adme','half'])]];}
if(scene==='factors'){text='先收集两条不同观察对象的线索，再审校合并档案。';items=[['两条证据',flags(s,['clue_body','clue_pathogen'])],['审校档案',!!s.storyFlags.caseReviewed],['耐受与耐药 · 相互作用',passed(s,['adapt','interaction'])]];}
if(scene==='boss'){text='完成机制辨析、情境应用、双语或英文试炼；八题六题及以上通过，可随时复习重考。';items=[['八课完整学习',passed(s,lessonIds)],['总论守护者 6/8',!!s.done.boss]];}
if(scene==='ending'){text=s.storyFlags.endingSeen?'海域航图修复，下一座岛是神经城。':'调查无来源索引，听取三位伙伴的反馈，展开海域航图。';items=[['取得原始索引',!!s.storyFlags.index],['三位伙伴的反馈',flags(s,['ending_lan','ending_bai','ending_lumi'])],['展开航图',!!s.storyFlags.endingSeen]];}
return {title,text,items};}
export const dialogue={
harbor:{lumi:[['Lumi · 小灯','报到第一天！我已经替你找好了最快的路……哦，那扇侧门锁住了。'],['Lumi · 小灯','先看看警告牌吧。被覆盖的字，往往比新写的字更值得核对。']]},
hall:{lan:[['岚舟','系统能记录答案，却不会替你理解问题。先看原始记录，再去双向航图仪。'],['岚舟','药效与药动看的是同一件事的两个方向。你会亲手把接反的标记改回来。']],bai:[['白榆','名字？编号？……奇怪，电子登记簿的这一栏是空的。纸质登记单还在桌上。']],lumi:[['Lumi · 小灯','登记簿、木桌、档案柜都值得看看。我负责照亮，你来决定什么能作为证据。']]},
pd:{lan:[['岚舟','墨水很深，不代表结论可靠。看看曲线本身和被刮去的实验前提。']],lumi:[['Lumi · 小灯','我刚刚差点把右移和平台降低当成一回事。先观察，再回答。']]},
pk:{lan:[['岚舟','时间、浓度、过程和条件，不能只留下一个数。先核对河谷时间表。']],lumi:[['Lumi · 小灯','我原以为四条河必须一条接一条流。原来记忆顺序不是过程一定串行。']]},
factors:{bai:[['白榆','两份病历看上去很像，但观察对象不同。找到至少两条线索，才决定怎么分开它们。']],lumi:[['Lumi · 小灯','信息不够的时候，说“暂不能判定”也可以是正确的下一步。']]},
boss:{lan:[['岚舟','先检查标准格式是否删去了必要信息。失败后我们可以一起复习。']],bai:[['白榆','本次是档案校对试炼，不是战斗。你的错题会留在日志中，不会锁住航路。']],cataloguer:[['总论守护者','请审校机制、应用和英文术语。八题中至少六题通过，即可修复这一页。']]},
ending:{lan:[['岚舟','我们只找回了第一部分。别急着把它叫作真相。']],bai:[['白榆','原始航图第一页交给你。背面的留言是：“找到删去注释的人。”']],lumi:[['Lumi · 小灯','下一座岛很远。但我现在知道，先确认地图，再出发。']]}
};
