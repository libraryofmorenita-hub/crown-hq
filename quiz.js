// ═══ QUIZ ════════════════════════════════════════════════
// Crown HQ — quiz.js

var QDB={
  platform:[
    {q:'What is your platform and why does it matter to California?',a:'My platform is clean energy and textile accountability policy. Fashion is the second most polluting industry on Earth — 10% of global carbon emissions. California has the regulatory power to change that through SB 707, Scope 3 reporting, and Fashion Miles disclosure legislation.',cat:'Platform'},
    {q:'What is SB 707 and what does it actually do?',a:'SB 707 is the Responsible Textile Producer Program — an Extended Producer Responsibility law shifting textile waste costs from taxpayers to brands. It creates market incentives to design for longevity, not disposal.',cat:'Platform'},
    {q:'What specific policy change would you advocate for first?',a:'Full funding of SB 707 combined with a Fashion Miles disclosure label on every garment sold in California. Transparency is the first step. When consumers see the true cost, the market shifts.',cat:'Platform'},
    {q:'How does clean energy connect to the fashion industry?',a:'Polyester — 65% of all clothing — comes from crude oil. Textile mills are energy-intensive. A transition to renewable energy creates green-collar jobs and positions California as the clean fashion capital of North America.',cat:'Platform'},
    {q:'What is SB 100 and why is it relevant to your platform?',a:'SB 100 mandates 100% clean energy for California by 2045. It is law. My platform is the bridge between that legislation and the textile supply chains that still run on fossil fuels. The law exists. The implementation gap is where I work.',cat:'Platform'},
  ],
  personal:[
    {q:'Tell us about yourself.',a:'I am Amelia Arabe — a Filipina-American student engineer in San Diego. I design net-zero technology, play cello, and founded Library of Morenita — a sustainable digital archive I describe as Alexandria rebuilt for the next century. Top Model at Miss Philippines USA. I am here for the microphone, not just the crown.',cat:'Personal'},
    {q:'Why did you enter Miss California USA?',a:'I have a technical platform and specific policy agenda, and this stage reaches decision-makers and press who can amplify it. I am an engineer — I use the right tool for the job. This stage is the right tool.',cat:'Personal'},
    {q:'What is Library of Morenita?',a:'A sustainable digital archive preserving the ideas that shape civilization. Cultural infrastructure for the next century. The Library of Alexandria burned. I am designing something that does not.',cat:'Personal'},
    {q:"What is your biggest strength?",a:"Precision. I am trained to understand systems and design solutions. When I say fashion is the second most polluting industry, I can give you the source, the number, and the policy solution. I do not speak in generalities when specifics exist.",cat:'Personal'},
    {q:'Who are you outside of what you think you are worth?',a:'I am a funny and sweet woman who loves animals, food, music, and the ocean. I get bored easily and want constant stimulation so I love active days with lots to see. I love to travel and take photos of the scenery, myself, and the beautiful people I surround myself with. I adore fashion and have fun looking cute every day.',cat:'Personal'},
  ],
  tough:[
    {q:"What is your biggest weakness?",a:'I move faster than the people around me — I see the solution before fully explaining the problem. I am actively working on building consensus rather than just building. Engineering teaches you to optimize. Leadership teaches you the best solution is one people actually adopt.',cat:'Tough'},
    {q:'Why should you win over the other candidates?',a:'Because I am not competing for the experience of competing. I have a specific platform, technical background, and an audience I am already building. This title gives my advocacy reach it does not have today. That is a concrete answer.',cat:'Tough'},
    {q:'Is pageantry not superficial — why not advocate through other channels?',a:'Every platform is a tool. This one reaches audiences, press, and decision-makers that a GitHub repository does not. I am an engineer — I use the right tool for the job. This stage is the right tool for amplifying clean energy policy to a broad California audience.',cat:'Tough'},
    {q:'What would you do if you did not win?',a:'Keep building. Library of Morenita does not pause. The advocacy does not stop. Competition is one platform — not the only one. But I plan to win.',cat:'Tough'},
  ],
  pageant:[
    {q:'What does being Miss California USA mean to you?',a:'A platform with reach, credibility, and a stage — and using all three to advance clean energy and textile accountability. It means a Filipina-American engineer can stand on this stage and be taken seriously.',cat:'Pageant'},
    {q:'How would you use the title if you won?',a:'Every appearance, interview, and platform moment to advance California clean energy and textile accountability. Partner with Cleantech San Diego and fashion sustainability organizations to amplify legislation already moving.',cat:'Pageant'},
    {q:'What would your legacy as Miss California USA be?',a:'That I made the conversation about sustainable fashion and clean energy more specific, more technical, and more actionable than before I held the title. That the crown was a microphone, and I used it.',cat:'Pageant'},
    {q:'Describe your competition look philosophy.',a:'Every look is an advocacy statement. My gown is deadstock silk — it has a supply chain story. My swimsuit is ECONYL ocean plastic — the brand story is the story. I do not wear fashion. I wear arguments.',cat:'Pageant'},
  ],
};


function bQuiz(){

function toggleQItem(head){
  var body=head.nextElementSibling;
  if(body)body.classList.toggle('open');
}


function saveListAnswer(encKey,val){
  var key=decodeURIComponent(encKey);
  S.answers[key]=val;lsSave('chq-an',S.answers);showToast('Answer saved');
}


function startQuiz(){

function showQ(){
  if(!S.quizQs.length)return;
  if(S.curQ>=S.quizQs.length)S.curQ=0;

function updateQProg(){
  var pg=g('q-prog');if(!pg)return;
  pg.innerHTML=S.quizQs.map(function(_,i){return '<div class="qp-d '+(i<S.curQ?'done':i===S.curQ?'cur':'')+'"></div>';}).join('');
}

function startTimer(){
  clearInterval(S.qTimer);S.qSecs=60;updateTimer();
  S.qTimer=setInterval(function(){S.qSecs--;updateTimer();if(S.qSecs<=0){clearInterval(S.qTimer);revealAnswer();}},1000);
}

function updateTimer(){
  var el=g('q-timer');if(!el)return;

function revealAnswer(){clearInterval(S.qTimer);var r=g('q-rev');if(r)r.style.display='block';}

function nextQ(){clearInterval(S.qTimer);S.curQ++;if(S.curQ>=S.quizQs.length){S.quiz.sessions++;S.quiz.total+=S.quizQs.length;lsSave('chq-qz',S.quiz);S.curQ=0;}showQ();}

function editAnswer(){

function saveAnswer(){
  var key=S.quizQs[S.curQ]?S.quizQs[S.curQ].q:null;
  if(!key)return;

function cancelEdit(){g('q-edit-area').style.display='none';g('q-edit-acts').style.display='none';}

// ═══ BRAND ═══════════════════════════════════════════════════
