export interface VaultPilotSettings {
  projectsFolder: string;
  inboxFolder: string;
  ideasFolder: string;
  orphanThresholdDays: number;
}

export const DEFAULT_SETTINGS: VaultPilotSettings = {
  projectsFolder: "projects/",
  inboxFolder: "inbox/",
  ideasFolder: "ideas/",
  orphanThresholdDays: 30,
};
