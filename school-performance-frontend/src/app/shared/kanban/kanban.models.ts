export interface KanbanTask {
  id: string;
  title: string;
  progress: number;
  status: string;
  /** Opens this route when the card is activated. */
  link?: string;
  /** Highlights the card when the parent page uses it as the current choice. */
  selected?: boolean;
}

export interface KanbanStage {
  id: string;
  title: string;
  tasks: KanbanTask[];
}
