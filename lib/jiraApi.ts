import axios from 'axios';

const JIRA_HOST = 'deskcorp.atlassian.net';
const JIRA_API_URL = `https://${JIRA_HOST}/rest/api/3`;

const EMAIL = 'carol.siqueira@deskcorp.com.br';
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
export const PROJECTS = [
  { key: 'DD', name: 'Desenvolvimento & Delivery' },
  { key: 'DB', name: 'Diário de Bordo' },
  { key: 'DEV', name: 'Esteira de Desenvolvimento' },
  { key: 'FUNCIONAL', name: 'Funcional' },
  { key: 'GP', name: 'Gestão Projetos' },
  { key: 'INF', name: 'Infraestrutura' },
  { key: 'INT', name: 'Integrações' },
  { key: 'MUD', name: 'Mudança' },
  { key: 'MDB', name: 'MVP1 - Daily Banking' },
  { key: 'PDR', name: 'Projeto de Risco' },
  { key: 'QTV1', name: 'QA Tests v1' },
  { key: 'TDN', name: 'Treinamento' },
];

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    priority?: { name: string };
    created: string;
    updated: string;
    duedate?: string;
    project: { key: string };
    issuetype: { name: string };
  };
}

const jiraClient = axios.create({
  baseURL: JIRA_API_URL,
  auth: {
     username: EMAIL,
    password: JIRA_TOKEN,
  },
  timeout: 10000,
});

export async function fetchAllProjectsIssues(): Promise<JiraIssue[]> {
  try {
    const projectKeys = PROJECTS.map(p => `"${p.key}"`).join(',');
    const response = await jiraClient.get('/search', {
      params: {
        jql: `project in (${projectKeys}) ORDER BY updated DESC`,
        maxResults: 500,
      },
    });
    return response.data.issues || [];
  } catch (error) {
    console.error('Erro:', error);
    return [];
  }
}

export function calculateStats(issues: JiraIssue[]) {
  let open = 0, inProgress = 0, done = 0, critical = 0, overdue = 0, aging = 0;
  const today = new Date();
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  issues.forEach(issue => {
    const status = issue.fields.status?.name?.toLowerCase() || '';
    const priority = issue.fields.priority?.name?.toLowerCase() || '';
    const created = new Date(issue.fields.created);
    const dueDate = issue.fields.duedate ? new Date(issue.fields.duedate) : null;

    if (status.includes('backlog') || status.includes('open') || status.includes('todo')) {
      open++;
    } else if (status.includes('progress')) {
      inProgress++;
    } else if (status.includes('done') || status.includes('closed')) {
      done++;
    }

    if (priority?.includes('critical') || priority?.includes('blocker')) {
      critical++;
    }

    if (dueDate && dueDate < today) {
      overdue++;
    }

    if (created < twoWeeksAgo) {
      aging++;
    }
  });

  return { open, inProgress, done, critical, overdue, aging, total: issues.length };
}
