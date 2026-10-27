import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canEnter,canStudy,completeEvidence,questFor} from '../src/story/story.js';
test('story gates link evidence and all lessons, not legacy badges alone',()=>{
 const s={storyFlags:{},learning:{},done:{},inventory:[]};
 assert.equal(canEnter(s,'hall'),false);s.storyFlags.metLumi=true;s.storyFlags.notice=true;assert.equal(canEnter(s,'hall'),true);
 assert.equal(canStudy(s,'direction'),false);for(const k of ['talk_lan','talk_bai','talk_lumi','register','table','cabinet'])s.storyFlags[k]=true;
 assert.equal(canStudy(s,'direction'),true);s.done.intro=true;assert.equal(canEnter(s,'pd'),false);
 s.learning.direction={complete:true};assert.equal(canEnter(s,'pd'),true);
 assert.equal(canStudy(s,'interaction'),false);s.storyFlags.clue_body=true;s.storyFlags.clue_pathogen=true;s.storyFlags.caseReviewed=true;assert.equal(canStudy(s,'interaction'),true);
 assert.equal(canEnter(s,'ending'),false);s.done.boss=true;assert.equal(canEnter(s,'ending'),true);
});
test('evidence collection is idempotent and quest state comes from saved state',()=>{const s={storyFlags:{},inventory:[],learning:{},done:{}};completeEvidence(s,'notice');completeEvidence(s,'notice');assert.equal(s.inventory.length,1);assert.ok(questFor(s,'harbor').title);});
