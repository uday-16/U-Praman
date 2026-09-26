import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDocument, sourceReferences} from '../js/report-summary.js';
import {renderResultsMarkup} from '../js/analysis-results.js';

globalThis.localStorage = {getItem:()=>null};
const result = {
  id:'anl-test',
  extracted:{id:'req-test',product_name:'Steel <plates>',quantity:'180 metric tonnes',key_requirements:['Original requirement'],technical_parameters:{},source_text:'Original input',extracted_at:'2026-09-26'},
  brief:{
    facts:{Quantity:'180 metric tonnes'},
    actions:['Confirm grade.'],
    notice:'Review before approval.',
    primary_standards:[{id:'is-test',is_number:'IS 2062',title:'Structural steel',score:85,relevance:'high',match:'High relevance | 85/100',summary:'Primary standard'}],
    allied_standards:[{id:'is-9595',is_number:'IS 9595',title:'Welding Recommendations',relationship:'Fabrication & Welding',description:'Welding guidelines'}],
    version_status:[{is_number:'IS 2062',edition:'2011',amendments:['Amendment 1'],previous_versions:['IS 2062:2006'],status:'Active'}],
    certification_compliance:{qco_status:'Steel QCO Applies',tender_mandates:['MTC required'],mtc_required:'MTC required',testing_mandate:'NABL lab',marking_rule:'ISI Mark'},
    evidence_traceability:[{requirement:'Structural steel requirement',is_number:'IS 2062',source:'steel.pdf',page:6,excerpt:'Matching clause',status:'Supported'}],
    procurement_readiness:{score:85,level:'HIGH READINESS',summary:'Specifications defined.',items:[{category:'Product',label:'Scope',status:'pass',details:'Defined'}]},
    recommended_actions:['Incorporate IS 2062 baseline in tender NIT.','Confirm grade.']
  },
  recommendations:[{id:'is-test',is_number:'IS 2062',title:'Structural steel',evidence:[
    {source:'steel.pdf',page:6,text:'LONG-EVIDENCE-MARKER'},
    {source:'steel.pdf',page:6,text:'Repeated page'},
    {source:'steel.pdf',page:2,text:'Another page'}]}],
  related_standards:[],traceability:[],gaps:[],review_flags:[]
};

test('source references are deduplicated and sorted',()=>{
  assert.equal(sourceReferences(result.recommendations[0]),'steel.pdf · p. 2, 6');
});

test('report contains all 7 procurement analysis and report sections without Section 8',()=>{
  const html=reportDocument({id:'rpt-test',analysis:result,created_at:'2026-09-26',officer_name:'Officer'});
  assert.equal((html.match(/<section/g)||[]).length, 7);
  for (const expected of [
    'PRIMARY STANDARD',
    'ALLIED / RELATED STANDARDS',
    'VERSION & AMENDMENT STATUS',
    'CERTIFICATION / COMPLIANCE',
    'EVIDENCE & TRACEABILITY',
    'PROCUREMENT READINESS',
    'RECOMMENDED ACTIONS',
    '180 metric tonnes',
    'Confirm grade.',
    'steel.pdf',
    'Steel &lt;plates&gt;'
  ]) {
    assert.ok(html.includes(expected), `Expected html to include "${expected}"`);
  }
  assert.ok(!html.includes('DOWNLOADABLE PROCUREMENT REPORT'));
});

test('detailed analysis renders all 7 sections and supporting disclosure',()=>{
  const html=renderResultsMarkup(result);
  assert.ok(html.includes('PRIMARY STANDARD'));
  assert.ok(html.includes('ALLIED / RELATED STANDARDS'));
  assert.ok(html.includes('VERSION & AMENDMENT STATUS'));
  assert.ok(html.includes('CERTIFICATION / COMPLIANCE'));
  assert.ok(html.includes('EVIDENCE & TRACEABILITY'));
  assert.ok(html.includes('PROCUREMENT READINESS'));
  assert.ok(html.includes('RECOMMENDED ACTIONS'));
  assert.ok(!html.includes('DOWNLOADABLE PROCUREMENT REPORT'));
  assert.ok(html.includes('<details class="card supporting-details">'));
  assert.ok(html.includes('Original input'));
});

test('toggleSaveStandard saves and removes standards case-insensitively',async()=>{
  const { Storage } = await import('../js/utils/storage.js');
  const values = new Map();
  globalThis.localStorage = {
    getItem: k => values.get(k) || null,
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: k => values.delete(k)
  };

  assert.equal(Storage.isStandardSaved('IS-2925-1984'), false);
  const saved = Storage.toggleSaveStandard('IS-2925-1984');
  assert.equal(saved, true);
  assert.equal(Storage.isStandardSaved('is-2925-1984'), true);
  assert.equal(Storage.isStandardSaved('IS-2925-1984'), true);
  assert.deepEqual(Storage.getSavedStandards(), ['IS-2925-1984']);

  const removed = Storage.toggleSaveStandard('is-2925-1984');
  assert.equal(removed, false);
  assert.equal(Storage.isStandardSaved('IS-2925-1984'), false);
  assert.deepEqual(Storage.getSavedStandards(), []);
});



