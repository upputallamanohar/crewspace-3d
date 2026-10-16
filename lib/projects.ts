export type Project = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  category: 'Crew' | 'Flow' | 'Flow + Crews';
  pattern: string;
  color: string;
  icon: string;
  output: string;
  fields: {
    name: string;
    label: string;
    placeholder: string;
    type?: 'text' | 'textarea' | 'select';
    options?: string[];
  }[];
  sample: Record<string, string>;
  steps: string[];
};

export const projects: Project[] = [
  {
    id: 'blog', number: '01', title: 'Blog Post Crew', shortTitle: 'Blog studio',
    description: 'Turn a topic and your source notes into an editable article draft.',
    category: 'Crew', pattern: 'Sequential', color: '#ee865d', icon: 'PenLine', output: 'blog_post.md',
    fields: [
      { name: 'topic', label: 'What are we writing about?', placeholder: 'e.g. A practical guide to a four-day workweek' },
      { name: 'audience', label: 'Audience', placeholder: 'e.g. Founders of small creative teams' },
      { name: 'notes', label: 'Your facts & source notes', type: 'textarea', placeholder: 'Paste the points and sources the article should use. Facts are drawn only from this text.' },
      { name: 'tone', label: 'Tone', type: 'select', placeholder: 'Choose a tone', options: ['Clear & practical', 'Warm & conversational', 'Professional & concise'] },
    ],
    sample: { topic: 'Make room for focused work', audience: 'Leaders of small creative teams', tone: 'Clear & practical', notes: 'Start with a two-week calendar audit to understand where time goes.\nProtect two 90-minute focus blocks per week before adding more meetings.\nShare an agenda and a decision owner before each meeting.\nReview the experiment with the team after one month.\nSource: our internal team working agreement.' },
    steps: ['Read your brief', 'Organize source notes', 'Assemble article draft', 'Flag editorial checks'],
  },
  {
    id: 'competitors', number: '02', title: 'Competitor Analysis Crew', shortTitle: 'Competitor radar',
    description: 'Compare the pricing, strengths, and gaps in competitor information you provide.',
    category: 'Crew', pattern: 'Hierarchical', color: '#a995dd', icon: 'Radar', output: 'competitor_report.md',
    fields: [
      { name: 'company', label: 'Your company or product', placeholder: 'e.g. Bloom — a simple project planner' },
      { name: 'competitors', label: 'Competitor information', type: 'textarea', placeholder: 'One per line: Name | Price | Strength | Gap\nYou can include a source URL in any entry. No websites are fetched.' },
      { name: 'notes', label: 'What should the comparison focus on?', type: 'textarea', placeholder: 'e.g. Affordable project tools for small design teams' },
    ],
    sample: { company: 'Bloom — a project planner for small studios', competitors: 'TaskNest | $12/user/month | Flexible dashboards | Complex setup\nOutline | $8/user/month | Simple shared lists | Limited reporting\nStudioBoard | $19/user/month | Client approval tools | Higher price', notes: 'Compare ease of getting started, cost, and client collaboration. These are sample competitor facts for a planning exercise.' },
    steps: ['Read comparison brief', 'Structure competitor facts', 'Compare strengths & gaps', 'Build strategy worksheet'],
  },
  {
    id: 'meeting', number: '03', title: 'Meeting Notes Crew', shortTitle: 'Meeting notes',
    description: 'Find the key discussion points, explicit decisions, and action items in a transcript.',
    category: 'Crew', pattern: 'Parallel tasks', color: '#70aba1', icon: 'MessagesSquare', output: 'meeting_notes.md',
    fields: [
      { name: 'title', label: 'Meeting title', placeholder: 'e.g. Website launch check-in' },
      { name: 'transcript', label: 'Paste your transcript', type: 'textarea', placeholder: 'Include speaker names and due dates where possible.\nMaya: I will send the final copy by Friday.' },
    ],
    sample: { title: 'Spring launch check-in', transcript: 'Maya: The new landing page is ready for a final review.\nLeo: We decided to launch the website on 22 October.\nMaya: I will send the final copy by Friday.\nSam: I will check the signup form by 20 October.\nLeo: We agreed to keep the current pricing for launch.\nSam: The mobile layout still needs testing.\nMaya: I will schedule the follow-up meeting by Monday.' },
    steps: ['Read transcript', 'Extract discussion points', 'Find actions & decisions', 'Format meeting notes'],
  },
  {
    id: 'data', number: '04', title: 'Data Report Crew', shortTitle: 'Data storyteller',
    description: 'Calculate checked totals, averages, ranges, and missing values from pasted CSV.',
    category: 'Crew', pattern: 'Structured output', color: '#7c9dce', icon: 'ChartNoAxesCombined', output: 'data_report.md',
    fields: [
      { name: 'title', label: 'Report title', placeholder: 'e.g. September sales snapshot' },
      { name: 'csv', label: 'Paste CSV data', type: 'textarea', placeholder: 'month,product,units,revenue\nSeptember,Starter,24,1200\nSeptember,Pro,12,1800\n\nUse a header row and plain numbers for numeric columns.' },
    ],
    sample: { title: 'Studio shop · weekly sales', csv: 'week,product,units,revenue\nWeek 1,Desk pad,24,720\nWeek 1,Notebook,42,630\nWeek 2,Desk pad,31,930\nWeek 2,Notebook,38,570\nWeek 3,Desk pad,28,840\nWeek 3,Notebook,45,675' },
    steps: ['Parse CSV', 'Validate rows', 'Calculate exact statistics', 'Write checked findings'],
  },
  {
    id: 'support', number: '05', title: 'Customer Support Flow', shortTitle: 'Support desk',
    description: 'Suggest a ticket category, priority, and a helpful response ready for review.',
    category: 'Flow', pattern: 'Router', color: '#dca466', icon: 'Headphones', output: 'support_response.md',
    fields: [
      { name: 'customer', label: 'Customer name', placeholder: 'e.g. Alex' },
      { name: 'ticket', label: 'Support ticket', type: 'textarea', placeholder: 'Paste the customer message with relevant details.' },
    ],
    sample: { customer: 'Alex', ticket: 'Hi, I was charged twice for my monthly subscription yesterday. The invoice reference is INV-1042. Could you help check the duplicate payment and explain the refund process?' },
    steps: ['Read ticket', 'Match routing rules', 'Set suggested priority', 'Draft a response'],
  },
  {
    id: 'resume', number: '06', title: 'Resume Screening Flow', shortTitle: 'Skills review',
    description: 'Compare explicitly requested skills with resume text for a human recruiter to review.',
    category: 'Flow', pattern: 'Router', color: '#b993b2', icon: 'FileUser', output: 'skills_review.md',
    fields: [
      { name: 'role', label: 'Role', placeholder: 'e.g. Frontend developer' },
      { name: 'requirements', label: 'Required job skills', type: 'textarea', placeholder: 'One skill per line, or comma-separated.\nReact\nTypeScript\nCSS\nAccessibility' },
      { name: 'resume', label: 'Resume text', type: 'textarea', placeholder: 'Paste experience and skills. This tool checks text evidence only; a person makes every hiring decision.' },
    ],
    sample: { role: 'Frontend developer', requirements: 'React\nTypeScript\nCSS\nAccessibility\nUnit testing', resume: 'Frontend developer with three years of web experience. Built React and TypeScript interfaces for an online learning platform. Maintained a CSS component library and improved keyboard accessibility. Collaborated with designers and backend engineers on product releases.' },
    steps: ['Read required skills', 'Find textual evidence', 'List matches & open questions', 'Prepare human review'],
  },
  {
    id: 'bugs', number: '07', title: 'Bug Triage Flow', shortTitle: 'Bug triage',
    description: 'Route issues into bug, feature, or question drafts with a clear next step.',
    category: 'Flow + Crews', pattern: 'Router', color: '#c0916f', icon: 'Bug', output: 'issue_triage.md',
    fields: [
      { name: 'title', label: 'Issue title', placeholder: 'e.g. Checkout button stops responding on mobile' },
      { name: 'issue', label: 'Issue details', type: 'textarea', placeholder: 'Include what happened, what you expected, reproduction steps, and any environment details.' },
    ],
    sample: { title: 'Export button fails on Safari', issue: 'Bug: clicking Export shows an error and no file downloads.\n1. Open the reports screen in Safari 18.\n2. Select the weekly report.\n3. Click Export.\nExpected: a CSV file downloads.\nActual: the page shows “Export failed”.\nA workaround is to use Chrome. No data is lost.' },
    steps: ['Read issue', 'Classify the request', 'Prepare route-specific notes', 'Draft a tracker reply'],
  },
  {
    id: 'repurpose', number: '08', title: 'Content Repurposing Flow', shortTitle: 'Content remix',
    description: 'Build a LinkedIn draft, a six-part thread, and a newsletter from one article.',
    category: 'Flow + Crews', pattern: 'Parallel · and_', color: '#81a887', icon: 'Repeat2', output: 'content_pack.md',
    fields: [
      { name: 'title', label: 'Article title', placeholder: 'e.g. Small habits for better team meetings' },
      { name: 'article', label: 'Paste the full article', type: 'textarea', placeholder: 'Paste article text here. The three drafts use only the text you provide.' },
    ],
    sample: { title: 'Meetings with a little more purpose', article: 'Better meetings start before anyone joins the call. Write one clear outcome at the top of every invitation. Invite the people who can contribute to that outcome. Share background reading ahead of time so the meeting can focus on decisions. Leave the final five minutes to name each action owner and due date. Send a short decision log after the meeting. Try these habits for two weeks and ask the team what changed.' },
    steps: ['Read article', 'Extract source points', 'Compose three channel drafts', 'Combine content pack'],
  },
  {
    id: 'leads', number: '09', title: 'Lead Qualification Flow', shortTitle: 'Lead compass',
    description: 'Check supplied lead notes against your explicit criteria and suggest a follow-up.',
    category: 'Flow + Crews', pattern: 'Router', color: '#8b9dce', icon: 'Target', output: 'lead_review.md',
    fields: [
      { name: 'name', label: 'Contact name', placeholder: 'e.g. Jordan Lee' },
      { name: 'company', label: 'Company', placeholder: 'e.g. Northstar Studio' },
      { name: 'details', label: 'Lead notes', type: 'textarea', placeholder: 'Paste facts you know about the business, need, budget, and intent. No website is fetched.' },
      { name: 'criteria', label: 'Qualification criteria', type: 'textarea', placeholder: 'One phrase per line to look for in the notes.\nB2B SaaS\nBudget approved\nDemo requested' },
    ],
    sample: { name: 'Jordan Lee', company: 'Northstar Studio', details: 'Northstar is a design agency with 25 employees. Their team needs project planning. Budget approved for next quarter. Demo requested for the collaboration workflow.', criteria: 'Design agency\nProject planning\nBudget approved\nDemo requested' },
    steps: ['Read supplied lead facts', 'Check stated criteria', 'Apply hot / warm / cold rules', 'Draft recommended follow-up'],
  },
  {
    id: 'approval', number: '10', title: 'Approval Report Flow', shortTitle: 'Review & approve',
    description: 'Prepare a report draft and a review checklist, keeping a person in control of approval.',
    category: 'Flow + Crews', pattern: 'Human feedback', color: '#6faea5', icon: 'ClipboardCheck', output: 'report_draft.md',
    fields: [
      { name: 'topic', label: 'Report topic', placeholder: 'e.g. Our next-quarter customer experience priorities' },
      { name: 'audience', label: 'Who is reviewing?', placeholder: 'e.g. Product and customer success leads' },
      { name: 'notes', label: 'Facts & supporting material', type: 'textarea', placeholder: 'Paste the findings, numbers, and source notes to include in the report.' },
      { name: 'feedback', label: 'Review instructions', type: 'textarea', placeholder: 'e.g. First draft: focus on next steps and flag any missing evidence.' },
    ],
    sample: { topic: 'A smoother customer onboarding experience', audience: 'Product and customer success leads', notes: 'The team reviewed 18 onboarding conversations in September.\nCustomers asked for a shorter setup guide in 11 conversations.\nA checklist prototype is ready for an internal review.\nA proposed next step is to pilot the checklist with five consenting customers.\nSource: internal September onboarding notes.', feedback: 'First draft. Keep the findings separate from proposed next steps. Flag the sample size for the reviewer.' },
    steps: ['Read topic & evidence', 'Assemble report draft', 'Attach reviewer instructions', 'Wait for human approval'],
  },
];

export function getProject(id: string): Project | undefined {
  return projects.find((project) => project.id === id);
}
