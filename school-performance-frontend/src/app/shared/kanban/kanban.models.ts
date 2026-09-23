export interface KanbanTask {
  id: string;
  title: string;
  progress: number;
  status: string;
  /** Opens this route when the card is activated. */
  link?: string;
}

export interface KanbanStage {
  id: string;
  title: string;
  tasks: KanbanTask[];
}
