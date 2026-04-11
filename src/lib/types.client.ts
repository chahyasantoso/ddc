// Client-safe types (no DB imports)
// Used by all React components in the scrollytelling UI.

export interface Photo {
  id           : number;
  checkpoint_id: number;
  photo_url    : string;
  caption      : string;
  order        : number;
}

export interface Checkpoint {
  id            : number;
  location_name : string;
  lat           : number;
  lng           : number;
  description   : string | null;
  created_at    : string;
  photos        : Photo[];
}
