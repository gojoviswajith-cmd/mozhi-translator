export enum OutputFormat {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  TEAM_CHAT = 'TEAM_CHAT'
}

export interface DraftResponse {
  email: string;
  whatsapp: string;
  teamChat: string;
}

export interface ResearchResponse {
  text: string;
  sources?: {
    title: string;
    uri: string;
  }[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppMode {
  DRAFT = 'DRAFT',
  LIVE = 'LIVE',
  RESEARCH = 'RESEARCH'
}