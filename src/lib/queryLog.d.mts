export interface QueryLogLink {
  href: string;
  label: string;
}

export interface QueryThreadTurn {
  id: string;
  question: string;
  answer: string;
  links: QueryLogLink[];
  createdAt: string;
}

export interface QueryThread {
  id: string;
  title: string;
  turns: QueryThreadTurn[];
  latestQuestion: string;
  latestAnswer: string;
  createdAt: string;
  updatedAt: string;
}

export function createQueryThread(input?: {
  id?: string;
  title?: string;
  createdAt?: string;
}): QueryThread;

export function appendThreadTurn(
  thread: QueryThread,
  turn: {
    question: string;
    answer: string;
    links?: QueryLogLink[];
    createdAt?: string;
  },
): QueryThread;

export function upsertQueryThread(
  threads: QueryThread[],
  thread: QueryThread,
  maxThreads?: number,
): QueryThread[];

export function sanitizeQueryThreads(threads: unknown): QueryThread[];
