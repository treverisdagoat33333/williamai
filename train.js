const e=require('./engine');
console.log('WilliamCore training report');console.log(e.stats());
console.log('Leave-one-out intent accuracy:',e.evaluate());
console.log('Check data/unknown.json for questions William could not answer, then add them to knowledge.js.');
