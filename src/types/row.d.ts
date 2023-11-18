export interface Row {
  id: number;
  name: string;
  sectionId: number;
  status: number;
  seats: Seat[];
}

export interface Seat {
  id: number;
  name: string;
  rowId: number;
  status: number;
  position: number;
  x: number;
  y: number;
}
