export type BusinessType =
  | "restaurant"
  | "cafe"
  | "salon"
  | "clinic"
  | "retail"
  | "other";

export type CardStatus = "active" | "disabled";

export type EventType = "QR" | "NFC" | "GOOGLE_CLICK" | "UNKNOWN";

export type Role = "admin" | "owner";

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  summary: string | null;
  logo_url: string | null;
  google_review_url: string;
  owner_user_id: string | null;
  created_at: string;
}

export interface Card {
  id: string;
  public_token: string;
  business_id: string;
  status: CardStatus;
  created_at: string;
}

export interface ReviewEvent {
  id: string;
  card_id: string | null;
  business_id: string | null;
  type: EventType;
  created_at: string;
  user_agent: string | null;
  referrer: string | null;
}

export interface Feedback {
  id: string;
  card_id: string | null;
  business_id: string;
  stars: number;
  tags: string[];
  note: string | null;
  draft_comment: string | null;
  created_at: string;
}

export interface Profile {
  user_id: string;
  role: Role;
  created_at: string;
}
