export interface ChosenSection {
  id: number;
  seatMapId: number;
  name: string;
  isReservingSeat: boolean;
  isStage: boolean;
  capacity: number;
  ticketTypeId: number;
  status: number;
  rows: Row[];
  ticketType: TicketType;
}

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

export interface TicketType {
  id: number;
  name: string;
  description: string;
  color: string;
  isFree: boolean;
  price: number;
  originalPrice: number;
  maxQtyPerOrder: number;
  minQtyPerOrder: number;
  startTime: string;
  endTime: string;
  position: number;
  status: string;
  statusName: string;
  imageUrl: string;
}
