export interface Section {
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
  elements: Element[];
  attribute: Attribute;
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
  showingId: number;
  originalId: number;
  status: number;
  bookingStatus: string;
  description: string;
  isFree: boolean;
  price: number;
  originalPrice: number;
  quantity: number;
  quantitySold: number;
  quantityLocking: number;
  maxQtyPerOrder: number;
  minQtyPerOrder: number;
  startTime: string;
  endTime: string;
  position: number;
  color: string;
  seatSections: SeatSection[];
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeatSection {
  id: number;
  ticketTypeId: number;
  sectionId: number;
  capacity: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface Element {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  data: string;
  display: number;
}

export interface Attribute {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
}
